import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, '../../data');

async function main() {
  console.log('Starting data migration to PostgreSQL...');

  const MASTER_FILE = path.join(DATA_DIR, 'master-seed-geocoded.json');
  
  if (fs.existsSync(MASTER_FILE)) {
    console.log('💎 Detected production master seed (pre-geocoded). Using high-speed path...');
    const rawData = fs.readFileSync(MASTER_FILE, 'utf-8');
    const zones = JSON.parse(rawData);

    console.log(`Loading ${zones.length} pre-geocoded zones. Clearing existing database...`);
    await prisma.zone.deleteMany({});
    
    let success = 0;
    for (const z of zones) {
      try {
        await prisma.zone.create({
          data: {
            provincia: z.provincia,
            municipio: z.municipio,
            zona: z.zona,
            codigo: z.codigo,
            sector: z.sector,
            valorPromedio: z.valorPromedio,
            subsectores: z.subsectores,
            limites: z.limites,
            viasPrincipales: z.viasPrincipales,
            seccion: z.seccion,
            parajes: z.parajes,
            lat: z.lat,
            lng: z.lng,
            geocoded: z.geocoded,
            geocodingPrecision: z.geocodingPrecision
          }
        });
        success++;
        if (success % 100 === 0) process.stdout.write(`\r🚀 Carga: ${success}/${zones.length}`);
      } catch (e) {
        console.error(`\n❌ Failed index ${success}:`, (e as Error).message);
      }
    }
    console.log(`\n✅ Migration Finished: ${success} zones loaded.`);
    await seedImpactFactors();
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.txt') || (file.endsWith('.json') && file !== 'master-seed-geocoded.json'));

  if (files.length === 0) {
    console.log('No data files found in', DATA_DIR);
    return;
  }

  console.log(`Found ${files.length} data files. Clearing existing zones...`);
  await prisma.zone.deleteMany({});
  console.log('Database cleared.');

  let totalSuccess = 0;
  let totalFail = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    let rawData: string;
    
    try {
      rawData = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.error(`❌ Could not read file ${file}:`, e);
      continue;
    }

    let items: any[];
    try {
      const jsonData = JSON.parse(rawData);
      items = Array.isArray(jsonData) ? jsonData : [jsonData];
    } catch (e) {
      console.error(`❌ JSON Syntax Error in file ${file}:`, e);
      continue;
    }

    let fileSuccess = 0;
    let fileFail = 0;

    for (const item of items) {
      try {
        await prisma.zone.create({
          data: {
            provincia: item.provincia || 'N/A',
            municipio: item.municipio || 'N/A',
            zona: item.zona || 'Urbana',
            codigo: item.codigo ? String(item.codigo) : null,
            sector: item.sector,
            valorPromedio: item.valor_promedio ? parseFloat(item.valor_promedio) : null,
            subsectores: item.subsectores || [],
            limites: item.limites || {},
            viasPrincipales: item.vias_principales || [],
            seccion: item.seccion,
            parajes: item.parajes || [],
          },
        });
        fileSuccess++;
        totalSuccess++;
      } catch (err) {
        fileFail++;
        totalFail++;
        console.error(`⚠️ Failed record in ${file}:`, (err as Error).message);
      }
    }
    console.log(`📄 ${file}: Success: ${fileSuccess} | Failed: ${fileFail}`);
  }

  console.log('\n--- Migration Finished ---');
  console.log(`✅ Total successful records: ${totalSuccess}`);
  console.log(`❌ Total failed records: ${totalFail}`);

  await seedImpactFactors();
}

async function seedImpactFactors() {
  console.log('\n--- Seeding Impact Factors (Predicitive Model) ---');
  await prisma.impactFactor.deleteMany({});
  
  const factors = [
    { name: 'BlueMall Santo Domingo', type: 'MALL', latitude: 18.4716, longitude: -69.9366, radiusKm: 2.0, impactScore: 1.15 },
    { name: 'Agora Mall', type: 'MALL', latitude: 18.4841, longitude: -69.9392, radiusKm: 2.0, impactScore: 1.12 },
    { name: 'Hospital Plaza de la Salud', type: 'HOSPITAL', latitude: 18.4839, longitude: -69.9244, radiusKm: 1.5, impactScore: 1.05 },
    { name: 'Parque Mirador Sur', type: 'PARK', latitude: 18.4485, longitude: -69.9472, radiusKm: 2.5, impactScore: 1.10 },
    { name: 'Universidad UASD', type: 'UNIVERSITY', latitude: 18.4608, longitude: -69.9161, radiusKm: 1.5, impactScore: 1.08 },
    { name: 'INDEX Parque Industrial', type: 'INDUSTRIAL_PARK', latitude: 18.4912, longitude: -69.8321, radiusKm: 3.0, impactScore: 0.95 },
    { name: 'Centro Olímpico Juan Pablo Duarte', type: 'PARK', latitude: 18.4777, longitude: -69.9213, radiusKm: 1.0, impactScore: 1.04 },
    { name: 'Santiago: Hospital HOMS', type: 'HOSPITAL', latitude: 19.4312, longitude: -70.6658, radiusKm: 2.0, impactScore: 1.07 },
    { name: 'Santiago: PUCMM', type: 'UNIVERSITY', latitude: 19.4452, longitude: -70.6865, radiusKm: 1.5, impactScore: 1.09 },
  ];

  for (const f of factors) {
     await prisma.impactFactor.create({ data: f });
  }
  console.log(`✅ Seeded ${factors.length} impact factors.`);
}

// Combined execution if needed
async function runAll() {
  await main();
  await geocodeZones();
}

