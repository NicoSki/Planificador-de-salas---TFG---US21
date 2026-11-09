// Formatos en español Argentina para montos, fechas y medidas
const dosDecimales = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Centavos a texto
export const usd = (centavos) => dosDecimales.format(centavos / 100);

// Fecha de ISO a dd/mm/aaaa
export const fecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Metros con coma decimal
export const metros = (n) => n.toLocaleString('es-AR');

// Fecha y hora: dd/mm/aaaa
export const fechaYHora = (iso) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
