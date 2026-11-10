import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faltasDeClave } from '../src/reglas/acceso.js';

test('acepta una contraseña que cumple la política', () => {
  assert.equal(faltasDeClave('Salas-Reunion-2026'), null);
});

test('admite entre 12 y 64 caracteres', () => {
  const armar = (largo) => 'Aa1-'.padEnd(largo, 'x');
  assert.match(faltasDeClave(armar(11)), /entre 12 y 64/);
  assert.equal(faltasDeClave(armar(12)), null);
  assert.equal(faltasDeClave(armar(64)), null);
  assert.match(faltasDeClave(armar(65)), /entre 12 y 64/);
});

for (const [falta, clave, mensaje] of [
  ['mayúscula', 'salas-reunion-2026', /una mayúscula/],
  ['minúscula', 'SALAS-REUNION-2026', /una minúscula/],
  ['número', 'Salas-Reunion-Dos', /un número/],
  ['carácter especial', 'SalasReunion2026', /un carácter especial/],
]) {
  test(`rechaza una contraseña sin ${falta}`, () => {
    assert.match(faltasDeClave(clave), mensaje);
  });
}
