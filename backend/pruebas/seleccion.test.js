import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesDe, validarItems, validarSeleccion } from '../src/reglas/proyectos.js';

const tecnologia = (id, categoriaId, estado = 'Activa') => ({ id, categoriaId, estado, marca: 'Marca', modelo: `Modelo ${id}` });
const vigentes = [
  { tecnologia: tecnologia(1, 'camara'), cantidadMaxima: 1 },
  { tecnologia: tecnologia(2, 'todo-en-uno'), cantidadMaxima: 1 },
  { tecnologia: tecnologia(3, 'pantalla'), cantidadMaxima: 2 },
  { tecnologia: tecnologia(4, 'pizarra'), cantidadMaxima: 1 },
  { tecnologia: tecnologia(5, 'soporte'), cantidadMaxima: 1 },
  { tecnologia: tecnologia(6, 'pantalla', 'Inactiva'), cantidadMaxima: 1 },
];
const { opciones } = opcionesDe(vigentes);
const elegir = (...pares) => pares.map(([tecnologiaId, cantidad]) => ({ tecnologiaId, cantidad }));

test('acepta una selección dentro del estándar, con la cantidad máxima', () => {
  assert.equal(validarSeleccion(elegir([1, 1], [3, 2]), opciones), null);
});

test('rechaza una tecnología que no pertenece al estándar', () => {
  assert.match(validarSeleccion(elegir([99, 1]), opciones), /no pertenecen al estándar/);
});

test('rechaza una cantidad mayor a la máxima del estándar', () => {
  assert.match(validarSeleccion(elegir([3, 3]), opciones), /admite hasta 2/);
});

test('una tecnología inactiva no se ofrece en una selección nueva', () => {
  assert.match(validarSeleccion(elegir([6, 1]), opciones), /no pertenecen al estándar/);
});

test('admite un solo modelo de cámara, sea cámara sola o todo en uno', () => {
  assert.match(validarSeleccion(elegir([1, 1], [2, 1]), opciones), /un modelo de cámara/);
});

test('el carrito solo se agrega con una pizarra', () => {
  assert.match(validarSeleccion(elegir([5, 1]), opciones), /solo se puede agregar con una pizarra/);
  assert.equal(validarSeleccion(elegir([4, 1], [5, 1]), opciones), null);
});

test('al editar conserva lo que quedó fuera del estándar, sin sumar unidades', () => {
  const anteriores = [{ tecnologiaId: 7, cantidad: 2, tecnologia: tecnologia(7, 'microfono', 'Inactiva') }];
  const edicion = opcionesDe(vigentes, anteriores).opciones;
  assert.equal(validarSeleccion(elegir([7, 2]), edicion), null);
  assert.match(validarSeleccion(elegir([7, 3]), edicion), /admite hasta 2/);
});

test('exige tecnologías, sin repetir y con cantidades enteras de 1 a 99', () => {
  assert.ok(validarItems([]).error);
  assert.ok(validarItems(elegir([1, 1], [1, 1])).error);
  assert.ok(validarItems(elegir([1, 0])).error);
  assert.ok(validarItems(elegir([1, 100])).error);
  assert.ok(validarItems(elegir([1, 1.5])).error);
  assert.deepEqual(validarItems(elegir([1, 99])).items, elegir([1, 99]));
});
