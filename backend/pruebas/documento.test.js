import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { datosDocumento, generarDocumento } from '../src/reglas/documento.js';

const proyecto = {
  nombre: 'Sala 4A Reuniones',
  ancho: '4.50',
  largo: '6.00',
  totalCentavos: 1_018_750,
  version: { numero: 3, tipoSala: { estandar: 'Videoconferencias', tamano: 'Mediana', capacidad: 8 } },
  items: [
    { cantidad: 2, precioCentavos: 150_000, tecnologia: { modelo: 'Pantalla 65', marca: 'MarcaP', precioCentavos: 150_000, categoria: { nombre: 'Pantalla', orden: 2 } } },
    { cantidad: 1, precioCentavos: 400_000, tecnologia: { modelo: 'Kit Sala', marca: 'MarcaK', precioCentavos: 400_000, categoria: { nombre: 'Kit', orden: 1 } } },
  ],
};

// PDFKit comprime las páginas y escribe el texto en hexadecimal: se descomprime y se decodifica para leerlo
function textoDelPdf(pdf) {
  const crudo = pdf.toString('latin1');
  const lineas = [];
  for (const bloque of crudo.matchAll(/stream\n([\s\S]*?)\nendstream/g)) {
    const inicio = bloque.index + 'stream\n'.length;
    let contenido;
    try {
      contenido = inflateSync(pdf.subarray(inicio, inicio + bloque[1].length)).toString('latin1');
    } catch {
      continue; // bloque sin comprimir
    }
    for (const [, arreglo] of contenido.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const hexa = [...arreglo.matchAll(/<([0-9a-fA-F]+)>/g)].map((m) => m[1]).join('');
      lineas.push(Buffer.from(hexa, 'hex').toString('latin1'));
    }
  }
  return lineas.join('\n');
}

// Título, autor y asunto: PDFKit guarda cada valor en un objeto aparte, referenciado desde el diccionario
function metadatosDelPdf(pdf) {
  const crudo = pdf.toString('latin1');
  return ['Title', 'Author', 'Subject'].map((clave) => {
    const objeto = crudo.match(new RegExp(`/${clave} (\\d+) 0 R`))[1];
    return crudo.match(new RegExp(`\\n${objeto} 0 obj\\n(.*)\\n`))[1];
  }).join('\n');
}

const VALOR_COMERCIAL = /USD|\$|precio|monto|importe|subtotal|total|mano de obra|1\.?500|4\.?000|10\.?187/i;

test('los datos del documento no incluyen precios ni montos', () => {
  assert.doesNotMatch(JSON.stringify(datosDocumento(proyecto)), /precio|total|150000|400000|1018750/i);
});

test('el PDF muestra los datos del proyecto y ningún valor comercial', async () => {
  const texto = textoDelPdf(await generarDocumento(datosDocumento(proyecto)));
  for (const esperado of ['Sala 4A Reuniones', 'Videoconferencias', 'Kit Sala', 'MarcaK', 'Pantalla 65']) {
    assert.ok(texto.includes(esperado), `falta ${esperado}`);
  }
  assert.doesNotMatch(texto, VALOR_COMERCIAL);
});

test('los metadatos del PDF no incluyen valores comerciales', async () => {
  const metadatos = metadatosDelPdf(await generarDocumento(datosDocumento(proyecto)));
  assert.match(metadatos, /Sala 4A Reuniones/);
  assert.doesNotMatch(metadatos, VALOR_COMERCIAL);
});
