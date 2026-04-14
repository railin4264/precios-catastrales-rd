'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, Download, ChevronDown, ChevronUp, Route, 
  Home as HomeIcon, Map as MapIcon, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('./LocationMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center">
    <Loader2 className="animate-spin text-slate-400" />
  </div>
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Centroides por provincia para fallback cuando no hay coordenadas geocodificadas
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'distrito nacional':      [18.4861, -69.9312],
  'santo domingo':          [18.5001, -69.8887],
  'santo domingo este':     [18.4896, -69.8599],
  'santo domingo norte':    [18.5393, -69.9180],
  'santo domingo oeste':    [18.5057, -70.0092],
  'los alcarrizos':         [18.5210, -70.0470],
  'pedro brand':            [18.5540, -70.0940],
  'boca chica':             [18.4474, -69.6063],
  'san antonio de guerra':  [18.6150, -69.7620],
  'santiago':               [19.4517, -70.6970],
  'espaillat':              [19.5873, -70.3777],
  'la vega':                [19.2210, -70.5296],
  'monseñor nouel':         [18.9220, -70.3890],
  'sanchez ramirez':        [19.0530, -70.1490],
  'duarte':                 [19.3009, -70.0000],
  'maria trinidad sanchez': [19.4300, -69.9500],
  'valverde':               [19.5850, -71.0760],
  'monte cristi':           [19.8620, -71.6530],
  'dajabon':                [19.5480, -71.7090],
  'el seibo':               [18.7659, -69.0388],
  'hato mayor':             [18.7630, -69.2560],
  'la altagracia':          [18.6220, -68.7074],
  'la romana':              [18.4274, -68.9728],
  'san pedro de macoris':   [18.4541, -69.3050],
  'monte plata':            [18.8065, -69.7826],
  'samana':                 [19.2059, -69.3365],
  'san cristobal':          [18.4182, -70.1066],
  'peravia':                [18.2759, -70.3313],
  'san jose de ocoa':       [18.5430, -70.5060],
  'azua':                   [18.4530, -70.7347],
  'san juan':               [18.8060, -71.2290],
  'elias pina':             [18.8750, -71.7060],
  'barahona':               [18.2030, -71.0994],
  'bahoruco':               [18.4900, -71.4250],
  'independencia':          [18.4960, -71.8560],
  'pedernales':             [18.0380, -71.7440],
};