if (require.main === module) {
  const isGeocode = process.argv.includes('--geocode');
  const isSeed = process.argv.includes('--seed') || !isGeocode;

  (async () => {
    try {
      if (isSeed) await main();
      if (isGeocode) await geocodeZones();
    } catch (e) {
      console.error(e);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}

// =============================================================================
// GEOCODE SCRIPT — Google Geocoding API
// Fills lat/lng for every zone. Much faster than Nominatim (no 1 req/sec limit).
// Run once after seed: npm run geocode
// =============================================================================

async function geocodeZones() {
  const API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!API_KEY) {
    console.error('\u274c GOOGLE_GEOCODING_API_KEY not set in environment.');
    console.error('   Add it to your .env file and restart.');
    process.exit(1);
  }

  console.log('\n--- Geocoding zones via Google Geocoding API ---');

  const zones = await prisma.zone.findMany({
    where: { geocoded: false },
    select: { id: true, sector: true, municipio: true, provincia: true },
  });

  console.log(`Found ${zones.length} zones without coordinates.`);
  if (zones.length === 0) {
    console.log('All zones already geocoded.');
    return;
  }

  let success = 0;
  let fallback = 0;
  let failed = 0;

  // Cache municipio-level coords to avoid redundant API calls
  const muniCache = new Map<string, { lat: number; lng: number }>();

  for (const zone of zones) {
    const sectorQuery = `${zone.sector}, ${zone.municipio}, ${zone.provincia}, República Dominicana`;
    const muniQuery   = `${zone.municipio}, ${zone.provincia}, República Dominicana`;

    try {
      let lat: number | null = null;
      let lng: number | null = null;
      let method: string = 'none';

      // ── 1. Try Google Geocoding first ───────────────────────────────────────
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(sectorQuery)}&region=do&key=${API_KEY}`;

      try {
        const res  = await fetch(googleUrl);
        const data = await res.json() as any;

        if (data.status === 'OK' && data.results.length > 0) {
          ({ lat, lng } = data.results[0].geometry.location);
          method = 'google_exact';
        } else if (data.status === 'REQUEST_DENIED' || (data.error_message && data.error_message.includes('invalid'))) {
          // If restricted or invalid, we move to fallback
          throw new Error('GOOGLE_KEY_UNAVAILABLE');
        }
      } catch (gErr: any) {
        // Only log if it's not the 'unavailable' error we throw above
        if (gErr.message !== 'GOOGLE_KEY_UNAVAILABLE') {
          console.warn(`\nGoogle API Error: ${gErr.message}`);
        }
      }

      // ── 2. Fallback: Nominatim (OSM) ────────────────────────────────────────
      if (!lat) {
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sectorQuery)}&format=json&limit=1&countrycodes=do`;
          const res = await fetch(osmUrl, { headers: { 'User-Agent': 'CadastralSaaS/1.0' } });
          const data = await res.json() as any;

          if (Array.isArray(data) && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
            method = 'osm_exact';
          }
        } catch (osmErr) {
          // Silent fallback
        }
      }

      // ── 3. Fallback: Municipio Level (Google/Google Cache) ──────────────────
      if (!lat) {
        let muniCoords = muniCache.get(muniQuery);
        if (!muniCoords && !API_KEY.includes('invalid')) {
           try {
              const muniUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(muniQuery)}&region=do&key=${API_KEY}`;
              const res = await fetch(muniUrl);
              const data = await res.json() as any;
              if (data.status === 'OK' && data.results.length > 0) {
                muniCoords = data.results[0].geometry.location;
                muniCache.set(muniQuery, muniCoords!);
              }
           } catch { /* ignore */ }
        }

        if (muniCoords) {
          const jitter = () => (Math.random() - 0.5) * 0.018;
          lat = muniCoords.lat + jitter();
          lng = muniCoords.lng + jitter();
          method = 'google_muni';
        }
      }

      // ── 4. Fallback: Municipio Level (Nominatim) ────────────────────────────
      if (!lat) {
        try {
          const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(muniQuery)}&format=json&limit=1&countrycodes=do`;
          const res = await fetch(osmUrl, { headers: { 'User-Agent': 'CadastralSaaS/1.0' } });
          const data = await res.json() as any;
          if (Array.isArray(data) && data.length > 0) {
            const jitter = () => (Math.random() - 0.5) * 0.018;
            lat = parseFloat(data[0].lat) + jitter();
            lng = parseFloat(data[0].lon) + jitter();
            method = 'osm_muni';
          }
        } catch { /* ignore */ }
      }

      // ── Final Update ────────────────────────────────────────────────────────
      if (lat && lng) {
        const precision = method.includes('exact') ? 'exact' : 'approximate';
        await prisma.zone.update({
          where: { id: zone.id },
          data: { lat, lng, geocoded: true, geocodingPrecision: precision },
        });
        if (precision === 'exact') success++; else fallback++;
      } else {
        // NO marcar como geocoded si falló todo, para permitir reintentos
        failed++;
      }

      const done = success + fallback + failed;
      process.stdout.write(
        `\r✅ exacto: ${success}  ⚠️  aprox: ${fallback}  ❌ fallido: ${failed}  |  ${done}/${zones.length}`
      );

      // Throttling para respetar Nominatim (1 req/sec) y Google
      await new Promise(r => setTimeout(r, method.includes('osm') ? 1000 : 80));

    } catch (e) {
      failed++;
    }
  }

  console.log(`\n\n✅ Geocodificación completa!`);
  console.log(`   Resultados exactos : ${success}`);
  console.log(`   Fallback municipio : ${fallback}`);
  console.log(`   No encontrados     : ${failed}`);
}
