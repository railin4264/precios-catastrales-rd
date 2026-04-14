'use client';

import { useEffect, useState } from 'react';
import { User, LogOut, ShieldCheck, Home, LayoutDashboard, Code2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav suppressHydrationWarning className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm shadow-slate-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30 group-hover:scale-105 transition">P</div>
            <span className="text-xl font-bold text-primary tracking-tight">
              Precios Catastrales <span className="text-secondary">RD</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="/" className="flex items-center gap-1.5 text-gray-600 hover:text-primary font-medium transition text-sm">
              <Home size={15} /> Inicio
            </a>
            <a href="/dashboard" className="flex items-center gap-1.5 text-gray-600 hover:text-primary font-medium transition text-sm">
              <LayoutDashboard size={15} /> Panel
            </a>
            <a href="/api-docs" className="flex items-center gap-1.5 text-gray-600 hover:text-primary font-medium transition text-sm">
              <Code2 size={15} /> API
            </a>
            {isAdmin && (
              <a href="/admin" className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-bold transition text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <ShieldCheck size={15} /> Admin
              </a>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <User size={13} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[140px] truncate">{user.email}</span>
                  {user.plan && (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${user.plan === 'FREE' ? 'bg-slate-200 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                      {user.plan}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Cerrar Sesión"
                  className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition text-sm font-medium border border-slate-100 px-3 py-1.5 rounded-xl hover:border-red-200 hover:bg-red-50"
                >
                  <LogOut size={14} /> Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href="/login" className="text-sm font-medium text-slate-600 hover:text-primary transition px-3 py-1.5">
                  Iniciar Sesión
                </a>
                <a
                  href="/register"
                  className="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-opacity-90 transition shadow-lg shadow-primary/20"
                >
                  Registrarse
                </a>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-slate-100 bg-white"
          >
            <div className="px-4 py-4 space-y-2">
              <a href="/" className="flex items-center gap-2 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                <Home size={18} /> Inicio
              </a>
              <a href="/dashboard" className="flex items-center gap-2 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                <LayoutDashboard size={18} /> Panel
              </a>
              <a href="/api-docs" className="flex items-center gap-2 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                <Code2 size={18} /> API
              </a>
              {isAdmin && (
                <a href="/admin" className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 font-bold">
                  <ShieldCheck size={18} /> Admin
                </a>
              )}
              <div className="border-t border-slate-100 pt-3 mt-3">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                      <User size={16} className="text-primary" />
                      <span className="text-sm font-medium text-slate-700 truncate">{user.email}</span>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-xl font-medium">
                      <LogOut size={18} /> Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <a href="/login" className="block p-3 text-center rounded-xl border border-slate-100 font-medium text-slate-700">Iniciar Sesión</a>
                    <a href="/register" className="block p-3 text-center rounded-xl bg-primary text-white font-bold">Registrarse</a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
