'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Key, Send, ChevronDown, ChevronUp, Copy, Check,
  Globe, Lock, Zap, BookOpen, Terminal, Shield, AlertCircle
} from 'lucide-react';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/provincias',
    title: 'Listar Provincias',
    description: 'Retorna la lista completa de provincias disponibles en la base de datos catastral.',
    params: [],
    example: `curl "${BASE_URL}/provincias"`,
    response: `["Azua","Bahoruco","Barahona","Distrito Nacional","Duarte","Santiago","Santo Domingo","..."]`,
    tag: 'Consultas',
  },
  {
    method: 'GET',
    path: '/api/municipios',
    title: 'Listar Municipios',
    description: 'Retorna los municipios de una provincia específica.',
    params: [{ name: 'provincia', type: 'string', required: true, desc: 'Nombre exacto de la provincia' }],
    example: `curl "${BASE_URL}/municipios?provincia=Santiago"`,
    response: `["Bisonó","Jánico","Licey al Medio","Puñal","Sabana Iglesia","Santiago","Santiago Oeste","Villa González"]`,
    tag: 'Consultas',
  },
  {
    method: 'GET',
    path: '/api/buscar',
    title: 'Búsqueda Global',
    description: 'Búsqueda de texto libre en provincias, municipios, sectores y secciones. Máximo 500 resultados. Insensible a mayúsculas y acentos.',
    params: [{ name: 'q', type: 'string', required: true, desc: 'Término de búsqueda (sector, municipio, provincia, sección)' }],
    example: `curl "${BASE_URL}/buscar?q=ensanche%20naco"`,
    response: `[{ "id": "uuid", "provincia": "Distrito Nacional", "municipio": "Distrito Nacional", "zona": "Urbana", "sector": "ENSANCHE NACO", "valorPromedio": 45000, "subsectores": [...], "limites": {...}, "viasPrincipales": [...] }]`,
    tag: 'Consultas',
  },
  {
    method: 'GET',
    path: '/api/consulta',
    title: 'Consulta Avanzada (Filtros)',
    description: 'Consulta filtrada por provincia, municipio y sector con soporte de acentos e insensibilidad a mayúsculas.',
    params: [
      { name: 'provincia', type: 'string', required: false, desc: 'Nombre de la provincia' },
      { name: 'municipio', type: 'string', required: false, desc: 'Nombre del municipio' },
      { name: 'sector', type: 'string', required: false, desc: 'Nombre del sector (búsqueda parcial)' },
    ],
    example: `curl "${BASE_URL}/consulta?provincia=Azua&municipio=Azua%20de%20Compostela"`,
    response: `[{ "id": "uuid", "provincia": "Azua", "municipio": "Azua de Compostela", "zona": "Urbana", "codigo": "001", "sector": "EL CENTRO", "valorPromedio": 5000 }]`,
    tag: 'Consultas',
  },
  {
    method: 'GET',
    path: '/api/reports/generate/:id',
    title: 'Generar Reporte PDF',
    description: 'Genera y descarga un reporte PDF completo con los datos catastrales del sector especificado.',
    params: [{ name: 'id', type: 'string (UUID)', required: true, desc: 'ID único de la zona catastral' }],
    example: `curl -o reporte.pdf "${BASE_URL}/reports/generate/{zone-id}"`,
    response: `Binary PDF file (application/pdf)`,
    tag: 'Reportes',
  },
  {
    method: 'POST',
    path: '/api/keys',
    title: 'Crear API Key',
    description: 'Genera una nueva llave de API para integraciones B2B. Requiere autenticación JWT (plan PRO o ENTERPRISE).',
    params: [{ name: 'name', type: 'string', required: true, desc: 'Nombre descriptivo para la API Key' }],
    example: `curl -X POST "${BASE_URL}/keys" \\\n  -H "Authorization: Bearer <JWT_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Mi App Inmobiliaria"}'`,
    response: `{ "id": "uuid", "name": "Mi App Inmobiliaria", "key": "sk_cat_abc123...", "note": "Save this key now." }`,
    tag: 'Autenticación',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/keys',
    title: 'Listar API Keys',
    description: 'Lista todas las API Keys del usuario autenticado (sin mostrar el valor real de la llave).',
    params: [],
    example: `curl "${BASE_URL}/keys" \\\n  -H "Authorization: Bearer <JWT_TOKEN>"`,
    response: `[{ "id": "uuid", "name": "Mi App Inmobiliaria", "createdAt": "2026-04-13T..." }]`,
    tag: 'Autenticación',
    auth: true,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border border-red-200',
};

