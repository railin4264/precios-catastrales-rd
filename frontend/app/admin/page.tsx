'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Database, Users, Plus, Pencil, Trash2,
  Search, ChevronLeft, ChevronRight, Loader2, X,
  Check, AlertCircle, BarChart3, MapPin, Save, Zap, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Zone = {
  id: string; provincia: string; municipio: string; zona: string;
  sector: string | null; seccion: string | null; valorPromedio: number | null;
  codigo: string | null; createdAt: string;
};

type User = { id: string; email: string; role: string; plan: string; createdAt: string; };
type Stats = { totalZones: number; totalUsers: number; urbanas: number; rurales: number; byProvincia: any[]; consultasEsteMes?: number; reportesEsteMes?: number; impactFactors?: number };

const TAB_ICONS: Record<string, any> = {
  stats: BarChart3, zones: Database, users: Users, predictive: Sparkles
};

export default function AdminPage() {
  const [tab, setTab] = useState<'stats' | 'zones' | 'users' | 'predictive'>('stats');
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Zones state
  const [zones, setZones] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [zoneSearch, setZoneSearch] = useState('');
  const [zonesLoading, setZonesLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Impact Factors state
  const [impactFactors, setImpactFactors] = useState<any[]>([]);
  const [factorsLoading, setFactorsLoading] = useState(false);
  const [impactModal, setImpactModal] = useState(false);
  const [impactForm, setImpactForm] = useState({ name: '', type: 'MALL', description: '', latitude: '', longitude: '', radiusKm: '1.0', impactScore: '1.10' });
  const [impactSubmitting, setImpactSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Modal
  const [modal, setModal] = useState<{ type: 'create' | 'edit' | 'delete'; zone?: Zone } | null>(null);
  const [formData, setFormData] = useState<Partial<Zone>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!t || !u) { setAuthorized(false); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'ADMIN') { setAuthorized(false); return; }
    setToken(t);
    setCurrentUser(parsed);
    setAuthorized(true);
  }, []);

  const authHeader = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Load stats
  useEffect(() => {
    if (!authorized || tab !== 'stats') return;
    axios.get(`${API_URL}/admin/stats`, { headers: authHeader() })
      .then(r => setStats(r.data)).catch(() => {});
  }, [authorized, tab, authHeader]);

  // Load zones
  const loadZones = useCallback(async () => {
    if (!authorized || tab !== 'zones') return;
    setZonesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/zones`, {
        headers: authHeader(),
        params: { page, limit: 25, q: zoneSearch || undefined },
      });
      setZones(res.data.zones);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {} finally { setZonesLoading(false); }
  }, [authorized, tab, page, zoneSearch, authHeader]);

  useEffect(() => { loadZones(); }, [loadZones]);

  // Load users
  useEffect(() => {
    if (!authorized || tab !== 'users') return;
    setUsersLoading(true);
    axios.get(`${API_URL}/admin/users`, { headers: authHeader() })
      .then(r => { setUsers(r.data); setUsersLoading(false); })
      .catch(() => setUsersLoading(false));
  }, [authorized, tab, authHeader]);

  // Load impact factors
  useEffect(() => {
    if (!authorized || tab !== 'predictive') return;
    setFactorsLoading(true);
    axios.get(`${API_URL}/admin/impact`, { headers: authHeader() })
      .then(r => { setImpactFactors(r.data); setFactorsLoading(false); })
      .catch(() => setFactorsLoading(false));
  }, [authorized, tab, authHeader]);

  const handleDelete = async () => {
    if (!modal?.zone) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API_URL}/admin/zones/${modal.zone.id}`, { headers: authHeader() });
      showToast('Zona eliminada correctamente');
      setModal(null);
      loadZones();
    } catch { showToast('Error al eliminar zona', 'error'); } finally { setSubmitting(false); }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (modal?.type === 'create') {
        await axios.post(`${API_URL}/admin/zones`, formData, { headers: authHeader() });
        showToast('Zona creada correctamente');
      } else if (modal?.type === 'edit' && modal.zone) {
        await axios.put(`${API_URL}/admin/zones/${modal.zone.id}`, formData, { headers: authHeader() });
        showToast('Zona actualizada correctamente');
      }
      setModal(null);
      loadZones();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Error al guardar', 'error');
    } finally { setSubmitting(false); }
  };

  const handlePromoteUser = async (userId: string, field: 'role' | 'plan', value: string) => {
    try {
      await axios.put(`${API_URL}/admin/users/${userId}`, { [field]: value }, { headers: authHeader() });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
      showToast('Usuario actualizado');
    } catch { showToast('Error al actualizar usuario', 'error'); }
  };
  const handleCreateImpact = async () => {
    setImpactSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/admin/impact`, {
        name: impactForm.name,
        type: impactForm.type,
        description: impactForm.description,
        latitude: impactForm.latitude ? parseFloat(impactForm.latitude) : null,
        longitude: impactForm.longitude ? parseFloat(impactForm.longitude) : null,
        radiusKm: parseFloat(impactForm.radiusKm),
        impactScore: parseFloat(impactForm.impactScore),
      }, { headers: authHeader() });
      setImpactFactors(prev => [res.data, ...prev]);
      setImpactModal(false);
      setImpactForm({ name: '', type: 'MALL', description: '', latitude: '', longitude: '', radiusKm: '1.0', impactScore: '1.10' });
      showToast('Factor de impacto creado');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Error al crear factor', 'error');
    } finally {
      setImpactSubmitting(false);
    }
  };

  const handleDeleteImpact = async (id: string) => {
    if (!confirm('¿Eliminar este factor de impacto?')) return;
    try {
      await axios.delete(`${API_URL}/admin/impact/${id}`, { headers: authHeader() });
      setImpactFactors(prev => prev.filter(f => f.id !== id));
      showToast('Factor eliminado');
    } catch { showToast('Error al eliminar', 'error'); }
  };

  if (authorized === null) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
    </div>
  );

  if (authorized === false) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
        <ShieldCheck size={36} className="text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Acceso Denegado</h1>
      <p className="text-slate-500">Esta sección requiere rol <strong>ADMIN</strong>.</p>
      <a href="/dashboard" className="text-primary font-bold hover:underline">← Volver al Panel</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
          >
            {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 text-white pt-6 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Panel de Administración</h1>
              <p className="text-slate-400 text-sm">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab cards */}
      <div className="max-w-6xl mx-auto px-4 -mt-10">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(['stats', 'zones', 'users', 'predictive'] as const).map((t) => {
            const Icon = TAB_ICONS[t];
            const labels: Record<string, string> = { stats: 'Estadísticas', zones: 'Zonas', users: 'Usuarios', predictive: 'Predictivo' };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-2xl p-5 text-left transition-all flex items-center gap-3 border ${tab === t ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-white text-slate-700 border-slate-100 hover:border-primary/20 shadow-sm'}`}
              >
                <Icon size={22} />
                <span className="font-bold">{labels[t]}</span>
                {t === 'zones' && stats && <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${tab === t ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{stats.totalZones}</span>}
                {t === 'predictive' && impactFactors.length > 0 && <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${tab === t ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{impactFactors.length}</span>}
              </button>
            );
          })}
        </div>

        {/* STATS TAB */}
        {tab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Zonas',       value: stats.totalZones.toLocaleString(), color: 'text-primary' },
                { label: 'Total Usuarios',     value: stats.totalUsers,                  color: 'text-secondary' },
                { label: 'Zonas Urbanas',      value: stats.urbanas.toLocaleString(),    color: 'text-emerald-600' },
                { label: 'Zonas Rurales',      value: stats.rurales.toLocaleString(),    color: 'text-indigo-600' },
                { label: 'Consultas este mes', value: (stats.consultasEsteMes ?? 0).toLocaleString(), color: 'text-amber-600' },
                { label: 'Reportes este mes',  value: (stats.reportesEsteMes ?? 0).toLocaleString(),  color: 'text-rose-600' },
                { label: 'Factores Impacto',   value: (stats.impactFactors ?? 0).toLocaleString(),    color: 'text-violet-600' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
                  <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2"><MapPin size={16} className="text-primary" /> Top 10 Provincias por registros</h3>
              <div className="space-y-3">
                {stats.byProvincia.map((p: any) => (
                  <div key={p.provincia} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 w-44 truncate">{p.provincia}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(p._count._all / stats.totalZones) * 100 * 3}%`, maxWidth: '100%' }} />
                    </div>
                    <span className="text-sm font-black text-primary w-12 text-right">{p._count._all}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ZONES TAB */}
        {tab === 'zones' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-4 py-2.5 w-full sm:w-80 shadow-sm">
                <Search size={16} className="text-slate-400" />
                <input
                  className="bg-transparent outline-none text-sm flex-1"
                  placeholder="Buscar sector, municipio..."
                  value={zoneSearch}
                  onChange={e => { setZoneSearch(e.target.value); setPage(1); }}
                />
              </div>
              <button
                onClick={() => { setFormData({ zona: 'Urbana' }); setModal({ type: 'create' }); }}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-opacity-90 transition shadow-lg shadow-primary/20"
              >
                <Plus size={16} /> Nueva Zona
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {zonesLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Provincia</th>
                          <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Municipio</th>
                          <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Sector</th>
                          <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Zona</th>
                          <th className="text-right px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Valor m²</th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {zones.map((z) => (
                          <motion.tr key={z.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-3 font-medium text-slate-700">{z.provincia}</td>
                            <td className="px-3 py-3 text-slate-600">{z.municipio}</td>
                            <td className="px-3 py-3 text-slate-600 max-w-[180px] truncate">{z.sector || <span className="text-slate-300 italic">Sin sector</span>}</td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${z.zona === 'Urbana' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{z.zona}</span>
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-primary">
                              {z.valorPromedio ? `RD$ ${z.valorPromedio.toLocaleString()}` : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => { setFormData({ ...z }); setModal({ type: 'edit', zone: z }); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50 transition"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setModal({ type: 'delete', zone: z })}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">{total.toLocaleString()} zonas en total</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-100 disabled:opacity-40 hover:bg-slate-50 transition">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-medium text-slate-600">{page} / {pages}</span>
                      <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg border border-slate-100 disabled:opacity-40 hover:bg-slate-50 transition">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* PREDICTIVE TAB */}
        {tab === 'predictive' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-xl text-amber-700"><Zap size={24} /></div>
              <div>
                <h3 className="font-bold text-amber-900">Configuración del Modelo Predictivo</h3>
                <p className="text-sm text-amber-700/80 leading-relaxed max-w-2xl">
                  Registra infraestructuras críticas que afectan el valor inmobiliario. El sistema utilizará estos puntos para calcular 
                  plusvalías automáticas en un radio determinado (ej. impacto de un nuevo Mall).
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <h4 className="font-bold text-slate-700">Factores de Impacto Registrados</h4>
                <button 
                   onClick={() => setImpactModal(true)}
                   className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-bold hover:bg-opacity-90 transition flex items-center gap-1"
                ><Plus size={13} /> Añadir Factor</button>
              </div>
              {factorsLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                        <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Radio (km)</th>
                        <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Multiplicador</th>
                        <th className="px-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {impactFactors.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">No hay factores registrados. Comienza añadiendo un Mall o Carretera.</td></tr>
                      ) : (
                        impactFactors.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-3 font-medium text-slate-700">{f.name}</td>
                            <td className="px-3 py-3"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{f.type}</span></td>
                            <td className="px-3 py-3 font-bold text-slate-600">{f.radiusKm} km</td>
                            <td className="px-3 py-3 font-bold text-emerald-600">x{f.impactScore}</td>
                            <td className="px-3 text-right">
                               <button onClick={() => handleDeleteImpact(f.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
                      <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Rol</th>
                      <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Plan</th>
                      <th className="text-left px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3 font-medium text-slate-700">{u.email}</td>
                        <td className="px-3 py-3">
                          <select
                            value={u.role}
                            onChange={e => handlePromoteUser(u.id, 'role', e.target.value)}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${u.role === 'ADMIN' ? 'bg-amber-50 text-amber-700 border-amber-200' : u.role === 'PRO' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                          >
                            <option>FREE</option>
                            <option>PRO</option>
                            <option>ADMIN</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={u.plan}
                            onChange={e => handlePromoteUser(u.id, 'plan', e.target.value)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200 outline-none cursor-pointer bg-slate-50 text-slate-600"
                          >
                            <option>FREE</option>
                            <option>BASIC</option>
                            <option>PROFESSIONAL</option>
                            <option>ENTERPRISE</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString('es-DO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Impact Factor */}
      <AnimatePresence>
        {impactModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800">Nuevo Factor de Impacto</h2>
                <button onClick={() => setImpactModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nombre *</label>
                  <input value={impactForm.name} onChange={e => setImpactForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: BlueMall Santo Domingo" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary/40 bg-slate-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Tipo *</label>
                  <select value={impactForm.type} onChange={e => setImpactForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:bg-white focus:border-primary/40 transition">
                    {['MALL','HOSPITAL','UNIVERSITY','PARK','HIGHWAY','INDUSTRIAL_PARK','BEACH','AIRPORT','SCHOOL','GOVERNMENT'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Radio (km)</label>
                  <input type="number" step="0.1" value={impactForm.radiusKm} onChange={e => setImpactForm(p => ({ ...p, radiusKm: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary/40 bg-slate-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Latitud</label>
                  <input type="number" step="any" value={impactForm.latitude} onChange={e => setImpactForm(p => ({ ...p, latitude: e.target.value }))} placeholder="18.4716" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary/40 bg-slate-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Longitud</label>
                  <input type="number" step="any" value={impactForm.longitude} onChange={e => setImpactForm(p => ({ ...p, longitude: e.target.value }))} placeholder="-69.9366" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary/40 bg-slate-50 focus:bg-white transition" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Multiplicador de impacto</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0.5" max="2.0" step="0.01" value={impactForm.impactScore} onChange={e => setImpactForm(p => ({ ...p, impactScore: e.target.value }))} className="flex-1" />
                    <span className={`text-lg font-black w-16 text-right ${parseFloat(impactForm.impactScore) >= 1 ? 'text-emerald-600' : 'text-red-500'}`}>x{parseFloat(impactForm.impactScore).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{parseFloat(impactForm.impactScore) > 1 ? `+${((parseFloat(impactForm.impactScore)-1)*100).toFixed(0)}% plusvalía en radio` : parseFloat(impactForm.impactScore) < 1 ? `-${((1-parseFloat(impactForm.impactScore))*100).toFixed(0)}% impacto negativo` : 'Neutro — sin efecto en precio'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Descripción (opcional)</label>
                  <input value={impactForm.description} onChange={e => setImpactForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción breve del factor..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary/40 bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setImpactModal(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={handleCreateImpact} disabled={impactSubmitting || !impactForm.name} className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition disabled:opacity-60">
                  {impactSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} Crear Factor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Create/Edit */}
      <AnimatePresence>
        {modal && modal.type !== 'delete' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800">{modal.type === 'create' ? 'Nueva Zona' : 'Editar Zona'}</h2>
                <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-slate-100 transition"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'provincia', label: 'Provincia', required: true },
                  { key: 'municipio', label: 'Municipio', required: true },
                  { key: 'sector', label: 'Sector' },
                  { key: 'seccion', label: 'Sección' },
                  { key: 'codigo', label: 'Código' },
                  { key: 'valorPromedio', label: 'Valor m² (RD$)', type: 'number' },
                ].map(f => (
                  <div key={f.key} className={f.key === 'provincia' || f.key === 'municipio' ? 'col-span-1' : 'col-span-1'}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">{f.label}{f.required && ' *'}</label>
                    <input
                      type={f.type || 'text'}
                      value={(formData as any)[f.key] ?? ''}
                      onChange={e => setFormData(prev => ({ ...prev, [f.key]: f.type === 'number' ? e.target.value : e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary/40 bg-slate-50 focus:bg-white transition"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Zona *</label>
                  <div className="flex gap-2">
                    {['Urbana', 'Rural'].map(z => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, zona: z }))}
                        className={`flex-1 py-2 rounded-xl border text-sm font-bold transition ${formData.zona === z ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:border-primary/30'}`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={handleSave} disabled={submitting} className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition disabled:opacity-60">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {modal.type === 'create' ? 'Crear Zona' : 'Guardar Cambios'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL: Delete */}
        {modal?.type === 'delete' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={28} className="text-red-500" /></div>
              <h2 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Zona?</h2>
              <p className="text-slate-500 text-sm mb-6"><strong>{modal.zone?.sector || modal.zone?.municipio}</strong> — Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={handleDelete} disabled={submitting} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition disabled:opacity-60">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
