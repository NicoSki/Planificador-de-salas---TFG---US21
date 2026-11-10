import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPresupuesto, rolAprobador } from '../src/reglas/presupuesto.js';

test('calcula el ejemplo del TFG: subtotal, 25 % de mano de obra y total', () => {
  const items = [
    { cantidad: 1, precioCentavos: 400_000 },
    { cantidad: 2, precioCentavos: 150_000 },
    { cantidad: 1, precioCentavos: 35_000 },
    { cantidad: 1, precioCentavos: 80_000 },
  ];
  assert.deepEqual(calcularPresupuesto(items), { subtotal: 815_000, manoObra: 203_750, total: 1_018_750 });
});

test('sin tecnologías, todo queda en cero', () => {
  assert.deepEqual(calcularPresupuesto([]), { subtotal: 0, manoObra: 0, total: 0 });
});

test('la mano de obra se redondea hacia arriba al centavo', () => {
  assert.deepEqual(calcularPresupuesto([{ cantidad: 1, precioCentavos: 101 }]), { subtotal: 101, manoObra: 26, total: 127 });
});

test('hasta 20.000 USD inclusive resuelve el analista; por encima, el jefe', () => {
  assert.equal(rolAprobador(2_000_000), 'analista');
  assert.equal(rolAprobador(2_000_001), 'jefe');
});
