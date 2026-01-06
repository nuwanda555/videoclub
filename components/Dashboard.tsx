import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Rental, Copy } from '../types';
import { formatCurrency, calculateDaysLate } from '../utils';
import { AlertCircle, TrendingUp, Users, Film, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeRentals: 0,
    overdueRentals: 0,
    todayIncome: 0,
    totalMembers: 0,
    totalMovies: 0
  });
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Calculate Stats
    const rentals = db.rentals.getAll();
    const members = db.members.getAll();
    const movies = db.movies.getAll();
    const fines = db.fines.getAll();

    const today = new Date().toISOString().split('T')[0];
    
    // Check Overdue
    const active = rentals.filter(r => r.estado === 'activo');
    const overdue = active.filter(r => new Date(r.fecha_devolucion_prevista) < new Date());
    
    // Income Today (Rentals made today + Fines paid today)
    const rentalsToday = rentals.filter(r => r.fecha_alquiler.startsWith(today));
    const finesPaidToday = fines.filter(f => f.pagada && f.fecha_pago?.startsWith(today));
    
    const incomeRentals = rentalsToday.reduce((sum, r) => sum + (r.precio_dia * db.config.get().dias_alquiler_defecto), 0);
    const incomeFines = finesPaidToday.reduce((sum, f) => sum + f.importe, 0);

    setStats({
      activeRentals: active.length,
      overdueRentals: overdue.length,
      todayIncome: incomeRentals + incomeFines,
      totalMembers: members.length,
      totalMovies: movies.length
    });

    // Overdue List Details
    const detailedOverdue = overdue.map(r => {
      const member = members.find(m => m.id === r.socio_id);
      const copy = db.copies.getAll().find(c => c.id === r.copia_id);
      const movie = movies.find(m => m.id === copy?.pelicula_id);
      return {
        id: r.id,
        memberName: `${member?.nombre} ${member?.apellidos}`,
        movieTitle: movie?.titulo,
        dueDate: r.fecha_devolucion_prevista,
        daysLate: calculateDaysLate(r.fecha_devolucion_prevista)
      };
    });
    setOverdueList(detailedOverdue);

    // Mock Chart Data (Last 7 days)
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayRentals = rentals.filter(r => r.fecha_alquiler.startsWith(dateStr)).length;
        data.push({ name: d.toLocaleDateString('es-ES', { weekday: 'short' }), alquileres: dayRentals });
    }
    setChartData(data);

  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Film /></div>
            <div>
              <p className="text-sm text-slate-500">Alquileres Activos</p>
              <p className="text-2xl font-bold">{stats.activeRentals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full"><AlertCircle /></div>
            <div>
              <p className="text-sm text-slate-500">Vencidos</p>
              <p className="text-2xl font-bold">{stats.overdueRentals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full"><TrendingUp /></div>
            <div>
              <p className="text-sm text-slate-500">Ingresos Hoy</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.todayIncome)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><Users /></div>
            <div>
              <p className="text-sm text-slate-500">Socios Totales</p>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200 col-span-2">
           <h2 className="text-lg font-semibold mb-4">Actividad Semanal</h2>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip />
                 <Bar dataKey="alquileres" fill="#3b82f6" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            Retrasos Críticos
          </h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {overdueList.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay alquileres vencidos.</p>
            ) : (
              overdueList.map(item => (
                <div key={item.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded text-sm">
                  <p className="font-bold text-slate-900">{item.movieTitle}</p>
                  <p className="text-slate-700">{item.memberName}</p>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-red-700 font-medium">Retraso: {item.daysLate} días</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
