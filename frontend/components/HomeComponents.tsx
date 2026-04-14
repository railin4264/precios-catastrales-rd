'use client';

import { ShieldCheck } from 'lucide-react';

export function FeatureCard({ icon, title, description, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-shadow duration-300">
      <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}

export function PricingCard({ plan, price, features, popular }: any) {
  return (
    <div className={`p-8 rounded-[2.5rem] border ${popular ? 'border-primary ring-4 ring-primary/5 shadow-2xl relative' : 'border-slate-100 shadow-xl'} bg-white text-left flex flex-col h-full`}>
      {popular && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Más Popular</span>
      )}
      <h3 className="text-xl font-black text-slate-800 mb-2">{plan}</h3>
      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-sm font-bold text-slate-400">RD$</span>
        <span className="text-4xl font-black text-slate-800 leading-none">{price}</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">/ mes</span>
      </div>
      <ul className="space-y-4 mb-10 flex-1">
        {features.map((f: any, i: number) => (
          <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${popular ? 'bg-primary' : 'bg-slate-100'}`}>
              <ShieldCheck className={`w-3 h-3 ${popular ? 'text-white' : 'text-slate-400'}`} />
            </div>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => window.location.href = popular ? '/register' : '/register'}
        className={`w-full py-4 rounded-2xl font-black transition-all ${popular ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]' : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-100'}`}>
        Empezar Ahora
      </button>
    </div>
  );
}
