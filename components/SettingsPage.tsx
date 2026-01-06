import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Config, Category } from '../types';
import { Save, Database, Trash2, Plus, Loader2, CheckCircle } from 'lucide-react';
import { seedTestData } from '../services/seed';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Config | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [cfg, cats] = await Promise.all([
        db.config.get(),
        db.categories.getAll()
      ]);
      setConfig(cfg);
      setCategories(cats);
    } catch (e) {
      console.error('Error loading settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await db.config.update(config);
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('¿Seguro que quieres cargar datos de prueba? Esto solo funcionará si las tablas están vacías.')) return;
    setSaving(true);
    try {
      await seedTestData();
      setMessage({ type: 'success', text: 'Datos de prueba cargados con éxito.' });
      await refreshData();
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al cargar datos de prueba.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="animate-spin mb-2" size={40} />
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Database /> Configuración del Sistema
      </h1>

      {message && (
        <div className={`p-4 rounded flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <Trash2 size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* General Config */}
        <section className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-6">Parámetros de Alquiler</h2>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Días de alquiler por defecto</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={config?.dias_alquiler_defecto || 3}
                onChange={e => setConfig(prev => prev ? { ...prev, dias_alquiler_defecto: parseInt(e.target.value) } : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Multa por día de retraso (€)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 border rounded"
                value={config?.multa_por_dia || 2.50}
                onChange={e => setConfig(prev => prev ? { ...prev, multa_por_dia: parseFloat(e.target.value) } : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Máx. alquileres por socio</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={config?.max_alquileres_socio || 5}
                onChange={e => setConfig(prev => prev ? { ...prev, max_alquileres_socio: parseInt(e.target.value) } : null)}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar Configuración
            </button>
          </form>
        </section>

        {/* Maintenance / Setup */}
        <section className="bg-white p-6 rounded-lg shadow border border-slate-200 flex flex-col">
          <h2 className="text-lg font-semibold mb-6">Mantenimiento</h2>
          <p className="text-sm text-slate-600 mb-6">Utiliza estas herramientas para inicializar el sistema o realizar tareas de mantenimiento masivas.</p>

          <div className="mt-auto space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <h3 className="font-bold text-blue-900 text-sm mb-1 uppercase">Datos de Prueba</h3>
              <p className="text-xs text-blue-700 mb-4">Carga automáticamente una selección de películas, categorías, géneros y socios para empezar a probar el sistema.</p>
              <button
                onClick={handleSeedData}
                disabled={saving}
                className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Cargar Datos de Prueba
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg opacity-60">
              <h3 className="font-bold text-slate-900 text-sm mb-1 uppercase">Limpiar Base de Datos</h3>
              <p className="text-xs text-slate-600 mb-4">Elimina todos los datos de las tablas (acción irreversible).</p>
              <button
                disabled
                className="w-full bg-slate-200 text-slate-500 py-2 rounded-lg text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Vaciar Tablas
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
