import React, { useState } from 'react';
import { db } from '../services/db';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState(db.config.get());
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.config.update(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Configuración del Sistema</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div>
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Reglas de Negocio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Días Alquiler por Defecto</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border p-2 rounded"
                  value={config.dias_alquiler_defecto}
                  onChange={e => setConfig({...config, dias_alquiler_defecto: parseInt(e.target.value)})}
                />
                <p className="text-xs text-slate-500 mt-1">Duración estándar de un alquiler.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Multa por día (€)</label>
                <input 
                  type="number" 
                  step="0.10"
                  className="w-full border p-2 rounded"
                  value={config.multa_por_dia}
                  onChange={e => setConfig({...config, multa_por_dia: parseFloat(e.target.value)})}
                />
                <p className="text-xs text-slate-500 mt-1">Importe a cobrar por cada día de retraso.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Max. Alquileres por Socio</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border p-2 rounded"
                  value={config.max_alquileres_socio}
                  onChange={e => setConfig({...config, max_alquileres_socio: parseInt(e.target.value)})}
                />
                <p className="text-xs text-slate-500 mt-1">Límite de películas simultáneas.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
             {saved ? <span className="text-green-600 font-medium">Configuración guardada correctamente.</span> : <span></span>}
             <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
               <Save size={18} /> Guardar Cambios
             </button>
          </div>

        </form>
      </div>
    </div>
  );
}
