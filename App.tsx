import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Film, Users, Disc, FileText, Settings, LogOut, Menu, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { User } from './types';
import { db } from './services/db';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import Members from './components/Members';
import RentalFlow from './components/RentalFlow';
import ReturnFlow from './components/ReturnFlow';
import SettingsPage from './components/SettingsPage';
import Reports from './components/Reports';

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('vc_session_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    try {
      const u = await db.users.getByEmail(email);
      if (u) {
        setUser(u);
        localStorage.setItem('vc_session_user', JSON.stringify(u));
        return true;
      }
    } catch (e) {
      console.error('Error in login:', e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vc_session_user');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Film className="w-12 h-12 text-blue-600 animate-pulse" />
        <p className="text-slate-600 font-medium">Cargando sistema...</p>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Alquilar', path: '/rent', icon: Disc },
    { label: 'Devolver', path: '/return', icon: RotateCcw },
    { label: 'Catálogo', path: '/catalog', icon: Film },
    { label: 'Socios', path: '/members', icon: Users },
  ];

  if (user?.rol === 'administrador') {
    navItems.push({ label: 'Informes', path: '/reports', icon: FileText });
    navItems.push({ label: 'Configuración', path: '/settings', icon: Settings });
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100">
        <div className="p-4 border-b border-slate-800 font-bold text-xl flex items-center gap-2">
          <Film className="text-blue-500" />
          <span>VideoClub</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
                }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {user?.nombre.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.nombre}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Film className="text-blue-500" /> VideoClub
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 text-slate-100 z-50 p-4 shadow-xl">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md ${location.pathname === item.path ? 'bg-blue-600' : 'hover:bg-slate-800'
                    }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              ))}
              <button onClick={logout} className="flex items-center gap-3 px-3 py-3 text-red-400 w-full text-left">
                <LogOut size={20} /> Salir
              </button>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// Login Screen
const LoginScreen = () => {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('admin@videoclub.com'); // Pre-filled for demo
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    const success = await login(email);
    if (!success) {
      setError('Usuario no encontrado. Asegúrate de cargar los datos de prueba en Configuración (o contacta al administrador).');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <Film className="w-12 h-12 text-blue-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-slate-900">VideoClub Manager</h1>
          <p className="text-slate-500">Inicia sesión para acceder (Supabase)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="text-sm text-slate-500 mb-4 bg-slate-50 p-2 rounded">
            <p>Demo Admin: <strong>admin@videoclub.com</strong></p>
            <p>Demo Empleado: <strong>emp@videoclub.com</strong></p>
            <p className="text-xs text-blue-600 mt-1 italic">* Requiere carga previa de datos.</p>
          </div>
          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
          <button
            type="submit"
            disabled={isLoggingIn}
            className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex items-center justify-center ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/rent" element={<ProtectedRoute><RentalFlow /></ProtectedRoute>} />
          <Route path="/return" element={<ProtectedRoute><ReturnFlow /></ProtectedRoute>} />
          <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
