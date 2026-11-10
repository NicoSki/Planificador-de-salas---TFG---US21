import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puede, puedeResolver } from '../src/reglas/acceso.js';

const TODOS = [
  'proyectos.ver', 'proyectos.editar', 'aprobaciones.resolver', 'aprobaciones.todos-los-montos',
  'catalogo.ver', 'catalogo.editar', 'estandares.ver', 'estandares.proponer', 'estandares.aprobar', 'cuentas.administrar',
];

// Cada rol tiene exactamente estos permisos: cubre lo permitido y lo prohibido
const ESPERADOS = {
  gestor: ['proyectos.ver', 'proyectos.editar'],
  colaborador: ['catalogo.ver', 'catalogo.editar', 'estandares.ver', 'estandares.proponer'],
  lider: ['proyectos.ver', 'catalogo.ver', 'estandares.ver', 'estandares.aprobar'],
  analista: ['proyectos.ver', 'aprobaciones.resolver'],
  jefe: ['proyectos.ver', 'aprobaciones.resolver'],
  administrador: ['cuentas.administrar'],
  desarrollador: TODOS,
};

for (const [rol, permisos] of Object.entries(ESPERADOS)) {
  test(`${rol} tiene solo sus permisos`, () => {
    assert.deepEqual(TODOS.filter((p) => puede(rol, p)), TODOS.filter((p) => permisos.includes(p)));
  });
}

test('un rol inexistente no tiene permisos', () => {
  assert.equal(TODOS.some((p) => puede('invitado', p)), false);
});

const LIMITE = 2_000_000;

test('el analista resuelve hasta 20.000 USD inclusive', () => {
  assert.equal(puedeResolver('analista', LIMITE), true);
  assert.equal(puedeResolver('analista', LIMITE + 1), false);
});

test('el jefe resuelve solo por encima de 20.000 USD', () => {
  assert.equal(puedeResolver('jefe', LIMITE), false);
  assert.equal(puedeResolver('jefe', LIMITE + 1), true);
});

test('el desarrollador resuelve cualquier monto', () => {
  assert.equal(puedeResolver('desarrollador', LIMITE), true);
  assert.equal(puedeResolver('desarrollador', LIMITE + 1), true);
});

test('los demás roles no resuelven aprobaciones', () => {
  for (const rol of ['gestor', 'colaborador', 'lider', 'administrador']) {
    assert.equal(puedeResolver(rol, LIMITE), false);
  }
});