const TAG_COLORS: Record<string, string> = {
  Consultas: 'text-primary bg-blue-50',
  Reportes: 'text-indigo-600 bg-indigo-50',
  Autenticación: 'text-amber-700 bg-amber-50',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white/60 hover:text-white">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function EndpointCard({ endpoint }: { endpoint: typeof ENDPOINTS[0] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      let url = `http://localhost:4000${endpoint.path.replace('/:id', '/test-id')}`;
      const queryParams = Object.entries(testParams).filter(([_, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      if (queryParams && endpoint.method === 'GET') url += `?${queryParams}`;

      const res = await fetch(url, {
        method: endpoint.method,
        headers: endpoint.auth ? { 'Authorization': 'Bearer <your-token>' } : {},
        body: endpoint.method === 'POST' ? JSON.stringify(testParams) : undefined,
      });
      const data = await res.json();
      const sliced = Array.isArray(data) ? data.slice(0, 3) : data;
      setResult(JSON.stringify(sliced, null, 2));
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border border-slate-100 bg-white shadow-md shadow-slate-100/80 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 transition"
      >
        <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide uppercase ${METHOD_COLORS[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="flex-1 text-sm font-mono text-slate-700">{endpoint.path}</code>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${TAG_COLORS[endpoint.tag]}`}>{endpoint.tag}</span>
        {endpoint.auth && <Lock size={14} className="text-amber-500" />}
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Description & Params */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{endpoint.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{endpoint.description}</p>

                {endpoint.auth && (
                  <div className="flex items-center gap-2 mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
                    <Shield size={14} />
                    Requiere JWT: <code className="bg-amber-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
                  </div>
                )}

                {endpoint.params.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Parámetros</h4>
                    <div className="space-y-3">
                      {endpoint.params.map((p) => (
                        <div key={p.name} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-lg">{p.name}</code>
                            <span className="text-xs text-slate-400 font-mono">{p.type}</span>
                            {p.required && <span className="text-[10px] text-red-500 font-bold uppercase">Requerido</span>}
                          </div>
                          <p className="text-xs text-slate-500 pl-1">{p.desc}</p>
                          <input
                            type="text"
                            placeholder={`Valor de ${p.name}...`}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-primary/30 focus:bg-white transition"
                            value={testParams[p.name] || ''}
                            onChange={(e) => setTestParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={runTest}
                      disabled={loading}
                      className="mt-5 flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-opacity-90 transition disabled:opacity-60"
                    >
                      <Send size={14} />
                      {loading ? 'Ejecutando...' : 'Probar Endpoint'}
                    </button>
                  </div>
                )}

                {endpoint.params.length === 0 && (
                   <button
                    onClick={runTest}
                    disabled={loading}
                    className="mt-2 flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-opacity-90 transition disabled:opacity-60"
                  >
                    <Send size={14} />
                    {loading ? 'Ejecutando...' : 'Probar Endpoint'}
                  </button>
                )}
              </div>

              {/* Right: Code & Response */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Ejemplo cURL</h4>
                    <CopyButton text={endpoint.example} />
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto">
                    <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">{endpoint.example}</pre>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {result ? 'Respuesta Real' : 'Respuesta Esperada'}
                    </h4>
                    {result && <CopyButton text={result} />}
                  </div>
                  <div className={`bg-slate-900 rounded-2xl p-4 overflow-x-auto max-h-52 overflow-y-auto ${result ? 'ring-2 ring-emerald-500/30' : ''}`}>
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {result || endpoint.response}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ApiDocsPage() {
  const [filter, setFilter] = useState('Todos');
  const tags = ['Todos', 'Consultas', 'Reportes', 'Autenticación'];

  const filtered = filter === 'Todos' ? ENDPOINTS : ENDPOINTS.filter((e) => e.tag === filter);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Code2 size={14} /> REST API v1.0
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
            Documentación de <span className="text-primary">API</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Integra los datos catastrales de la República Dominicana directamente en tus aplicaciones inmobiliarias, plataformas de tasación o herramientas de análisis.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
              <Globe size={16} className="text-primary" />
              Base URL: <code className="font-mono text-primary ml-1">http://localhost:4000/api</code>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
              <Zap size={16} className="text-secondary" /> Formato: JSON
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-sm font-medium text-slate-600">
              <Shield size={16} className="text-amber-500" /> Auth: JWT Bearer
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="max-w-5xl mx-auto px-4 -mt-0 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registros', value: '2,452', icon: <BookOpen size={20} />, color: 'text-primary' },
          { label: 'Provincias', value: '29', icon: <Globe size={20} />, color: 'text-secondary' },
          { label: 'Endpoints', value: '7', icon: <Terminal size={20} />, color: 'text-indigo-500' },
          { label: 'Formato', value: 'JSON', icon: <Code2 size={20} />, color: 'text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
            <div className="text-2xl font-black text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Auth Info */}
      <section className="max-w-5xl mx-auto px-4 mb-10">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Key size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-1">Autenticación</h3>
              <p className="text-sm text-slate-600 mb-3">
                Los endpoints públicos no requieren autenticación. Para endpoints protegidos (generación de API Keys), incluye el token JWT en el header:
              </p>
              <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                <code className="text-xs font-mono text-emerald-400">Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</code>
                <CopyButton text="Authorization: Bearer <your-jwt-token>" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle size={13} />
                Los planes PRO y ENTERPRISE incluyen acceso a llaves de API para integraciones B2B.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-5xl mx-auto px-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === tag
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white border border-slate-100 text-slate-600 hover:border-primary/30 hover:text-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Endpoints */}
      <section className="max-w-5xl mx-auto px-4 pb-16 space-y-4">
        <AnimatePresence>
          {filtered.map((endpoint, i) => (
            <motion.div
              key={endpoint.path + endpoint.method}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.05 }}
            >
              <EndpointCard endpoint={endpoint} />
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      {/* Code Examples Section */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-black text-white mb-2">Ejemplos de Integración</h2>
          <p className="text-slate-400 mb-8">Copia y pega estos snippets en tu proyecto.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                lang: 'JavaScript / fetch',
                color: 'text-yellow-400',
                code: `const response = await fetch(
  'http://localhost:4000/api/buscar?q=Naco'
);
const zonas = await response.json();
console.log(zonas[0].valorPromedio); // 45000`,
              },
              {
                lang: 'Python / requests',
                color: 'text-blue-400',
                code: `import requests

r = requests.get(
    'http://localhost:4000/api/consulta',
    params={'provincia': 'Santiago', 'municipio': 'Santiago'}
)
data = r.json()
print(data[0]['valorPromedio'])`,
              },
            ].map((ex) => (
              <div key={ex.lang} className="bg-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-black uppercase tracking-widest ${ex.color}`}>{ex.lang}</span>
                  <CopyButton text={ex.code} />
                </div>
                <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">{ex.code}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
