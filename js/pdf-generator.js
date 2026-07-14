/* =====================================================================
   PDF-GENERATOR.JS
   Construye el HTML visual de la factura (usado en preview, impresión
   y como base para el PDF) y exporta a PDF con jsPDF + html2canvas.
   ===================================================================== */

function renderizarFacturaHTML(datos, config) {
  const logoHtml = config.logo_url
    ? `<img src="${config.logo_url}" alt="Logo">`
    : `<img src="assets/logo-icon.png" alt="Santamaria Constructora">`;

  const filasProductos = (datos.items || []).map(it => `
    <tr>
      <td>${escapeHtml(it.descripcion || '')}</td>
      <td class="num">${formatoMoneda(it.precio)}</td>
      <td class="num">${it.cantidad}</td>
      <td class="num">${formatoMoneda(it.total)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" style="text-align:center; color:#8A8B8F;">Sin productos agregados</td></tr>`;

  const firmaHtml = config.firma_url
    ? `<img src="${config.firma_url}" alt="Firma"><div class="line">Firma autorizada</div>`
    : `<div class="line">Firma autorizada</div>`;

  return `
    <div class="idoc-head">
      <div class="idoc-logo">
        ${logoHtml}
        <div>
          <div class="co-name">${escapeHtml(config.nombre_empresa || 'Constructora Santamaria')}</div>
          <div class="co-sub">${escapeHtml(config.direccion || '')}</div>
          <div class="co-sub">${escapeHtml(config.telefono || '')} ${config.correo ? '· ' + escapeHtml(config.correo) : ''}</div>
        </div>
      </div>
      <div class="idoc-title">
        <div class="t">FACTURA</div>
        <div class="plate">${datos.numero || 'FAC-000000'}</div>
      </div>
    </div>

    <div class="idoc-meta-row">
      <div class="idoc-meta-col">
        <div class="lbl">Facturar a</div>
        <strong>${escapeHtml(datos.cliente_nombre || 'Cliente sin nombre')}</strong><br>
        ${datos.cliente_rnc ? 'RNC: ' + escapeHtml(datos.cliente_rnc) + '<br>' : ''}
        ${escapeHtml(datos.cliente_direccion || '')}<br>
        ${escapeHtml(datos.cliente_telefono || '')} ${datos.cliente_correo ? '· ' + escapeHtml(datos.cliente_correo) : ''}
      </div>
      <div class="idoc-meta-col" style="text-align:right;">
        <div class="lbl">Detalles</div>
        Fecha: <strong>${formatoFecha(datos.fecha)}</strong><br>
        Proyecto: <strong>${escapeHtml(datos.proyecto || '—')}</strong><br>
        Pago: <strong>${escapeHtml(datos.metodo_pago || '—')}</strong><br>
        Estado: <strong>${escapeHtml(datos.estado || 'Pendiente')}</strong>
      </div>
    </div>

    <table class="idoc-table">
      <thead>
        <tr><th>Descripción</th><th class="num">Precio</th><th class="num">Cant.</th><th class="num">Total</th></tr>
      </thead>
      <tbody>${filasProductos}</tbody>
    </table>

    <div class="idoc-totals">
      <div class="r"><span>Subtotal</span><span>${formatoMoneda(datos.subtotal)}</span></div>
      ${datos.aplicaItbis !== false ? `<div class="r"><span>ITBIS (18%)</span><span>${formatoMoneda(datos.itbis)}</span></div>` : ''}
      <div class="r grand"><span>Total</span><span>${formatoMoneda(datos.total)}</span></div>
    </div>

    ${datos.observaciones ? `
    <div class="idoc-obs">
      <div class="lbl">Observaciones</div>
      ${escapeHtml(datos.observaciones)}
    </div>` : ''}

    <div class="idoc-sign">
      <div class="sign-box">${firmaHtml}</div>
      <div class="sign-box"><div class="line">Cliente</div></div>
    </div>

    <div class="idoc-foot">${escapeHtml(config.pie_pagina || 'Gracias por su confianza.')}</div>
  `;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function descargarFacturaPDF(elementId, nombreArchivo) {
  const el = document.getElementById(elementId);
  const canvas = await html2canvas(el, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 60;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 30;

  pdf.addImage(imgData, 'PNG', 30, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 60);

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 30;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 30, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 60);
  }

  pdf.save(`${nombreArchivo}.pdf`);
}
