'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Key, CreditCard, Settings, LogOut, Plus, Copy, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';


export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'apikeys' | 'subscription' | 'docs'>('dashboard');
  const [usageStats, setUsageStats] = useState({ consultas: 0, reportes: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const [userRes, keysRes, logsRes] = await Promise.all([
          axios.get(`${API_URL}/auth/me`, { headers }),
          axios.get(`${API_URL}/api/keys`, { headers }),
          axios.get(`${API_URL}/api/usage`, { headers }).catch(() => ({ data: { consultas: 0, reportes: 0 } })),
        ]);

        setUser(userRes.data);
        setApiKeys(keysRes.data);
        setUsageStats(logsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        localStorage.removeItem('token');
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const generateNewKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/keys`, { name: 'New API Key' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApiKeys([...apiKeys, res.data]);
    } catch (err) {
      console.error('Error generating key:', err);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: 'Consultas este mes', value: String(usageStats.consultas), limit: user?.plan === 'FREE' ? '30' : user?.plan === 'BASIC' ? '300' : '∞', color: 'bg-blue-500' },
    { label: 'Reportes generados', value: String(usageStats.reportes), limit: user?.plan === 'FREE' ? '5' : '∞', color: 'bg-emerald-500' },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 fixed h-full p-6 flex flex-col pt-24 hidden md:flex">
        <div className="space-y-2 flex-1">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeSection === 'dashboard'} onClick={() => setActiveSection('dashboard')} />
          <NavItem icon={<Key size={20}/>} label="API Keys" active={activeSection === 'apikeys'} onClick={() => setActiveSection('apikeys')} />
          <NavItem icon={<CreditCard size={20}/>} label="Suscripción" active={activeSection === 'subscription'} onClick={() => setActiveSection('subscription')} />
          <NavItem icon={<Settings size={20}/>} label="Documentación" active={activeSection === 'docs'} onClick={() => { window.location.href = '/api-docs'; }} />
        </div>
        <button 
          onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }}
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-white transition rounded-xl"
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-10 pt-28">
        <motion.header 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Panel de Control</h1>
            <p className="text-slate-500">Sesión iniciada como <span className="font-semibold text-primary">{user?.email}</span></p>
          </div>
          <div className="flex gap-3">
             <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${user?.plan === 'FREE' ? 'bg-slate-200 text-slate-600' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                Plan {user?.plan}
             </span>
          </div>
        </motion.header>

        {/* Stats Grid — visible only in dashboard section */}
        {activeSection === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={i} 
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100"
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-black text-slate-800">{stat.value}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Límite: {stat.limit}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div 
                  className={`h-full ${stat.color} rounded-full transition-all duration-1000`} 
                  style={{ width: `${(parseInt(stat.value) / parseInt(stat.limit)) * 100}%` }}
                ></div>
              </div>
            </motion.div>
          ))}
        </div>
        )}

        {/* Content Area */}
        {activeSection === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* API Keys Section */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-800">Mis API Keys</h2>
              <button 
                onClick={generateNewKey}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-opacity-90 transition"
              >
                <Plus size={16} /> Nueva Llave
              </button>
            </div>
            
            <div className="space-y-4">
              {apiKeys.length > 0 ? apiKeys.map((key, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition group">
                  <div className="flex items-center gap-4 truncate">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                      <Key size={18} />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 text-sm truncate">{key.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{key.key?.substring(0, 10) || 'N/A'}****************</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(key.key)}
                    className="p-3 text-slate-400 hover:text-primary transition bg-white rounded-xl border border-slate-100"
                  >
                    {copiedKey === key.key ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  </button>
                </div>
              )) : (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                    <Key size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium italic">No tienes llaves de API activas.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* Plan Info */}
            <div className={`rounded-[2.5rem] p-10 text-white shadow-xl shadow-primary/20 flex flex-col relative overflow-hidden ${user?.plan !== 'FREE' ? 'bg-primary' : 'bg-slate-800'}`}>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl text-white"
              ></motion.div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2 tracking-tight">Plan {user?.plan}</h2>
                <p className="text-blue-100/70 text-sm mb-10 leading-relaxed italic">
                  {user?.plan === 'FREE' ? 'Sube de nivel para acceder a la descarga de reportes y API comercial.' : 'Acceso total a la plataforma y herramientas B2B.'}
                </p>
                
                {user?.plan === 'FREE' ? (
                   <button 
                    onClick={() => window.location.href = '/'}
                    className="w-full py-4 bg-white text-slate-900 font-black text-sm rounded-2xl hover:bg-slate-50 transition uppercase tracking-widest"
                   >
                    Ver Planes PRO
                  </button>
                ) : (
                  <button className="w-full py-4 bg-white/20 border border-white/30 text-white font-black text-sm rounded-2xl hover:bg-white/30 transition uppercase tracking-widest">
                    Facturación
                  </button>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div> Documentación Express
              </h3>
              <ul className="space-y-4 text-sm font-medium text-slate-600">
                <li onClick={() => window.location.href='/api-docs'} className="flex items-center gap-2 hover:text-primary transition cursor-pointer">
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div> Uso de la API REST
                </li>
                <li onClick={() => window.location.href='/api-docs'} className="flex items-center gap-2 hover:text-primary transition cursor-pointer">
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div> Integración con PDFs
                </li>
                <li onClick={() => window.location.href='/api-docs'} className="flex items-center gap-2 hover:text-primary transition cursor-pointer">
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div> Límites de tasa (Rate Limiting)
                </li>
              </ul>
            </div>
          </div>
        </div>
        )}

        {/* API Keys Section standalone */}
        {activeSection === 'apikeys' && (
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-800">Mis API Keys</h2>
              <button onClick={generateNewKey} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-opacity-90 transition">
                <Plus size={16} /> Nueva Llave
              </button>
            </div>
            <div className="space-y-4">
              {apiKeys.length > 0 ? apiKeys.map((key, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4 truncate">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm"><Key size={18} /></div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 text-sm">{key.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{key.key ? key.key.substring(0, 14) + '...' : 'sk_cat_****'}</p>
                    </div>
                  </div>
                  <button onClick={() => copyToClipboard(key.key)} className="p-3 text-slate-400 hover:text-primary transition bg-white rounded-xl border border-slate-100">
                    {copiedKey === key.key ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  </button>
                </div>
              )) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200"><Key size={32} className="text-slate-300" /></div>
                  <p className="text-slate-400 font-medium italic">No tienes llaves activas. Crea una para integraciones.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscription Section */}
        {activeSection === 'subscription' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Tu Suscripción</h2>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Plan Actual</p>
                  <h3 className="text-3xl font-black text-primary">{user?.plan}</h3>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase ${user?.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : user?.plan !== 'FREE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{user?.role}</span>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Consultas / 15 min', value: user?.plan === 'FREE' ? '30' : user?.plan === 'BASIC' ? '300' : user?.plan === 'PROFESSIONAL' ? '1,500' : 'Ilimitadas' },
                  { label: 'Reportes PDF', value: user?.plan === 'FREE' ? 'Básicos' : 'Completos' },
                  { label: 'Acceso API B2B', value: user?.plan === 'FREE' ? 'No' : 'Sí' },
                  { label: 'Soporte', value: user?.plan === 'FREE' ? 'Comunidad' : 'Prioritario' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {user?.plan === 'FREE' && (
              <div className="bg-gradient-to-br from-primary to-blue-700 rounded-[2rem] p-8 text-white text-center">
                <h3 className="text-2xl font-black mb-2">Actualiza tu Plan</h3>
                <p className="text-blue-200 text-sm mb-6">Contacta al administrador vía WhatsApp para activar un plan PRO.</p>
                <a href="https://wa.me/18090000000" target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-white text-primary font-black px-8 py-3 rounded-2xl hover:bg-slate-50 transition">
                  Contactar por WhatsApp
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition ${active ? 'bg-primary text-white shadow-lg shadow-primary/40' : 'hover:bg-slate-800 text-slate-400'}`}>
      {icon} <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );
}