function getInitialCoords(item: any): { lat: number; lng: number } {
  // 1. Usar coordenadas geocodificadas del item si existen
  if (item.lat && item.lng) return { lat: item.lat, lng: item.lng };
  // 2. Buscar centroide de la provincia
  const key = (item.provincia || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const coords = PROVINCE_COORDS[key];
  if (coords) return { lat: coords[0], lng: coords[1] };
  // 3. Fallback Santo Domingo
  return { lat: 18.4861, lng: -69.9312 };
}

export default function ResultCard({ item, idx }: { item: any; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [valuation, setValuation] = useState<any>(null);
  const [valLoading, setValLoading] = useState(false);
  const [coords, setCoords] = useState(() => getInitialCoords(item));
  const [m2, setM2] = useState<number>(0);
  const [calcOverride, setCalcOverride] = useState<{ price: number; name: string } | null>(null);

  // Handle location update from map
  const handleLocationChange = (lat: number, lng: number) => {
    setCoords({ lat, lng });
  };

  const fetchValuation = async () => {
    if (!item.valorPromedio) return;
    setValLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/evaluate/${item.id}?lat=${coords.lat}&lng=${coords.lng}`);
      setValuation(res.data);
    } catch (err) {
      console.error("Valuation error:", err);
    } finally {
      setValLoading(false);
    }
  };

  // Initial valuation — solo si tiene valor base y con delay escalonado por índice
  useEffect(() => {
    if (!item.valorPromedio) return;
    const delay = idx * 150; // escalonar requests: 0ms, 150ms, 300ms...
    const timer = setTimeout(() => fetchValuation(), delay);
    return () => clearTimeout(timer);
  }, [item.id, item.valorPromedio]);

  // Update valuation when coordinates change (debounced or on trigger)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showMap) fetchValuation();
    }, 500);
    return () => clearTimeout(timer);
  }, [coords, showMap]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden"
    >
      <div className="p-8 md:p-10">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${item.zona === 'Rural' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-primary'}`}>
                {item.zona || 'Urbana'}
              </span>
              <span className="text-slate-300">|</span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Código: {item.codigo || 'N/A'}</p>
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">
              {item.sector || item.seccion || item.municipio}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium text-lg">
              <div className="flex items-center gap-1.5">
                <MapPin size={20} className="text-secondary" /> {item.provincia}, {item.municipio}
              </div>
              {(item.geocodingPrecision === 'approximate' || !item.lat) && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200">
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  Ubicación Aproximada
                </span>
              )}
              {item.geocodingPrecision === 'exact' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-green-100">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  Ubicación Verificada
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 min-w-[200px] text-center md:text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Valor Oficial</p>
              <div className="flex items-baseline justify-center md:justify-end gap-1">
                {item.valorPromedio ? (
                  <>
                    <span className="text-sm font-bold text-slate-400">RD$</span>
                    <span className="text-3xl font-black text-slate-600 tracking-tighter">
                      {item.valorPromedio.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-black text-slate-400 tracking-tight">N/A</span>
                )}
              </div>
            </div>

            {valuation && (
              <motion.div 
                layout
                className="bg-primary/5 p-6 rounded-3xl border border-primary/10 min-w-[240px] text-center md:text-right relative overflow-hidden"
              >
                {valLoading && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary w-5 h-5" />
                  </div>
                )}
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Valor Proyectado (IA)</p>
                <div className="flex items-baseline justify-center md:justify-end gap-1">
                  <span className="text-sm font-bold text-primary">RD$</span>
                  <span className="text-5xl font-black text-primary tracking-tighter">
                    {valuation.projectedValue.toLocaleString()}
                  </span>
                </div>
                <p className={`text-[10px] font-bold mt-1 ${valuation.totalAdjustment > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {valuation.totalAdjustment > 0 ? '+' : ''}{valuation.totalAdjustment}% por {valuation.appliedFactors.length} factores proximidad
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            onClick={() => setShowMap(!showMap)}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${showMap ? 'bg-secondary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <MapIcon size={18} />
            {showMap ? 'Cerrar Mapa' : 'Refinar Ubicación'}
          </button>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:border-primary/20 hover:text-primary transition-all flex items-center gap-2"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {expanded ? 'Ocultar Información' : 'Información Técnica'}
          </button>
          <button 
            onClick={() => window.open(`${API_URL}/api/reports/generate/${item.id}`, '_blank')}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-opacity-95 transition-all flex items-center gap-2"
          >
            <Download size={18} /> Descargar Reporte PDF
          </button>
        </div>

        {/* CALCULATOR SECTION */}
        <div id={`calc-${item.id}`} className="mb-8 p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                   <HomeIcon size={16} className="text-white" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-400">Calculadora de Valor</h4>
              </div>
              <p className="text-slate-400 text-xs font-medium mb-6 leading-relaxed">
                Introduce el área de tu propiedad para calcular una estimación de mercado basada en los valores de la zona.
              </p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Superficie (m²)</label>
                    <span className="text-xl font-black text-white">{m2.toLocaleString()} <span className="text-xs text-slate-500">m²</span></span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="5000" 
                    step="10"
                    value={m2}
                    onChange={(e) => setM2(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between mt-2 text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                    <span>0 m²</span>
                    <span>2,500 m²</span>
                    <span>5,000+ m²</span>
                  </div>
                </div>

                <div className="relative group">
                  <input 
                    type="number" 
                    placeholder="Cantidad exacta..."
                    value={m2 || ''}
                    onChange={(e) => setM2(Number(e.target.value))}
                    className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl outline-none focus:border-blue-500/50 transition font-bold text-white placeholder:text-slate-600 no-spinners"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">Input Manual</div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Valor Estimado Total</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-black text-blue-400">RD$</span>
                <motion.span 
                  key={`${m2}-${calcOverride?.price}`}
                  initial={{ scale: 1.1, color: '#60a5fa' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-5xl md:text-6xl font-black tracking-tighter"
                >
                  {((calcOverride?.price || valuation?.projectedValue || item.valorPromedio || 0) * m2).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </motion.span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <p className="text-[10px] font-bold text-blue-300">
                    Basado en: {calcOverride ? `Sub-sector: ${calcOverride.name}` : (valuation ? 'Valor Proyectado IA' : 'Valor Oficial')} 
                    (RD$ {(calcOverride?.price || valuation?.projectedValue || item.valorPromedio || 0).toLocaleString()} / m²)
                  </p>
                </div>
                {calcOverride && (
                  <button 
                    onClick={() => setCalcOverride(null)}
                    className="text-[9px] font-black text-blue-400/60 hover:text-blue-400 uppercase tracking-widest transition"
                  >
                    Restablecer a Valor General
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mb-8"
            >
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                   <MapPin size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-0.5">Ubicación No Verificada</p>
                  <p className="text-[11px] text-blue-600/80 leading-relaxed">
                    Este sector no tiene coordenadas exactas en la base de datos oficial. 
                    <b> Arrastra el marcador azul</b> al punto exacto de tu propiedad para obtener una valoración precisa basada en el entorno.
                  </p>
                </div>
              </div>
              <div className="p-1 bg-slate-100 rounded-[1.6rem] overflow-hidden" style={{ height: '462px' }}>
                <LocationMap
                  initialLat={coords.lat}
                  initialLng={coords.lng}
                  factors={valuation?.appliedFactors || []}
                  provincia={item.provincia}
                  onLocationChange={handleLocationChange}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-3 italic text-center px-10">
                Arrastra el marcador azul a la ubicación exacta. El heatmap muestra la densidad de valor m² de la provincia — azul=bajo, rojo=alto. Los puntos de colores son factores de impacto cercanos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-50 pt-8"
            >
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div> Límites Oficiales
                  </h4>
                  <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-50">
                    {['norte', 'sur', 'este', 'oeste'].map((dir) => (
                      <div key={dir} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-bold capitalize w-16">{dir}:</span>
                        <span className="text-slate-700 font-medium text-right flex-1 truncate ml-4">
                          {item.limites?.[dir] || 'No especificado'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase text-slate-800 tracking-widest mb-6 flex items-center gap-2">
                    <HomeIcon size={18} className="text-primary" /> 
                    Subsectores y Parajes
                  </h4>
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 max-h-[250px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      {((item.subsectores && item.subsectores.length > 0) || (item.parajes && item.parajes.length > 0)) ? (
                        (item.subsectores && item.subsectores.length > 0 ? item.subsectores : item.parajes).map((sub: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 hover:bg-white rounded-xl transition group">
                            <span className="text-slate-600 font-medium group-hover:text-slate-900 transition">{sub.nombre}</span>
                            <div className="flex items-center gap-4 group-hover:scale-105 transition origin-right">
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-slate-400">RD$</span>
                                  <span className="text-lg font-black text-primary">{sub.valor ? sub.valor.toLocaleString() : '---'}</span>
                                </div>
                              </div>
                              {sub.valor && (
                                <button 
                                  onClick={() => {
                                    setCalcOverride({ price: sub.valor, name: sub.nombre });
                                    setM2(m2 || 100); // Default to something if 0
                                    // Scroll to calculator
                                    document.getElementById(`calc-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  Calcular
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-4 italic">No se encontraron subsectores detallados.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50">
                   <h4 className="text-sm font-black uppercase text-slate-800 tracking-widest mb-6 flex items-center gap-2">
                    <Route size={18} className="text-primary" /> Vías Principales de Acceso
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {item.viasPrincipales?.length > 0 ? (
                      item.viasPrincipales.map((via: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-50 hover:bg-white border border-slate-100 rounded-2xl transition group">
                          <span className="text-slate-600 text-xs font-semibold block mb-1">{via.nombre}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase font-black">Ref: </span>
                            <span className="text-sm font-black text-secondary">RD$ {via.valor ? via.valor.toLocaleString() : '---'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-3 text-center py-4 text-slate-400 italic text-sm">No hay vías detalladas para este sector.</div>
                    )}
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-[10px] text-slate-400 italic">
          * Los valores presentados son referenciales según la Resolución vigente y deben ser validados ante la DGCN para fines legales. El valor proyectado es una estimación basada en factores geográficos.
        </div>
      </div>
    </motion.div>
  );
}
