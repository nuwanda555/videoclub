import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member } from '../types';
import { Plus, Search, UserCheck, UserX, AlertCircle, Loader2 } from 'lucide-react';
import { formatDate } from '../utils';

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member>>({ activo: true });
  const [loading, setLoading] = useState(true);
  const [activeRentalsMap, setActiveRentalsMap] = useState<Record<number, number>>({});
  const [pendingFinesMap, setPendingFinesMap] = useState<Record<number, number>>({});

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const allMembers = await db.members.getAll();
      setMembers(allMembers);

      // Load extra info per member (simplified)
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

  const filteredMembers = members.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.apellidos.toLowerCase().includes(search.toLowerCase()) ||
    m.dni.toLowerCase().includes(search.toLowerCase()) ||
    m.numero_socio.toLowerCase().includes(search.toLowerCase())
  );

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

  if (loading && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={40} />
        <p>Cargando socios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Socios</h1>
        <button
          onClick={() => { setEditingMember({ activo: true }); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          <Plus size={18} /> Nuevo Socio
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o nº socio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3">Nº Socio</th>
                <th className="p-3">Nombre Completo</th>
                <th className="p-3">DNI</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Alq. Activos</th>
                <th className="p-3">Multas Pend.</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => {
                const fines = pendingFinesMap[member.id] || 0;
                const actives = activeRentalsMap[member.id] || 0;
                return (
                  <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono text-sm">{member.numero_socio}</td>
                    <td className="p-3 font-medium">{member.nombre} {member.apellidos}</td>
                    <td className="p-3">{member.dni}</td>
                    <td className="p-3">
                      {member.activo
                        ? <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded-full flex w-fit items-center gap-1"><UserCheck size={12} /> Activo</span>
                        : <span className="text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded-full flex w-fit items-center gap-1"><UserX size={12} /> Inactivo</span>
                      }
                    </td>
                    <td className="p-3 text-center">{actives}</td>
                    <td className="p-3 text-center">
                      {fines > 0 ? (
                        <span className="text-red-600 font-bold flex items-center justify-center gap-1"><AlertCircle size={14} /> {fines}</span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => { setEditingMember(member); setIsModalOpen(true); }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <div className="p-4 text-center"><Loader2 className="animate-spin inline text-blue-600" /></div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editingMember.id ? 'Editar Socio' : 'Nuevo Socio'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input required className="w-full border p-2 rounded" value={editingMember.nombre || ''} onChange={e => setEditingMember({ ...editingMember, nombre: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellidos</label>
                  <input required className="w-full border p-2 rounded" value={editingMember.apellidos || ''} onChange={e => setEditingMember({ ...editingMember, apellidos: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">DNI</label>
                  <input required className="w-full border p-2 rounded" value={editingMember.dni || ''} onChange={e => setEditingMember({ ...editingMember, dni: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <input className="w-full border p-2 rounded" value={editingMember.telefono || ''} onChange={e => setEditingMember({ ...editingMember, telefono: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border p-2 rounded" value={editingMember.email || ''} onChange={e => setEditingMember({ ...editingMember, email: e.target.value })} />
              </div>

              {editingMember.id && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="active" checked={editingMember.activo} onChange={e => setEditingMember({ ...editingMember, activo: e.target.checked })} />
                  <label htmlFor="active" className="text-sm">Socio Activo</label>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
