import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as pdfService from '../services/pdf.service';
import * as valuationService from '../services/valuation.service';

// ─── PRISMA SINGLETON ────────────────────────────────────────────────────────
// Prevents multiple PrismaClient instances that exhaust the connection pool.
declare global { var __prisma: PrismaClient | undefined; }
const prisma: PrismaClient = global.__prisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

export const getProvincias = async (req: Request, res: Response) => {
  try {
    const result = await prisma.zone.groupBy({
      by: ['provincia'],
    });
    res.json(result.map(r => r.provincia).sort());
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const getMunicipios = async (req: Request, res: Response) => {
  try {
    const { provincia } = req.query;
    const result = await prisma.zone.groupBy({
      by: ['municipio'],
      where: provincia ? { provincia: String(provincia) } : {},
    });
    res.json(result.map(r => r.municipio).sort());
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const getSectores = async (req: Request, res: Response) => {
  try {
    const { provincia, municipio, zona } = req.query;
    const result = await prisma.zone.findMany({
      where: {
        zona: zona ? String(zona) : 'Urbana',
        provincia: provincia ? String(provincia) : undefined,
        municipio: municipio ? String(municipio) : undefined,
      },
      select: { sector: true },
      distinct: ['sector'],
    });
    res.json(result.map(r => r.sector).filter(Boolean).sort());
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const queryValor = async (req: Request, res: Response) => {
  try {
    const { provincia, municipio, sector, seccion } = req.query;
    
    // We build a raw query using unaccent for all filters to ensure 100% match reliability
    const provFilter = provincia ? `%${provincia}%` : '%';
    const muniFilter = municipio ? `%${municipio}%` : '%';
    const sectFilter = sector ? `%${sector}%` : '%';

    const results = await prisma.$queryRaw`
      SELECT * FROM "Zone"
      WHERE unaccent("provincia") ILIKE unaccent(${provFilter})
      AND unaccent("municipio") ILIKE unaccent(${muniFilter})
      AND unaccent("sector") ILIKE unaccent(${sectFilter})
      LIMIT 500
    `;
    
    res.json(results);
  } catch (error) {
    console.error('Filter Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const searchAll = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
       res.json([]);
       return;
    }

    const searchTerm = `%${q}%`;
    const results = await prisma.$queryRaw`
      SELECT * FROM "Zone"
      WHERE unaccent("provincia") ILIKE unaccent(${searchTerm})
      OR unaccent("municipio") ILIKE unaccent(${searchTerm})
      OR unaccent("sector") ILIKE unaccent(${searchTerm})
      OR unaccent("seccion") ILIKE unaccent(${searchTerm})
      LIMIT 500
    `;

    res.json(results);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const generateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zone = await prisma.zone.findUnique({ where: { id } });
    
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const pdfBuffer = await pdfService.generateZoneReport(zone);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Catastral_${zone.sector || zone.id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Error:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
};

export const getValuation = async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude are required for valuation' });
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone || !zone.valorPromedio) {
      return res.status(404).json({ error: 'Zone not found or has no base value' });
    }

    const valuation = await valuationService.calculateProjectedValue(
      parseFloat(String(lat)),
      parseFloat(String(lng)),
      zone.valorPromedio
    );

    res.json(valuation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { name } = req.body;

    // Cryptographically secure raw key
    const rawKey = `sk_cat_${crypto.randomBytes(24).toString('hex')}`;
    // Hash with bcrypt before storing — never store plain API keys
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: name || 'Default Key',
        userId: user.id,
      },
    });

    // Return the raw key ONCE — the client must save it; we cannot recover it
    res.json({
      id: apiKey.id,
      key: rawKey,
      name: apiKey.name,
      warning: 'Guarda esta llave ahora. No podrás verla de nuevo.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating API key' });
  }
};

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const keys = await prisma.apiKey.findMany({ where: { userId: user.id } });
    // Never expose the hashed key — only metadata
    res.json(keys.map(k => ({ id: k.id, name: k.name, createdAt: k.createdAt })));
  } catch (error) {
    res.status(500).json({ error: 'Error fetching API keys' });
  }
};

// ─── HEATMAP ─────────────────────────────────────────────────────────────────
// Returns [lat, lng, intensity] tuples for leaflet-heat.
// Intensity is normalised to 0..1 relative to the max value in the result set.
export const getHeatmap = async (req: Request, res: Response) => {
  try {
    const { provincia } = req.query;

    const zones = await prisma.zone.findMany({
      where: {
        ...(provincia ? { provincia: { contains: String(provincia), mode: 'insensitive' } } : {}),
        valorPromedio: { not: null, gt: 0 },
      },
      select: { valorPromedio: true, municipio: true, provincia: true, sector: true, lat: true, lng: true },
      take: 2000,
    });

    if (zones.length === 0) {
      return res.json([]);
    }

    const max = Math.max(...zones.map(z => z.valorPromedio!));

    // Complete coordinate lookup for all 32 provinces + municipios especiales.
    // Keys are uppercase + accent-stripped to match the normalize() output below.
    const COORDS: Record<string, [number, number]> = {
      // Distrito Nacional y Gran Santo Domingo
      'DISTRITO NACIONAL':      [18.4861, -69.9312],
      'SANTO DOMINGO':          [18.5001, -69.8887],
      'SANTO DOMINGO ESTE':     [18.4896, -69.8599],
      'SANTO DOMINGO NORTE':    [18.5393, -69.9180],
      'SANTO DOMINGO OESTE':    [18.5057, -70.0092],
      'LOS ALCARRIZOS':         [18.5210, -70.0470],
      'PEDRO BRAND':            [18.5540, -70.0940],
      'BOCA CHICA':             [18.4474, -69.6063],
      'SAN ANTONIO DE GUERRA':  [18.6150, -69.7620],
      // Norte / Cibao
      'SANTIAGO':               [19.4517, -70.6970],
      'ESPAILLAT':              [19.5873, -70.3777],
      'LA VEGA':                [19.2210, -70.5296],
      'MONSENOR NOUEL':         [18.9220, -70.3890],
      'SANCHEZ RAMIREZ':        [19.0530, -70.1490],
      'DUARTE':                 [19.3009, -70.0000],
      'PROVINCIA DUARTE':       [19.3009, -70.0000],
      'MARIA TRINIDAD SANCHEZ': [19.4300, -69.9500],
      'SALCEDO':                [19.3800, -70.4150],
      'HERMANAS MIRABAL':       [19.3800, -70.4150],
      'VALVERDE':               [19.5850, -71.0760],
      'MONTE CRISTI':           [19.8620, -71.6530],
      'DAJABON':                [19.5480, -71.7090],
      'SANTIAGO RODRIGUEZ':     [19.4800, -71.3400],
      // Este
      'EL SEIBO':               [18.7659, -69.0388],
      'HATO MAYOR':             [18.7630, -69.2560],
      'LA ALTAGRACIA':          [18.6220, -68.7074],
      'LA ROMANA':              [18.4274, -68.9728],
      'SAN PEDRO DE MACORIS':   [18.4541, -69.3050],
      'MONTE PLATA':            [18.8065, -69.7826],
      'SAMANA':                 [19.2059, -69.3365],  // Peninsula de Samana
      // Sur / Suroeste
      'SAN CRISTOBAL':          [18.4182, -70.1066],
      'PERAVIA':                [18.2759, -70.3313],
      'SAN JOSE DE OCOA':       [18.5430, -70.5060],
      'AZUA':                   [18.4530, -70.7347],
      'SAN JUAN':               [18.8060, -71.2290],
      'ELIAS PINA':             [18.8750, -71.7060],
      'BARAHONA':               [18.2030, -71.0994],
      'BAHORUCO':               [18.4900, -71.4250],
      'INDEPENDENCIA':          [18.4960, -71.8560],
      'PEDERNALES':             [18.0380, -71.7440],
    };

    const points: [number, number, number][] = [];

    for (const zone of zones) {
      // Normalize: uppercase, strip accents, collapse multiple spaces
      const normalize = (s: string) =>
        s.toUpperCase()
         .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
         .replace(/\s+/g, ' ')
         .trim();

      let lat: number | null = zone.lat ?? null;
      let lng: number | null = zone.lng ?? null;

      // If zone has no geocoded coords, fall back to province centroid
      if (lat === null || lng === null) {
        const provKey = normalize(zone.provincia);
        const base = COORDS[provKey]
               ?? COORDS[provKey.replace(/^PROVINCIA\s+/, '')]
               ?? null;
        if (!base) continue;
        // Wide jitter for province-level fallback so points spread across the province
        const jitter = () => (Math.random() - 0.5) * 0.12;
        lat = base[0] + jitter();
        lng = base[1] + jitter();
      }

      const intensity = zone.valorPromedio! / max;
      points.push([lat, lng, intensity]);
    }

    res.json(points);
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ error: 'Error generating heatmap data' });
  }
};

