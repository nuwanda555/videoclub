import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { formatCurrency } from '../utils';
import { Loader2 } from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [rentals, fines, movies, copies] = await Promise.all([
        db.rentals.getAll(),
        db.fines.getAll(),
        db.movies.getAll(),
        db.copies.getAll()
      ]);

      // Top Movies
      const movieCounts: Record<number, number> = {};
      rentals.forEach(r => {
        const copy = copies.find(c => c.id === r.copia_id);
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

      const totalFinesGenerated = fines.reduce((sum, f) => sum + (f.importe || 0), 0);
      const totalFinesPaid = fines.filter(f => f.pagada).reduce((sum, f) => sum + (f.importe || 0), 0);

      setStats({
        topMovies,
        totalFinesGenerated,
        totalFinesPaid,
        totalFinesPending: totalFinesGenerated - totalFinesPaid
      });
    } catch (e) {
      console.error('Error generating reports:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={40} />
        <p>Generando informes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Informes y Estadísticas</h1>
        {loading && <Loader2 className="animate-spin text-blue-600" size={20} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-bold mb-4">Películas Más Alquiladas</h2>
          <ul className="space-y-3">
            {stats?.topMovies.map((m: any, idx: number) => (
              <li key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                <span className="font-medium text-slate-700">{idx + 1}. {m.title}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{m.count} alquileres</span>
              </li>
            ))}
            {stats?.topMovies.length === 0 && <p className="text-slate-500">Sin datos suficientes.</p>}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-bold mb-4">Resumen Financiero (Multas)</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="text-slate-600">Total Generado</span>
              <span className="font-bold text-lg">{formatCurrency(stats?.totalFinesGenerated || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded text-green-800">
              <span>Cobrado</span>
              <span className="font-bold text-lg">{formatCurrency(stats?.totalFinesPaid || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded text-red-800">
              <span>Pendiente</span>
              <span className="font-bold text-lg">{formatCurrency(stats?.totalFinesPending || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
