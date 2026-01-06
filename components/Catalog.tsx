import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Movie, Category, Genre, Copy } from '../types';
import { Plus, Search, Edit2, Disc, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils';

export default function Catalog() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isMovieOpen, setIsMovieOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Partial<Movie> | null>(null);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [newCopy, setNewCopy] = useState<Partial<Copy>>({ formato: 'DVD', estado: 'disponible' });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [m, c, cat] = await Promise.all([
        db.movies.getAll(),
        db.copies.getAll(),
        db.categories.getAll()
      ]);
      setMovies(m);
      setCopies(c);
      setCategories(cat);
    } catch (e) {
      console.error('Error refreshing catalog:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovies = movies.filter(m =>
    m.titulo.toLowerCase().includes(search.toLowerCase()) ||
    m.director?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie?.titulo || !editingMovie.categoria_id) return;

    setLoading(true);
    try {
      if (editingMovie.id) {
        await db.movies.update(editingMovie as Movie);
      } else {
        await db.movies.add({
          ...editingMovie,
          generos_ids: editingMovie.generos_ids || []
        } as Omit<Movie, 'id'>);
      }
      setIsMovieOpen(false);
      setEditingMovie(null);
      await refreshData();
    } catch (e) {
      console.error('Error saving movie:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMovieId && newCopy.codigo_barras) {
      setLoading(true);
      try {
        await db.copies.add({
          ...newCopy,
          pelicula_id: selectedMovieId,
          estado: 'disponible'
        } as Omit<Copy, 'id'>);
        setIsCopyOpen(false);
        setNewCopy({ formato: 'DVD', estado: 'disponible', codigo_barras: '' });
        await refreshData();
      } catch (e) {
        console.error('Error adding copy:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const openAddCopy = (movieId: number) => {
    setSelectedMovieId(movieId);
    setNewCopy({ formato: 'DVD', estado: 'disponible', codigo_barras: '' });
    setIsCopyOpen(true);
  };

  const getMovieStock = (movieId: number) => {
    const movieCopies = copies.filter(c => c.pelicula_id === movieId);
    const available = movieCopies.filter(c => c.estado === 'disponible').length;
    return { total: movieCopies.length, available };
  };

  if (loading && movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
        <p className="text-slate-500">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Catálogo de Películas</h1>
        <button
          onClick={() => { setEditingMovie({ categoria_id: categories[0]?.id || 1, generos_ids: [] }); setIsMovieOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          <Plus size={18} /> Nueva Película
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título o director..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 font-semibold text-slate-600">Título</th>
                <th className="p-3 font-semibold text-slate-600">Cat./Precio</th>
                <th className="p-3 font-semibold text-slate-600">Stock (Disp/Tot)</th>
                <th className="p-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovies.map(movie => {
                const stock = getMovieStock(movie.id);
                const cat = categories.find(c => c.id === movie.categoria_id);
                return (
                  <tr key={movie.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{movie.titulo}</div>
                      <div className="text-xs text-slate-500">{movie.director} • {movie.año}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{cat?.nombre}</span>
                      <div className="text-xs mt-1 text-slate-500">{formatCurrency(cat?.precio_dia || 0)}/día</div>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${stock.available > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {stock.available}
                      </span>
                      <span className="text-slate-400"> / {stock.total}</span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => { setEditingMovie(movie); setIsMovieOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => openAddCopy(movie.id)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Añadir Copia">
                        <Disc size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMovies.length === 0 && !loading && <p className="text-center p-4 text-slate-500">No se encontraron películas.</p>}
          {loading && movies.length > 0 && <div className="text-center p-4"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>}
        </div>
      </div>

      {/* Modal Movie */}
      {isMovieOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingMovie?.id ? 'Editar Película' : 'Nueva Película'}</h2>
              <form onSubmit={handleSaveMovie} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Título</label>
                    <input required className="w-full border p-2 rounded" value={editingMovie?.titulo || ''} onChange={e => setEditingMovie({ ...editingMovie, titulo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Director</label>
                    <input className="w-full border p-2 rounded" value={editingMovie?.director || ''} onChange={e => setEditingMovie({ ...editingMovie, director: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Año</label>
                    <input type="number" className="w-full border p-2 rounded" value={editingMovie?.año || ''} onChange={e => setEditingMovie({ ...editingMovie, año: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoría</label>
                    <select className="w-full border p-2 rounded" value={editingMovie?.categoria_id} onChange={e => setEditingMovie({ ...editingMovie, categoria_id: parseInt(e.target.value) })}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nombre} - {formatCurrency(c.precio_dia)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sinopsis</label>
                  <textarea className="w-full border p-2 rounded h-24" value={editingMovie?.sinopsis || ''} onChange={e => setEditingMovie({ ...editingMovie, sinopsis: e.target.value })} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsMovieOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {loading && <Loader2 className="animate-spin" size={16} />}
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Copy */}
      {isCopyOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-4">Añadir Copia</h2>
            <form onSubmit={handleAddCopy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código de Barras</label>
                <input autoFocus required className="w-full border p-2 rounded" value={newCopy.codigo_barras || ''} onChange={e => setNewCopy({ ...newCopy, codigo_barras: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Formato</label>
                <select className="w-full border p-2 rounded" value={newCopy.formato} onChange={e => setNewCopy({ ...newCopy, formato: e.target.value as any })}>
                  <option value="DVD">DVD</option>
                  <option value="Blu-ray">Blu-ray</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsCopyOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
