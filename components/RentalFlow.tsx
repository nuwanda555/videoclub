import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member, Movie, Copy } from '../types';
import { Search, CreditCard, Disc, User, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency, calculateReturnDate } from '../utils';
import { useAuth } from '../App';

export default function RentalFlow() {
  const { user } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [member, setMember] = useState<Member | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [copy, setCopy] = useState<Copy | null>(null);

  // Search states
  const [searchMember, setSearchMember] = useState('');
  const [searchMovie, setSearchMovie] = useState('');

  // DB results
  const [members, setMembers] = useState<Member[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [availableCopies, setAvailableCopies] = useState<Copy[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeRentalsCount, setActiveRentalsCount] = useState(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [allMembers, allMovies, cats, cfg] = await Promise.all([
        db.members.getAll(),
        db.movies.getAll(),
        db.categories.getAll(),
        db.config.get()
      ]);
      setMembers(allMembers);
      setMovies(allMovies);
      setCategories(cats);
      setConfig(cfg);
    } catch (e) {
      console.error('Error loading rental data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = async (m: Member) => {
    setLoading(true);
    try {
      const active = await db.rentals.getActiveByMember(m.id);
      setActiveRentalsCount(active.length);
      setMember(m);
      setStep(2);
    } catch (e) {
      console.error('Error selecting member:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = async (m: Movie) => {
    setLoading(true);
    try {
      const copies = await db.copies.getByMovieId(m.id);
      setAvailableCopies(copies.filter(c => c.estado === 'disponible'));
      setMovie(m);
      setStep(3);
    } catch (e) {
      console.error('Error selecting movie:', e);
    } finally {
      setLoading(false);
    }
  };

  const confirmRental = async () => {
    if (!member || !copy || !movie || !user || !config) return;

    setLoading(true);
    try {
      const category = categories.find(c => c.id === movie.categoria_id);
      await db.rentals.create({
        socio_id: member.id,
        copia_id: copy.id,
        fecha_alquiler: new Date().toISOString(),
        fecha_devolucion_prevista: calculateReturnDate(config.dias_alquiler_defecto),
        precio_dia: category?.precio_dia || 2.5,
        empleado_alquiler_id: (user as any).id, // Assuming UUID from Supabase
      });
      setStep(4);
    } catch (e) {
      console.error('Error confirming rental:', e);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setMember(null);
    setMovie(null);
    setCopy(null);
    setSearchMember('');
    setSearchMovie('');
    loadInitialData();
  };

  const filteredMembers = members.filter(m =>
    m.nombre.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.dni.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.numero_socio.toLowerCase().includes(searchMember.toLowerCase())
  );

  const filteredMovies = movies.filter(m =>
    m.titulo.toLowerCase().includes(searchMovie.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo Alquiler</h1>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {s === 4 ? <CheckCircle size={20} /> : s}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Member */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><User /> Seleccionar Socio</h2>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-slate-400" />
            <input
              className="w-full pl-10 p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Buscar por nombre, DNI o nº socio..."
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMembers.map(m => (
              <button
                key={m.id}
                onClick={() => handleSelectMember(m)}
                className="flex flex-col p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition"
              >
                <span className="font-bold text-slate-900">{m.nombre} {m.apellidos}</span>
                <span className="text-sm text-slate-500">{m.dni} • {m.numero_socio}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Movie */}
      {step === 2 && member && (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Disc /> Seleccionar Película</h2>
            <div className="text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-700">
              Socio: <strong>{member.nombre}</strong> ({activeRentalsCount}/{config?.max_alquileres_socio})
            </div>
          </div>

          {activeRentalsCount >= (config?.max_alquileres_socio || 5) && (
            <div className="mb-6 p-4 bg-red-50 text-red-800 rounded flex items-center gap-2">
              <AlertTriangle /> El socio ha alcanzado el límite de alquileres permitidos.
            </div>
          )}

          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-slate-400" />
            <input
              autoFocus
              className="w-full pl-10 p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Buscar película por título..."
              value={searchMovie}
              onChange={e => setSearchMovie(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredMovies.map(m => (
              <button
                key={m.id}
                onClick={() => handleSelectMovie(m)}
                className="flex flex-col p-2 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition items-center text-center"
              >
                <img src={m.portada_url || 'https://via.placeholder.com/150'} alt={m.titulo} className="w-full aspect-[2/3] object-cover rounded mb-2" />
                <span className="font-bold text-xs text-slate-900 line-clamp-2">{m.titulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select Copy & Confirm */}
      {step === 3 && movie && member && (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><CreditCard /> Confirmar Alquiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Película Seleccionada</p>
                <p className="text-xl font-bold">{movie.titulo}</p>
                <p className="text-sm text-slate-600">{movie.director} ({movie.año})</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-slate-700">Seleccionar Copia Disponible</p>
                <div className="space-y-2">
                  {availableCopies.length === 0 ? (
                    <p className="text-red-500 text-sm font-medium">No hay copias disponibles para esta película.</p>
                  ) : (
                    availableCopies.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCopy(c)}
                        className={`w-full p-3 border rounded-lg flex justify-between items-center transition ${copy?.id === c.id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'hover:bg-slate-50'}`}
                      >
                        <span className="font-mono">{c.codigo_barras}</span>
                        <span className="text-xs bg-slate-200 px-2 py-1 rounded">{c.formato}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-l pl-8 space-y-6">
              <div>
                <h3 className="font-bold mb-3">Resumen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Precio/día:</span><strong>{formatCurrency(categories.find(ca => ca.id === movie.categoria_id)?.precio_dia || 0)}</strong></div>
                  <div className="flex justify-between"><span>Días incluidos:</span><strong>{config?.dias_alquiler_defecto}</strong></div>
                  <div className="flex justify-between border-t pt-2 mt-2 text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency((categories.find(ca => ca.id === movie.categoria_id)?.precio_dia || 0) * (config?.dias_alquiler_defecto || 1))}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={confirmRental}
                  disabled={!copy || loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="animate-spin" size={20} />}
                  Completar Alquiler
                </button>
                <button onClick={() => setStep(2)} className="w-full text-slate-500 hover:text-slate-800 text-sm font-medium">Volver</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="bg-white p-12 rounded-lg shadow border border-slate-200 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Alquiler Completado!</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">La película ha sido registrada bajo el socio <strong>{member?.nombre}</strong>. Recuerda marcar la fecha de devolución prevista.</p>
          <button
            onClick={reset}
            className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition"
          >
            Hacer otro Alquiler
          </button>
        </div>
      )}
    </div>
  );
}
