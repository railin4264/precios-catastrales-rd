import puppeteer from 'puppeteer';

export const generateZoneReport = async (zoneData: any) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();

  const subsectoresHtml = (zoneData.subsectores || zoneData.parajes || [])
    .map((s: any) => `
      <tr>
        <td>${s.nombre}</td>
        <td style="text-align: right; font-weight: bold;">RD$ ${s.valor?.toLocaleString() || '---'}</td>
      </tr>
    `).join('');

  const viasHtml = (zoneData.viasPrincipales || [])
    .map((v: any) => `
      <tr>
        <td>${v.nombre}</td>
        <td style="text-align: right; font-weight: bold;">RD$ ${v.valor?.toLocaleString() || 'Ref.'}</td>
      </tr>
    `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #334155; }
        .header { display: flex; justify-between; border-bottom: 4px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; }
        .title { color: #0f172a; font-size: 32px; font-weight: 900; margin: 0; }
        .subtitle { color: #64748b; font-size: 14px; font-weight: 600; margin-top: 4px; }
        .main-value { background: #f8fafc; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
        .value-label { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; }
        .value-amount { font-size: 48px; font-weight: 900; color: #2563eb; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        h2 { font-size: 14px; border-left: 4px solid #2563eb; padding-left: 10px; margin-bottom: 20px; text-transform: uppercase; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: left; }
        .footer { margin-top: 60px; font-size: 10px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">Certificado de Valuación</h1>
          <p class="subtitle">Cadastral RD Platform | ID: ${zoneData.id.substring(0,8)}</p>
        </div>
      </div>

      <div class="main-value">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h1 style="margin: 0; font-size: 36px; font-weight: 900;">${zoneData.sector || zoneData.municipio}</h1>
            <p style="margin: 4px 0 0; color: #2563eb; font-weight: 700;">${zoneData.provincia}, ${zoneData.municipio}</p>
          </div>
          <div style="text-align: right;">
            <p class="value-label">Valor Oficial m²</p>
            <p class="value-amount">RD$ ${zoneData.valorPromedio?.toLocaleString() || '---'}</p>
          </div>
        </div>
      </div>

      <div class="grid">
        <div>
          <h2>Subsectores y Parajes</h2>
          <table>
            ${subsectoresHtml || '<tr><td>No se detallan subsectores</td></tr>'}
          </table>
        </div>
        <div>
          <h2>Límites Geográficos</h2>
          <table>
            <tr><td><strong>NORTE:</strong></td><td>${zoneData.limites?.norte || '---'}</td></tr>
            <tr><td><strong>SUR:</strong></td><td>${zoneData.limites?.sur || '---'}</td></tr>
            <tr><td><strong>ESTE:</strong></td><td>${zoneData.limites?.este || '---'}</td></tr>
            <tr><td><strong>OESTE:</strong></td><td>${zoneData.limites?.oeste || '---'}</td></tr>
          </table>
        </div>
      </div>

      <div style="margin-top: 40px;">
        <h2>Vías y Avenidas Principales</h2>
        <table>
          ${viasHtml || '<tr><td>No se detallan vías principales</td></tr>'}
        </table>
      </div>

      <div class="footer">
        Este documento es un reporte generado automáticamente por la Plataforma Cadastral RD basado en la Resolución No. 003-21. 
        Este valor es de carácter referencial para fines de consulta. Para certificaciones legales con fines de transferencia de propiedad, 
        debe solicitar la certificación oficial ante la Dirección General de Catastro Nacional (DGCN).
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const pdf = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();
  return pdf;
};
