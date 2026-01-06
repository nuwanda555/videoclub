import React, { useState } from 'react';
import { db } from '../services/db';
import { Member, Copy, Movie, Category } from '../types';
import { Search, ScanLine, ShoppingCart, Trash2, User, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

export default function RentalFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = db.config.get();
  
  // State
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberError, setMemberError] = useState('');
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<{copy: Copy, movie: Movie, category: Category}[]>([]);
  const [barcodeError, setBarcodeError] = useState('');

  // 1. Find Member
  const searchMember = () => {
    const all = db.members.getAll();
    const found = all.find(m => m.numero_socio === memberSearch || m.dni === memberSearch);
    if (found) {
      if (!found.activo) {
        setMemberError('El socio está inactivo.');
        setSelectedMember(null);
        return;
      }
      // Check fines
      const fines = db.fines.getPendingByMember(found.id);
      if (fines.length > 0) {
        setMemberError(`El socio tiene ${fines.length} multas pendientes. Debe pagarlas antes.`);
        setSelectedMember(null);
        return;
      }
      // Check max rentals
      const activeRentals = db.rentals.getActiveByMember(found.id);
      if (activeRentals.length >= config.max_alquileres_socio) {
        setMemberError(`Límite de alquileres alcanzado (${activeRentals.length}/${config.max_alquileres_socio}).`);
        setSelectedMember(null);
        return;
      }
      setSelectedMember(found);
      setMemberError('');
    } else {
      setMemberError('Socio no encontrado.');
      setSelectedMember(null);
    }
  };

  // 2. Add to Cart
  const addToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setBarcodeError('');
    
    // Check if already in cart
    if (cart.find(i => i.copy.codigo_barras === barcodeInput)) {
      setBarcodeError('Esta copia ya está en la lista.');
      setBarcodeInput('');
      return;
    }

    const copy = db.copies.getByBarcode(barcodeInput);
    if (!copy) {
      setBarcodeError('Copia no encontrada.');
      return;
    }
    if (copy.estado !== 'disponible') {
      setBarcodeError(`La copia no está disponible (Estado: ${copy.estado}).`);
      return;
    }

    // Check limit taking into account current cart and active rentals
    const currentActive = selectedMember ? db.rentals.getActiveByMember(selectedMember.id).length : 0;
    if (currentActive + cart.length + 1 > config.max_alquileres_socio) {
      setBarcodeError('Se superaría el límite de alquileres del socio.');
      return;
    }

    const movie = db.movies.getAll().find(m => m.id === copy.pelicula_id)!;
    const category = db.categories.getAll().find(c => c.id === movie.categoria_id)!;

    setCart([...cart, { copy, movie, category }]);
    setBarcodeInput('');
  };

  // 3. Confirm
  const handleConfirm = () => {
    if (!selectedMember || !user) return;
    
    cart.forEach(item => {
      const today = new Date();
      const returnDate = new Date();
      returnDate.setDate(today.getDate() + config.dias_alquiler_defecto);
      
      db.rentals.create({
        socio_id: selectedMember.id,
        copia_id: item.copy.id,
        fecha_alquiler: today.toISOString(),
        fecha_devolucion_prevista: returnDate.toISOString(),
        precio_dia: item.category.precio_dia,
        empleado_alquiler_id: user.id
      });
    });

    alert('Alquiler realizado correctamente.');
    navigate('/dashboard');
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.category.precio_dia * config.dias_alquiler_defecto), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel: Member Selection */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
           <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User /> 1. Seleccionar Socio</h2>
           <div className="flex gap-2 mb-4">
             <input 
                className="flex-1 border p-2 rounded"
                placeholder="Nº Socio o DNI"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchMember()}
             />
             <button onClick={searchMember} className="bg-blue-600 text-white p-2 rounded"><Search size={20}/></button>
           </div>
           
           {memberError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2"><AlertCircle size={16}/>{memberError}</div>}

           {selectedMember && (
             <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-100">
               <p className="font-bold text-lg">{selectedMember.nombre} {selectedMember.apellidos}</p>
               <p className="text-sm text-slate-600">Socio: {selectedMember.numero_socio}</p>
               <p className="text-sm text-slate-600">DNI: {selectedMember.dni}</p>
               <div className="mt-2 text-xs text-blue-800 font-medium">
                  Alquileres Activos: {db.rentals.getActiveByMember(selectedMember.id).length} / {config.max_alquileres_socio}
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="lg:col-span-2 space-y-4">
         <div className="bg-white p-6 rounded-lg shadow border border-slate-200 h-full flex flex-col">
           <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ShoppingCart /> 2. Añadir Películas</h2>
           
           <form onSubmit={addToCart} className="flex gap-2 mb-4">
             <div className="relative flex-1">
               <ScanLine className="absolute left-3 top-2.5 text-slate-400" size={20} />
               <input 
                  className="w-full pl-10 border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Escanear código de barras..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  disabled={!selectedMember}
                  autoFocus
               />
             </div>
             <button type="submit" disabled={!selectedMember} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">Añadir</button>
           </form>
           {barcodeError && <div className="mb-4 text-red-600 text-sm">{barcodeError}</div>}

           <div className="flex-1 overflow-y-auto border rounded-lg mb-4">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-sm font-semibold">Película</th>
                    <th className="p-3 text-sm font-semibold">Formato</th>
                    <th className="p-3 text-sm font-semibold">Precio/día</th>
                    <th className="p-3 text-sm font-semibold">Total ({config.dias_alquiler_defecto} días)</th>
                    <th className="p-3 text-sm font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-3">
                        <div className="font-medium">{item.movie.titulo}</div>
                        <div className="text-xs text-slate-500">{item.copy.codigo_barras}</div>
                      </td>
                      <td className="p-3 text-sm">{item.copy.formato}</td>
                      <td className="p-3 text-sm">{formatCurrency(item.category.precio_dia)}</td>
                      <td className="p-3 text-sm font-bold">{formatCurrency(item.category.precio_dia * config.dias_alquiler_defecto)}</td>
                      <td className="p-3">
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Escanea una copia para comenzar</td></tr>
                  )}
                </tbody>
              </table>
           </div>

           <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-slate-500 text-sm">Total items: {cart.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Total a pagar</p>
                <p className="text-3xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
              </div>
           </div>

           <button 
             onClick={handleConfirm} 
             disabled={cart.length === 0 || !selectedMember}
             className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             Confirmar Alquiler
           </button>
         </div>
      </div>
    </div>
  );
}
