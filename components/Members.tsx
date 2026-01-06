import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Member } from '../types';
import {
  Plus, Search, UserCheck, UserX, AlertCircle, Loader2,
  ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Mail,
  Edit2, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatDate } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortKey = 'numero_socio' | 'nombre' | 'dni' | 'email' | 'activo' | 'rentals' | 'fines';
type SortOrder = 'asc' | 'desc' | null;

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member>>({ activo: true });
  const [loading, setLoading] = useState(true);
  const [activeRentalsMap, setActiveRentalsMap] = useState<Record<number, number>>({});
  const [pendingFinesMap, setPendingFinesMap] = useState<Record<number, number>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'numero_socio',
    order: 'asc'
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const allMembers = await db.members.getAll();
      setMembers(allMembers);

      const rentalsMap: Record<number, number> = {};
      const finesMap: Record<number, number> = {};

      await Promise.all(allMembers.map(async (m) => {
        const [rentals, fines] = await Promise.all([
          db.rentals.getActiveByMember(m.id),
          db.fines.getPendingByMember(m.id)
        ]);
        rentalsMap[m.id] = rentals.length;
        finesMap[m.id] = fines.length;
      }));

      setActiveRentalsMap(rentalsMap);
      setPendingFinesMap(finesMap);
    } catch (e) {
      console.error('Error loading members:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.order === 'asc') return { key, order: 'desc' };
        if (prev.order === 'desc') return { key, order: null };
      }
      return { key, order: 'asc' };
    });
  };

  const filteredAndSorted = useMemo(() => {
    let result = members.filter(m =>
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.apellidos.toLowerCase().includes(search.toLowerCase()) ||
      m.dni.toLowerCase().includes(search.toLowerCase()) ||
      m.numero_socio.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (sortConfig.key && sortConfig.order) {
      result.sort((a, b) => {
        let valA: any;
        let valB: any;

        switch (sortConfig.key) {
          case 'nombre':
            valA = `${a.nombre} ${a.apellidos}`.toLowerCase();
            valB = `${b.nombre} ${b.apellidos}`.toLowerCase();
            break;
          case 'rentals':
            valA = activeRentalsMap[a.id] || 0;
            valB = activeRentalsMap[b.id] || 0;
            break;
          case 'fines':
            valA = pendingFinesMap[a.id] || 0;
            valB = pendingFinesMap[b.id] || 0;
            break;
          default:
            valA = (a as any)[sortConfig.key] || '';
            valB = (b as any)[sortConfig.key] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [members, search, sortConfig, activeRentalsMap, pendingFinesMap]);

  // Paginated Data
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on search or sort
  }, [search, sortConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingMember.id) {
        await db.members.update(editingMember as Member);
      } else {
        const numSocio = `S${(members.length + 1).toString().padStart(3, '0')}`;
        await db.members.add({
          ...editingMember,
          numero_socio: numSocio,
          fecha_alta: new Date().toISOString()
        } as Omit<Member, 'id'>);
      }
      await refreshData();
      setIsModalOpen(false);
      setEditingMember({ activo: true });
    } catch (e) {
      console.error('Error saving member:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al socio ${name}? Esta acción no se puede deshacer.`)) return;

    setLoading(true);
    try {
      const actives = activeRentalsMap[id] || 0;
      if (actives > 0) {
        alert('No se puede eliminar un socio con alquileres activos.');
        return;
      }
      await db.members.delete(id);
      await refreshData();
    } catch (e) {
      console.error('Error deleting member:', e);
      alert('Error al intentar eliminar el socio. Es posible que tenga historial vinculado.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Listado de Socios - VideoClub Manager', 14, 15);

    const tableData = filteredAndSorted.map(m => [
      m.numero_socio,
      `${m.nombre} ${m.apellidos}`,
      m.email || '-',
      m.dni,
      m.activo ? 'Activo' : 'Inactivo',
      activeRentalsMap[m.id] || 0,
      pendingFinesMap[m.id] || 0
    ]);

    autoTable(doc, {
      head: [['ID', 'Nombre', 'Email', 'DNI', 'Estado', 'Alq.', 'Multas']],
      body: tableData,
      startY: 20,
    });

    doc.save(`socios_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ChevronsUpDown size={14} className="text-slate-400" />;
    if (sortConfig.order === 'asc') return <ChevronUp size={14} className="text-blue-600" />;
    if (sortConfig.order === 'desc') return <ChevronDown size={14} className="text-blue-600" />;
    return <ChevronsUpDown size={14} className="text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Socios</h1>
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            className="bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-slate-700 transition"
          >
            <FileText size={18} /> Exportar PDF
          </button>
          <button
            onClick={() => { setEditingMember({ activo: true }); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition shadow-md shadow-blue-200"
            disabled={loading}
          >
            <Plus size={18} /> Nuevo Socio
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, email o nº socio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('numero_socio')}>
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500 font-black tracking-wider">Nº <SortIcon column="numero_socio" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('nombre')}>
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500 font-black tracking-wider">Nombre <SortIcon column="nombre" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition hidden lg:table-cell" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500 font-black tracking-wider">Email <SortIcon column="email" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition hidden md:table-cell" onClick={() => handleSort('dni')}>
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500 font-black tracking-wider">DNI <SortIcon column="dni" /></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('activo')}>
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500 font-black tracking-wider">Estado <SortIcon column="activo" /></div>
                </th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMembers.map(member => {
                const fines = pendingFinesMap[member.id] || 0;
                const actives = activeRentalsMap[member.id] || 0;
                return (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 font-mono text-xs text-slate-500">{member.numero_socio}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{member.nombre} {member.apellidos}</span>
                        <span className="text-[10px] text-slate-400 font-mono md:hidden">{member.dni}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={12} className="shrink-0 text-slate-400" />
                        <span className="text-sm truncate max-w-[180px]">{member.email || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-slate-600 font-mono text-xs">{member.dni}</td>
                    <td className="p-4">
                      {member.activo
                        ? <span className="text-green-700 text-[9px] font-black uppercase bg-green-100 px-2 py-1 rounded-md flex w-fit items-center gap-1">ACTIVO</span>
                        : <span className="text-slate-500 text-[9px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md flex w-fit items-center gap-1">INACTIVO</span>
                      }
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditingMember(member); setIsModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id, `${member.nombre} ${member.apellidos}`)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && <div className="p-12 text-center"><Loader2 className="animate-spin inline text-blue-600" size={32} /></div>}

          {!loading && filteredAndSorted.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic">
              No se han encontrado resultados para tu búsqueda.
            </div>
          )}
        </div>

        {/* Improved Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 px-4">
            <div className="text-xs text-slate-500">
              Mostrando <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredAndSorted.length)}</span> de <span className="font-bold">{filteredAndSorted.length}</span> socios
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition ${currentPage === p ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal remains same but with improved styles */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className="text-xl font-black tracking-tight">{editingMember.id ? 'Editar Socio' : 'Nuevo Registro'}</h2>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Módulo de Gestión de Membresía</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nombre</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition" value={editingMember.nombre || ''} onChange={e => setEditingMember({ ...editingMember, nombre: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Apellidos</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition" value={editingMember.apellidos || ''} onChange={e => setEditingMember({ ...editingMember, apellidos: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">DNI</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition uppercase" value={editingMember.dni || ''} onChange={e => setEditingMember({ ...editingMember, dni: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Teléfono</label>
                  <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition" value={editingMember.telefono || ''} onChange={e => setEditingMember({ ...editingMember, telefono: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email de Contacto</label>
                <input type="email" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition" value={editingMember.email || ''} onChange={e => setEditingMember({ ...editingMember, email: e.target.value })} />
              </div>

              {editingMember.id && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <input type="checkbox" id="active" className="w-5 h-5 accent-blue-600 rounded-md" checked={editingMember.activo} onChange={e => setEditingMember({ ...editingMember, activo: e.target.checked })} />
                  <div className="flex flex-col">
                    <label htmlFor="active" className="text-sm font-black text-blue-900 cursor-pointer">Socio Activo</label>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">El socio puede realizar nuevos alquileres</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 rounded-xl transition">He terminado</button>
                <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-200 disabled:opacity-50">
                  {loading && <Loader2 className="animate-spin" size={14} />}
                  {editingMember.id ? 'Actualizar Ficha' : 'Dar de Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const X = ({ size, className }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);
