import React from 'react';
import { db } from '../services/db';
import { formatCurrency } from '../utils';

export default function Reports() {
  const rentals = db.rentals.getAll();
  const fines = db.fines.getAll();
  const movies = db.movies.getAll();

  // Top Movies
  const movieCounts: Record<number, number> = {};
  rentals.forEach(r => {
    // Need to find movie from copy
    const copy = db.copies.getAll().find(c => c.id === r.copia_id);
    if (copy) {
        movieCounts[copy.pelicula_id] = (movieCounts[copy.pelicula_id] || 0) + 1;
    }
  });

  const topMovies = Object.entries(movieCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => {
        const movie = movies.find(m => m.id === parseInt(id));
        return { title: movie?.titulo, count };
    });

  const totalFinesGenerated = fines.reduce((sum, f) => sum + f.importe, 0);
  const totalFinesPaid = fines.filter(f => f.pagada).reduce((sum, f) => sum + f.importe, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Informes y Estadísticas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
           <h2 className="text-lg font-bold mb-4">Películas Más Alquiladas</h2>
           <ul className="space-y-3">
             {topMovies.map((m, idx) => (
               <li key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                 <span className="font-medium text-slate-700">{idx + 1}. {m.title}</span>
                 <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{m.count} alquilers</span>
               </li>
             ))}
             {topMovies.length === 0 && <p className="text-slate-500">Sin datos suficientes.</p>}
           </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
           <h2 className="text-lg font-bold mb-4">Resumen Financiero (Multas)</h2>
           <div className="space-y-4">
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <span className="text-slate-600">Total Generado</span>
                <span className="font-bold text-lg">{formatCurrency(totalFinesGenerated)}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-green-50 rounded text-green-800">
                <span>Cobrado</span>
                <span className="font-bold text-lg">{formatCurrency(totalFinesPaid)}</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-red-50 rounded text-red-800">
                <span>Pendiente</span>
                <span className="font-bold text-lg">{formatCurrency(totalFinesGenerated - totalFinesPaid)}</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
