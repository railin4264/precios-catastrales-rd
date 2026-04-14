'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Download, ArrowRight, Database, 
  Loader2, AlertCircle, Filter, X, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ResultCard from '../components/ResultCard';
import { FeatureCard, PricingCard } from '../components/HomeComponents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedMuni, setSelectedMuni] = useState('');

  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/provincias`);
        setProvincias(res.data);
      } catch (err: any) {
        console.error('Error fetching provincias:', err);
        setError(`Error inicial: ${err.message}. Verifica que el backend esté en ${API_URL}`);
      }
    };
    fetchProvincias();
  }, []);

  useEffect(() => {
    const fetchMunicipios = async () => {
      if (!selectedProv) {
        setMunicipios([]);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/api/municipios?provincia=${encodeURIComponent(selectedProv)}`);
        setMunicipios(res.data);
      } catch (err) {
        console.error('Error fetching municipios:', err);
      }
    };
    fetchMunicipios();
    setSelectedMuni('');
  }, [selectedProv]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!search.trim() && !selectedProv) return;

    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/api/buscar?q=${encodeURIComponent(search)}`;
      
      if (selectedProv) {
        url = `${API_URL}/api/consulta?provincia=${encodeURIComponent(selectedProv)}`;
        if (selectedMuni) url += `&municipio=${encodeURIComponent(selectedMuni)}`;
        if (search) url += `&sector=${encodeURIComponent(search)}`;
      }

      const response = await axios.get(url);
      setResults(response.data);
      
      if (response.data.length === 0) {
        setError('No se encontraron resultados para los criterios seleccionados.');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Error al conectar con el servidor: ${err.message || 'Verifica que el backend esté corriendo'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedProv('');
    setSelectedMuni('');
    setSearch('');
  };

  return (
    <div className="bg-white min-h-screen">
      <section className={`relative transition-all duration-700 ${results.length > 0 ? 'h-[40vh] py-10' : 'h-[75vh]'} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-slate-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 text-center">
          <AnimatePresence>
            {results.length === 0 && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
                  Valuación Catastral <br/>
                  <span className="text-blue-600">Inteligente en RD</span>
                </h1>
                <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">
                  Información oficial por m², reportes inmobiliarios y modelo predictivo basado en inteligencia geográfica.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full max-w-3xl mx-auto">
            <motion.form 
              onSubmit={handleSearch}
              layout
              className="p-2 glass rounded-[2rem] shadow-2xl flex flex-col md:flex-row gap-2 mb-4"
            >
              <div className="flex-1 flex items-center px-6 bg-white/50 rounded-2xl border border-white/50 focus-within:border-blue-500/30 transition">
                <Search className="text-slate-400 w-5 h-5 mr-3" />
                <input 
                  type="text" 
                  placeholder={selectedProv ? "Busca un sector..." : "Escribe un sector, ciudad o código..."} 
                  className="w-full py-5 bg-transparent outline-none text-slate-800 font-medium placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-5 rounded-2xl border-2 transition-all ${showFilters ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white/50 border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600'}`}
                >
                  <Filter size={24} />
                </button>
                <button 
                  disabled={loading}
                  className="flex-1 md:flex-none bg-blue-600 text-white px-10 py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all font-black text-lg disabled:opacity-70 shadow-lg shadow-blue-200"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Consultar'}
                  {!loading && <ArrowRight className="w-6 h-6" />}
                </button>
              </div>
            </motion.form>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="p-8 glass rounded-3xl shadow-xl border border-white/40 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Provincia</label>
                      <select 
                        value={selectedProv}
                        onChange={(e) => setSelectedProv(e.target.value)}
                        className="w-full p-4 bg-white/70 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition font-bold text-slate-700"
                      >
                        <option value="">Todas las Provincias</option>
                        {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Municipio</label>
                      <select 
                        value={selectedMuni}
                        onChange={(e) => setSelectedMuni(e.target.value)}
                        disabled={!selectedProv}
                        className="w-full p-4 bg-white/70 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition disabled:opacity-50 font-bold text-slate-700"
                      >
                        <option value="">Todos los Municipios</option>
                        {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end pt-2">
                       <button 
                        onClick={clearFilters}
                        className="text-xs font-black text-slate-400 hover:text-red-500 transition flex items-center gap-2 uppercase tracking-tighter"
                       >
                         <X size={16} /> Limpiar Búsqueda
                       </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {(results.length > 0 || error) && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-24 max-w-5xl mx-auto px-4"
          >
            {error ? (
              <div className="flex items-center gap-4 p-8 bg-red-50 text-red-700 rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-100/50">
                <AlertCircle className="w-8 h-8" />
                <p className="font-bold text-lg">{error}</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-10 px-6">
                  <h2 className="text-slate-800 font-black flex items-center gap-3 text-2xl tracking-tight">
                    <Database size={24} className="text-blue-500" />
                    Zonas Encontradas: <span className="text-blue-600">{results.length}</span>
                  </h2>
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Base de Datos Live</p>
                  </div>
                </div>
                <div className="space-y-12">
                  {results.map((item, idx) => (
                    <ResultCard key={item.id || idx} item={item} idx={idx} />
                  ))}
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {results.length === 0 && (
        <div className="space-y-0">
          <section className="py-32 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
              <FeatureCard 
                icon={<Database size={28} />}
                title="Sincronización Oficial"
                description="Acceso directo a la base de datos de valores catastrales actualizados según resoluciones vigentes."
                color="blue"
              />
              <FeatureCard 
                icon={<Download size={28} />}
                title="Generador de Reportes"
                description="Obtén documentos PDF profesionales con un solo clic, incluyendo factores de impacto y valoración proyectada."
                color="indigo"
              />
              <FeatureCard 
                icon={<ShieldCheck size={28} />}
                title="Validación Premium"
                description="Nuestra plataforma automatiza la limpieza y validación de datos para garantizar búsquedas precisas."
                color="emerald"
              />
            </div>
          </section>

          <section className="py-32 bg-white">
            <div className="max-w-7xl mx-auto px-6 text-center">
              <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Potenciando el Real Estate</span>
              <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Planes para Profesionales</h2>
              <p className="text-xl text-slate-500 mb-20 max-w-2xl mx-auto font-medium">Escalabilidad total para tasadores, agentes inmobiliarios y desarrolladores.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-stretch">
                <PricingCard 
                  plan="Consultor" 
                  price="0" 
                  features={['Consultas básicas diarias', 'Visualización geo-espacial', 'Acceso a filtros de búsqueda']} 
                />
                <PricingCard 
                  plan="Analista" 
                  price="1,200" 
                  popular 
                  features={['Búsquedas ilimitadas', 'Descarga masiva de reportes', 'Factores de impacto avanzados', 'Soporte prioritario 24/7']} 
                />
                <PricingCard 
                  plan="Enterprise" 
                  price="4,500" 
                  features={['Acceso Full API', 'Integración con CRM Propio', 'Dashboard de tendencias', 'Soporte vía WhatsApp']} 
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <footer className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500 font-black uppercase tracking-widest text-xs">© 2026 Cadastral Valuation SaaS • Santo Domingo, RD</p>
        </div>
      </footer>
    </div>
  );
}
