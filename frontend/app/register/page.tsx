'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al crear la cuenta. Intenta nuevamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Contraseñas coinciden', met: password === confirm && confirm.length > 0 },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-10 border border-slate-100 shadow-2xl shadow-slate-200/50"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Crear Cuenta</h1>
          <p className="text-slate-500">Empieza gratis. Sin tarjeta de crédito.</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-6 text-red-600 text-sm font-medium"
          >
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </motion.div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-primary/30 focus-within:bg-white transition">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                placeholder="correo@empresa.com"
                className="bg-transparent outline-none w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Contraseña</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-primary/30 focus-within:bg-white transition">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="bg-transparent outline-none w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Confirmar Contraseña</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-primary/30 focus-within:bg-white transition">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                placeholder="Repite tu contraseña"
                className="bg-transparent outline-none w-full"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password requirements */}
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {requirements.map((req) => (
                <div key={req.label} className={`flex items-center gap-2 text-xs font-medium transition-colors ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle2 size={13} className={req.met ? 'text-emerald-500' : 'text-slate-300'} />
                  {req.label}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-70 !mt-6"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Crear Cuenta Gratis</span><ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-primary font-bold hover:underline">
            Inicia Sesión
          </a>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
          Al registrarte aceptas los términos de uso de la plataforma. Tu plan inicial es <strong>Gratuito</strong>.
        </p>
      </motion.div>
    </div>
  );
}
