// Documento de referencia del proyecto en PDF (HU-012), con PDFKit. Sin ningún valor comercial: ni precios ni montos, tampoco en los metadatos
import PDFDocument from 'pdfkit';

const fechaLarga = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' });
const decimales = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Lista blanca de lo que entra al PDF. Los precios del proyecto no pasan de acá
export const datosDocumento = (p) => ({
  nombre: p.nombre,
  estandar: p.version.tipoSala.estandar,
  tamano: p.version.tipoSala.tamano,
  capacidad: p.version.tipoSala.capacidad,
  version: p.version.numero,
  ancho: Number(p.ancho),
  largo: Number(p.largo),
  tecnologias: [...p.items]
    .sort((a, b) => a.tecnologia.categoria.orden - b.tecnologia.categoria.orden)
    .map(({ cantidad, tecnologia: t }) => ({ categoria: t.categoria.nombre, modelo: t.modelo, marca: t.marca, cantidad })),
});

// P-0007-sala-4a-reuniones.pdf: sin tildes ni caracteres especiales, para el encabezado de la descarga
export const nombreArchivo = (p) =>
  `P-${String(p.id).padStart(4, '0')}-${p.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'proyecto'}.pdf`;

// Recibe la salida de datosDocumento y devuelve el PDF como Buffer
export function generarDocumento(d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 56,
      info: { Title: `Documento de referencia: ${d.nombre}`, Author: 'Planificador de Salas', Subject: 'Proyecto de sala sin valores comerciales' },
    });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const izquierda = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font('Helvetica-Bold').fontSize(17).fillColor('#1f4e79').text('Documento de referencia del proyecto');
    doc.moveDown(0.3).font('Helvetica').fontSize(9.5).fillColor('#555555')
      .text(`Emitido el ${fechaLarga.format(new Date())}. Documento sin valores comerciales.`);
    doc.moveDown(1.2);

    // Datos generales: etiqueta a la izquierda, valor a la derecha
    const datos = [
      ['Proyecto', d.nombre],
      ['Tipo de sala', `${d.estandar} · ${d.tamano}`],
      ['Dimensiones', `${decimales.format(d.ancho)} m de ancho × ${decimales.format(d.largo)} m de largo`],
      ['Capacidad de referencia', `${d.capacidad} personas`],
      ['Versión del estándar', `v${d.version}`],
    ];
    for (const [etiqueta, valor] of datos) {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#333333').text(etiqueta, izquierda, y, { width: 150 });
      doc.font('Helvetica').fillColor('#000000').text(valor, izquierda + 160, y, { width: ancho - 160 });
      doc.moveDown(0.45);
    }

    doc.moveDown(1).font('Helvetica-Bold').fontSize(12.5).fillColor('#1f4e79').text('Tecnologías del proyecto', izquierda);
    doc.moveDown(0.5);

    // Tabla: categoría, modelo, marca y cantidad, en el orden de las categorías del catálogo
    const columnas = [['Categoría', 0.27], ['Modelo', 0.33], ['Marca', 0.25], ['Cantidad', 0.15]]
      .map(([titulo, proporcion]) => ({ titulo, ancho: ancho * proporcion }));
    const fila = (valores, negrita) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) doc.addPage();
      const y = doc.y;
      let x = izquierda;
      let alto = 0;
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#000000');
      valores.forEach((valor, i) => {
        const opciones = { width: columnas[i].ancho - 8, align: i === valores.length - 1 ? 'right' : 'left' };
        doc.text(String(valor), x, y, opciones);
        alto = Math.max(alto, doc.heightOfString(String(valor), opciones));
        x += columnas[i].ancho;
      });
      doc.y = y + alto + 6;
      doc.moveTo(izquierda, doc.y - 3).lineTo(izquierda + ancho, doc.y - 3).lineWidth(0.5).strokeColor('#c9d2dc').stroke();
    };
    fila(columnas.map((c) => c.titulo), true);
    for (const t of d.tecnologias) fila([t.categoria, t.modelo, t.marca, t.cantidad], false);

    doc.end();
  });
}
