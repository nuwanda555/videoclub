import React, { useState } from 'react';
import { db } from '../services/db';
import { Rental, Member, Movie, Fine } from '../types';
import { ScanLine, CheckCircle, AlertTriangle, CreditCard, RotateCcw } from 'lucide-react';
import { calculateDaysLate, formatCurrency } from '../utils';
import { useAuth } from '../App';

export default function ReturnFlow() {
  const { user } = useAuth();
  const config = db.config.get();
  const [barcode, setBarcode] = useState('');
  const [activeRental, setActiveRental] = useState<Rental | null>(null);
  const [rentalDetails, setRentalDetails] = useState<{movie: Movie, member: Member, lateDays: number, fineAmount: number} | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const findRental = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setRentalDetails(null);
    setActiveRental(null);

    const copy = db.copies.getByBarcode(barcode);
    if (!copy) {
      setMessage({ type: 'error', text: 'Copia no encontrada.' });
      return;
    }

    const rental = db.rentals.getActiveByCopy(copy.id);
    if (!rental) {
      setMessage({ type: 'error', text: 'Esta copia no figura como alquilada actualmente.' });
      return;
    }

    const member = db.members.getAll().find(m => m.id === rental.socio_id)!;
    const movie = db.movies.getAll().find(m => m.id === copy.pelicula_id)!;
    
    const lateDays = calculateDaysLate(rental.fecha_devolucion_prevista);
    const fineAmount = lateDays * config.multa_por_dia;

    setActiveRental(rental);
    setRentalDetails({ movie, member, lateDays, fineAmount });
  };

  const processReturn = (payFineNow: boolean) => {
    if (!activeRental || !user || !rentalDetails) return;

    // Process Return
    db.rentals.return(activeRental.id, new Date().toISOString(), user.id);

    // Generate Fine if applicable
    if (rentalDetails.fineAmount > 0) {
      const fine = db.fines.create({
        alquiler_id: activeRental.id,
        socio_id: activeRental.socio_id,
        dias_retraso: rentalDetails.lateDays,
        importe: rentalDetails.fineAmount,
        pagada: payFineNow,
        fecha_pago: payFineNow ? new Date().toISOString() : undefined
      });
      setMessage({ type: 'success', text: `Devolución procesada. Multa ${payFineNow ? 'cobrada' : 'generada'} (${formatCurrency(fine.importe)}).` });
    } else {
      setMessage({ type: 'success', text: 'Devolución procesada correctamente. Sin recargos.' });
    }

    // Reset
    setBarcode('');
    setActiveRental(null);
    setRentalDetails(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <RotateCcw /> Devolución de Películas
      </h1>

      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
         <form onSubmit={findRental} className="relative mb-6">
            <ScanLine className="absolute left-3 top-3 text-slate-400" />
            <input 
              autoFocus
              className="w-full pl-10 p-3 text-lg border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Escanear código de barras de la copia..."
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
            />
            <button type="submit" className="hidden">Buscar</button>
         </form>

         {message && (
           <div className={`p-4 rounded mb-4 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
             {message.type === 'success' ? <CheckCircle /> : <AlertTriangle />}
             {message.text}
           </div>
         )}

         {rentalDetails && activeRental && (
           <div className="border rounded-lg p-6 bg-slate-50">
             <div className="grid grid-cols-2 gap-4 mb-6">
               <div>
                 <p className="text-sm text-slate-500">Película</p>
                 <p className="font-bold text-lg">{rentalDetails.movie.titulo}</p>
                 <p className="text-xs text-slate-400">ID Copia: {activeRental.copia_id}</p>
               </div>
               <div>
                 <p className="text-sm text-slate-500">Socio</p>
                 <p className="font-bold text-lg">{rentalDetails.member.nombre} {rentalDetails.member.apellidos}</p>
                 <p className="text-xs text-slate-400">{rentalDetails.member.numero_socio}</p>
               </div>
             </div>

             {rentalDetails.lateDays > 0 ? (
               <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
                 <h3 className="text-red-800 font-bold flex items-center gap-2"><AlertTriangle size={20} /> Retraso Detectado</h3>
                 <p className="text-red-700 mt-1">
                   La devolución tiene <strong>{rentalDetails.lateDays} días</strong> de retraso.
                 </p>
                 <p className="text-2xl font-bold text-red-900 mt-2">
                   Multa: {formatCurrency(rentalDetails.fineAmount)}
                 </p>
               </div>
             ) : (
               <div className="bg-green-50 border border-green-200 p-4 rounded mb-6 text-green-800 flex items-center gap-2">
                 <CheckCircle size={20} /> Devolución en plazo correcto.
               </div>
             )}

             <div className="grid grid-cols-2 gap-4">
               {rentalDetails.lateDays > 0 ? (
                 <>
                   <button 
                     onClick={() => processReturn(false)}
                     className="py-3 px-4 border border-slate-300 bg-white hover:bg-slate-50 rounded text-slate-700 font-medium"
                   >
                     Devolver y dejar multa pendiente
                   </button>
                   <button 
                     onClick={() => processReturn(true)}
                     className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded font-bold flex items-center justify-center gap-2"
                   >
                     <CreditCard size={18} /> Cobrar {formatCurrency(rentalDetails.fineAmount)} y Devolver
                   </button>
                 </>
               ) : (
                 <button 
                    onClick={() => processReturn(false)}
                    className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                 >
                   Confirmar Devolución
                 </button>
               )}
             </div>
           </div>
         )}
      </div>
    </div>
  );
}
