'use client';

import { useState, useEffect, useRef } from 'react';
import { Crosshair, ThermometerSun, MapPin } from 'lucide-react';

interface LocationMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  factors?: any[];
  provincia?: string;
}

type HeatPoint = [number, number, number];

declare global {
  interface Window { google: any; initCadastralMap: () => void; }
}

export default function LocationMap({
  initialLat = 18.4861,
  initialLng = -69.9312,
  onLocationChange,
  factors = [],
  provincia,
}: LocationMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const gmap       = useRef<any>(null);
  const marker     = useRef<any>(null);
  const heatLayer  = useRef<any>(null);
  const poiMarkers = useRef<any[]>([]);

  const [position,    setPosition]    = useState({ lat: initialLat, lng: initialLng });
  const [heatPoints,  setHeatPoints]  = useState<HeatPoint[]>([]);
  const [heatLoading, setHeatLoading] = useState(false);
  const [showHeat,    setShowHeat]    = useState(true);
  const [showPOI,     setShowPOI]     = useState(true);
  const [mapReady,    setMapReady]    = useState(false);

  const API_URL  = process.env.NEXT_PUBLIC_API_URL        || 'http://localhost:4000';
  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

  useEffect(() => {
    console.log('--- Google Maps debug ---');
    console.log('Key detected:', MAPS_KEY ? `${MAPS_KEY.substring(0, 10)}...` : 'EMPTY');
    if (!MAPS_KEY) console.warn('CRITICAL: NEXT_PUBLIC_GOOGLE_MAPS_KEY is empty in the environment.');
  }, [MAPS_KEY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.maps) { setMapReady(true); return; }
    window.initCadastralMap = () => setMapReady(true);
    if (!document.getElementById('gmaps-script')) {
      const s = document.createElement('script');
      s.id = 'gmaps-script';
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=visualization&callback=initCadastralMap`;
      s.async = true;
      document.head.appendChild(s);
    }
  }, [MAPS_KEY]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || gmap.current) return;
    const G = window.google.maps;
    gmap.current = new G.Map(mapRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 14,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    marker.current = new G.Marker({
      position: { lat: initialLat, lng: initialLng },
      map: gmap.current, draggable: true, title: 'Tu propiedad',
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new G.Size(40, 40) },
    });
    marker.current.addListener('dragend', (e: any) => {
      const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(p); onLocationChange(p.lat, p.lng);
    });
    gmap.current.addListener('click', (e: any) => {
      const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      marker.current.setPosition(p); setPosition(p); onLocationChange(p.lat, p.lng);
    });
  }, [mapReady, initialLat, initialLng, onLocationChange]);

  useEffect(() => {
    if (!gmap.current || !marker.current) return;
    const p = { lat: initialLat, lng: initialLng };
    marker.current.setPosition(p); gmap.current.panTo(p); setPosition(p);
  }, [initialLat, initialLng]);

  useEffect(() => {
    (async () => {
      setHeatLoading(true);
      try {
        const qs = provincia ? `?provincia=${encodeURIComponent(provincia)}` : '';
        const res = await fetch(`${API_URL}/api/heatmap${qs}`);
        setHeatPoints(await res.json());
      } catch (e) { console.error('Heatmap:', e); }
      finally { setHeatLoading(false); }
    })();
  }, [provincia, API_URL]);

  useEffect(() => {
    if (!mapReady || !gmap.current) return;
    heatLayer.current?.setMap(null);
    heatLayer.current = null;
    if (!showHeat || heatPoints.length === 0) return;
    heatLayer.current = new window.google.maps.visualization.HeatmapLayer({
      data: heatPoints.map(([lat, lng, w]) => ({
        location: new window.google.maps.LatLng(lat, lng), weight: w,
      })),
      map: gmap.current, radius: 30, opacity: 0.75,
      gradient: [
        'rgba(49,54,149,0)','rgba(49,54,149,1)','rgba(69,117,180,1)',
        'rgba(116,173,209,1)','rgba(254,224,144,1)',
        'rgba(244,109,67,1)','rgba(215,48,39,1)','rgba(165,0,38,1)',
      ],
    });
  }, [mapReady, heatPoints, showHeat]);

  useEffect(() => {
    if (!mapReady || !gmap.current) return;
    poiMarkers.current.forEach(m => m.setMap(null));
    poiMarkers.current = [];
    if (!showPOI) return;
    const G = window.google.maps;
    factors.filter(f => f.latitude != null && f.longitude != null).forEach(f => {
      const color = f.impactScore >= 1 ? '#10b981' : '#f43f5e';
      const m = new G.Marker({
        position: { lat: f.latitude, lng: f.longitude }, map: gmap.current, title: f.name,
        icon: { path: G.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 8 },
      });
      const info = new G.InfoWindow({ content:
        `<div style="font-family:sans-serif;min-width:140px;padding:4px">
          <p style="font-size:10px;text-transform:uppercase;color:#94a3b8;margin:0 0 2px">${f.type}</p>
          <p style="font-weight:700;margin:0 0 4px">${f.name}</p>
          <p style="font-size:11px;color:${color};margin:0">${f.impactScore >= 1 ? '+' : ''}${((f.impactScore - 1) * 100).toFixed(0)}% impacto</p>
          <p style="font-size:10px;color:#94a3b8;margin:2px 0 0">Radio: ${f.radiusKm ?? 1} km</p>
        </div>`,
      });
      m.addListener('click', () => info.open(gmap.current, m));
      poiMarkers.current.push(m);
    });
  }, [mapReady, factors, showPOI]);

  return (
    <div className="relative w-full h-[460px] rounded-[1.4rem] overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando mapa...</span>
        </div>
      )}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-slate-100 flex items-center gap-2">
          <Crosshair className="text-blue-500 w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button onClick={() => setShowHeat(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide shadow border transition-all ${showHeat ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/95 border-slate-100 text-slate-500'}`}>
          <ThermometerSun size={12} /> Heatmap
        </button>
        <button onClick={() => setShowPOI(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide shadow border transition-all ${showPOI ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/95 border-slate-100 text-slate-500'}`}>
          <MapPin size={12} /> POIs
        </button>
      </div>
      {heatLoading && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-slate-900/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /> Cargando heatmap...
          </div>
        </div>
      )}
      {showHeat && (
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Valor m²</p>
            <div className="w-28 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right,#313695,#4575b4,#74add1,#fee090,#f46d43,#a50026)' }} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-400 font-bold">Bajo</span>
              <span className="text-[9px] text-slate-400 font-bold">Alto</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
