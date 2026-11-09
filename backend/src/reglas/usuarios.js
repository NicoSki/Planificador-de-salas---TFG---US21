// Reglas de las cuentas de usuario (apartado Administrador). La API las aplica aunque la interfaz ya las haya controlado
import { randomInt } from 'node:crypto';

export const HORAS_CLAVE_TEMPORAL = 24;
const LARGOS = { nombre: 60, apellido: 60 };
const LARGO_EMAIL = 120;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // sin 0, O, 1, l ni I, que se confunden al dictarla

// Valida la forma del pedido: nombre, apellido, correo (se guarda en minúsculas) y rol. Devuelve { errores } o { datos }
export function validarCuenta(cuerpo) {
  const errores = {};
  const datos = {};
  for (const [campo, maximo] of Object.entries(LARGOS)) {
    const valor = typeof cuerpo?.[campo] === 'string' ? cuerpo[campo].trim() : '';
    if (!valor) errores[campo] = 'Campo obligatorio';
    else if (valor.length > maximo) errores[campo] = `Máximo ${maximo} caracteres`;
    datos[campo] = valor;
  }
  datos.email = typeof cuerpo?.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email) || datos.email.length > LARGO_EMAIL) errores.email = 'Ingresá un correo válido';
  if (!(typeof cuerpo?.rolId === 'string' && cuerpo.rolId)) errores.rolId = 'Elegí un rol';
  datos.rolId = cuerpo?.rolId;
  return Object.keys(errores).length ? { errores } : { datos };
}

// 12 caracteres al azar (generador criptográfico) en tres grupos, con al menos una mayúscula, una minúscula y un número
export function generarClaveTemporal() {
  for (;;) {
    const letras = Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
    if (/[A-Z]/.test(letras) && /[a-z]/.test(letras) && /\d/.test(letras)) return `${letras.slice(0, 4)}-${letras.slice(4, 8)}-${letras.slice(8)}`;
  }
}

// La contraseña temporal vence a las 24 horas de generarse
export const venceTemporal = (ahora = Date.now()) => new Date(ahora + HORAS_CLAVE_TEMPORAL * 3_600_000);
