import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member } from '../types';
import { Plus, Search, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils';

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member>>({ activo: true });

  useEffect(() => {
    setMembers(db.members.getAll());
  }, []);

  const filteredMembers = members.filter(m => 
    m.nombre.toLowerCase().includes(search.toLowerCase()) || 
    m.apellidos.toLowerCase().includes(search.toLowerCase()) ||
    m.dni.toLowerCase().includes(search.toLowerCase()) ||
    m.numero_socio.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember.id) {
      db.members.update(editingMember as Member);
    } else {
      const numSocio = `S${(members.length + 1).toString().padStart(3, '0')}`;
      db.members.add({
        ...editingMember,
        numero_socio: numSocio,
        fecha_alta: new Date().toISOString()
      } as Omit<Member, 'id'>);
    }
    setMembers(db.members.getAll());
    setIsModalOpen(false);
    setEditingMember({ activo: true });
  };

  const getActiveRentalsCount = (memberId: number) => {
    return db.rentals.getActiveByMember(memberId).length;
  };

  const getUnpaidFinesCount = (memberId: number) => {
    return db.fines.getPendingByMember(memberId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Socios</h1>
        <button 
          onClick={() => { setEditingMember({ activo: true }); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
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
                const fines = getUnpaidFinesCount(member.id);
                return (
                  <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono text-sm">{member.numero_socio}</td>
                    <td className="p-3 font-medium">{member.nombre} {member.apellidos}</td>
                    <td className="p-3">{member.dni}</td>
                    <td className="p-3">
                      {member.activo 
                        ? <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded-full flex w-fit items-center gap-1"><UserCheck size={12}/> Activo</span>
                        : <span className="text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded-full flex w-fit items-center gap-1"><UserX size={12}/> Inactivo</span>
                      }
                    </td>
                    <td className="p-3 text-center">{getActiveRentalsCount(member.id)}</td>
                    <td className="p-3 text-center">
                       {fines > 0 ? (
                         <span className="text-red-600 font-bold flex items-center justify-center gap-1"><AlertCircle size={14}/> {fines}</span>
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
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <h2 className="text-xl font-bold mb-4">{editingMember.id ? 'Editar Socio' : 'Nuevo Socio'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">Nombre</label>
                     <input required className="w-full border p-2 rounded" value={editingMember.nombre || ''} onChange={e => setEditingMember({...editingMember, nombre: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Apellidos</label>
                     <input required className="w-full border p-2 rounded" value={editingMember.apellidos || ''} onChange={e => setEditingMember({...editingMember, apellidos: e.target.value})} />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">DNI</label>
                     <input required className="w-full border p-2 rounded" value={editingMember.dni || ''} onChange={e => setEditingMember({...editingMember, dni: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Teléfono</label>
                     <input className="w-full border p-2 rounded" value={editingMember.telefono || ''} onChange={e => setEditingMember({...editingMember, telefono: e.target.value})} />
                   </div>
                </div>
                <div>
                     <label className="block text-sm font-medium mb-1">Email</label>
                     <input type="email" className="w-full border p-2 rounded" value={editingMember.email || ''} onChange={e => setEditingMember({...editingMember, email: e.target.value})} />
                </div>
                
                {editingMember.id && (
                  <div className="flex items-center gap-2 mt-2">
                     <input type="checkbox" id="active" checked={editingMember.activo} onChange={e => setEditingMember({...editingMember, activo: e.target.checked})} />
                     <label htmlFor="active" className="text-sm">Socio Activo</label>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
