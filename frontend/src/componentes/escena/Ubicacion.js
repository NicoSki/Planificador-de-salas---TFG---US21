export const ALTO_SALA = 2.7; 
export const ALTURA_EN_CARRITO = 1.4;

// Medidas por forma [ancho, alto, profundidad] en metros. Dan tamaño al modelo genérico de cada categoría.
const TAMANOS = {
  pantalla: [1.45, 0.82, 0.06],
  'pizarra-inteligente': [1.9, 1.07, 0.08],
  pizarra: [1.8, 1.2, 0.04],
  barra: [0.5, 0.1, 0.09],
  hub: [0.3, 0.27, 0.22], 
  microfono: [0.1, 0.03, 0.1],
  parlante: [0.26, 0.05, 0.26],
  panel: [0.22, 0.15, 0.03],
  inyector: [0.16, 0.085, 0.12], 
  soporte: [0.95, 1.55, 0.7],
  caja: [0.4, 0.4, 0.4],
};

const limitar = (v, max) => Math.min(Math.max(v, -max), max);


function pulgadas(modelo) {
  const m = /(?<!\d)(\d{2})(?!\d)/.exec(modelo);
  const p = m && Number(m[1]);
  return p >= 32 ? p : null;
}

function formaDe(t) {
  switch (t.categoria) {
    case 'Pantalla': return 'pantalla';
    case 'Sistema de sala': return 'hub';
    case 'Cámara': return 'barra';
    case 'Micrófono': return 'microfono';
    case 'Parlante': return 'parlante';
    case 'Pizarra': return pulgadas(t.modelo) ? 'pizarra-inteligente' : 'pizarra';
    case 'Pizarra Inteligente': return 'pizarra-inteligente';
    case 'Todo en uno': return 'barra';
    case 'Panel de reserva': return 'panel';
    case 'Inyector de energía': return 'inyector';
    case 'Soporte': return 'soporte';
    default: return 'caja';
  }
}

function tamanoDe(t, forma) {
  const p = pulgadas(t.modelo);
  if (p && (forma === 'pantalla' || forma === 'pizarra-inteligente')) {
    const diagonal = p * 0.0254;
    return [diagonal * 0.872, diagonal * 0.49, forma === 'pantalla' ? 0.06 : 0.08];
  }
  return TAMANOS[forma];
}


// Sillas: 4 en salas pequeñas, 8 en medianas y 16 en grandes (la capacidad del tipo de sala), la mitad de cada lado de la mesa.
const PASO_MINIMO = 0.6; // m de mesa por silla, lo justo
const PASO_COMODO = 0.9; // m de mesa por silla, con la sala holgada
export const sillasPorLado = (capacidad) => Math.max(1, Math.ceil(capacidad / 2));

// Medidas mínimas para que entren las sillas: mesa justa más 0,8 m libres al frente y atrás; a lo ancho, mesa de 0,9 m y una silla de cada lado.
// Es la misma regla que valida la API (backend/src/reglas/proyectos.js).
export const medidasMinimas = (capacidad) => ({ ancho: 2.5, largo: Math.round((sillasPorLado(capacidad) * PASO_MINIMO + 1.6) * 100) / 100 });

// Mesa y sillas: la mesa crece con la sala entre lo justo y lo cómodo para sus sillas, dejando 1,3 m a cada extremo si hay lugar.
export function disposicionSala({ ancho, largo, capacidad = 8 }) {
  const porLado = sillasPorLado(capacidad);
  const mesaLargo = Math.max(porLado * PASO_MINIMO, Math.min(porLado * PASO_COMODO, largo - 2.6));
  const mesaAncho = Math.min(Math.max(ancho * 0.32, 0.9), 1.8);
  const mesaZ = Math.min(0.5, (largo - mesaLargo) / 2 - 0.6);
  const sillas = [];
  for (let i = 0; i < porLado; i++) {
    const z = mesaZ - mesaLargo / 2 + (i + 0.5) * (mesaLargo / porLado);
    sillas.push([-(mesaAncho / 2 + 0.4), z, Math.PI / 2], [mesaAncho / 2 + 0.4, z, -Math.PI / 2]);
  }
  return {
    alto: ALTO_SALA,
    mesa: { ancho: mesaAncho, largo: mesaLargo, alto: 0.74, z: mesaZ },
    sillas,
    puerta: { x: ancho / 2 - 0.8, ancho: 0.9, alto: 2.1 },
  };
}

// Calcula posición, rotación, forma y tamaño de cada unidad del proyecto
export function ubicarEquipos(items, tecnologias, sala) {
  const { ancho, largo } = sala;
  const { mesa, puerta } = disposicionSala(sala);
  const porId = new Map(tecnologias.map((t) => [t.id, t]));

  // Una entrada por unidad
  const unidades = items.flatMap((item) => {
    const t = porId.get(item.tecnologiaId);
    if (!t) return [];
    const forma = formaDe(t);
    return Array.from({ length: item.cantidad }, (_, i) => ({ clave: `${t.id}-${i}`, tecnologia: t, forma, tamano: tamanoDe(t, forma) }));
  });
  const de = (categoria) => unidades.filter((u) => u.tecnologia.categoria === categoria);

  const resultado = [];
  //Todo queda dentro de la sala, salvo lo que va afuera (panel de reserva)
  const poner = (u, [x, y, z], { rotacionY = 0, afuera = false } = {}) =>
    resultado.push({
      clave: u.clave,
      tecnologiaId: u.tecnologia.id,
      forma: u.forma,
      tamano: u.tamano,
      posicion: [limitar(x, ancho / 2 - 0.05), Math.min(Math.max(y, 0), ALTO_SALA), limitar(z, afuera ? largo / 2 + 0.1 : largo / 2 - 0.05)],
      rotacionY,
    });

  // Fila centrada sobre pared frontal, lado a lado
  const filaFrente = (lista, centroY) => {
    const separacion = 0.15;
    const total = lista.reduce((s, u) => s + u.tamano[0], 0) + separacion * Math.max(0, lista.length - 1);
    let x = -total / 2;
    for (const u of lista) {
      const [w, h, p] = u.tamano;
      poner(u, [x + w / 2, centroY(h), -largo / 2 + p / 2 + 0.01]);
      x += w + separacion;
    }
  };

  // Pizarra en carrito
  const montarEnCarrito = (pizarra, carrito, [x, z], rotacionY) => {
    const [dx, dz] = [Math.sin(rotacionY), Math.cos(rotacionY)];
    const [, alto, fondo] = carrito.tamano;
    const centro = fondo / 2 + 0.2;
    poner(carrito, [x + dx * centro, alto / 2, z + dz * centro], { rotacionY });
    const delante = centro + pizarra.tamano[2] / 2 - 0.02;
    poner(pizarra, [x + dx * delante, ALTURA_EN_CARRITO, z + dz * delante], { rotacionY });
  };

  // Pantallas al frente
  const pantallas = de('Pantalla');
  const pizarras = [...de('Pizarra'), ...de('Pizarra Inteligente')];
  const soportes = de('Soporte');
  const carrito = pizarras.length ? soportes[0] : undefined;
  const enCarrito = carrito && pizarras[0];
  const frente = pantallas.length ? pantallas : pizarras.slice(0, 1);
  const pizarrasLaterales = pantallas.length ? pizarras : pizarras.slice(1);
  const enPared = frente.filter((u) => u !== enCarrito);
  filaFrente(enPared, () => 1.45);
  if (enCarrito && !pantallas.length) montarEnCarrito(enCarrito, carrito, [0, -largo / 2], 0);
  const bordeInferior = enPared.length ? 1.45 - Math.max(...enPared.map((u) => u.tamano[1])) / 2 : 1.3;

  //Cámara debajo de pantallas. Con kit de sala
  const sistemas = de('Sistema de sala');
  filaFrente([...de('Cámara'), ...de('Todo en uno')], (h) => bordeInferior - 0.08 - h / 2);

  const mesaFrente = mesa.z - mesa.largo / 2;
  const sobreMesa = (h) => mesa.alto + h / 2;

  //Centro de la mesa: consola del kit de sala y dock del inyector
  const centro = [...sistemas, ...de('Inyector de energía')];
  centro.forEach((u, i) => poner(u, [0, sobreMesa(u.tamano[1]), mesa.z + (i - (centro.length - 1) / 2) * 0.5]));


  //Micrófonos repartidos a lo largo de la mesa, fuera de la zona frontal
  const microfonos = de('Micrófono');
  const tramo = Math.max(mesa.largo - 0.6, 0.4);
  const costado = Math.max(0.25, mesa.ancho * 0.25);
  const porFila = centro.length ? Math.ceil(microfonos.length / 2) : microfonos.length;
  microfonos.forEach((u, i) => {
    const lado = centro.length ? (i % 2 ? 1 : -1) : 0;
    const k = centro.length ? Math.floor(i / 2) : i;
    poner(u, [lado * costado, sobreMesa(u.tamano[1]), mesaFrente + 0.6 + (k + 0.5) * (tramo / porFila)]);
  });

  //Parlantes en techo: una columna hasta 2 o dos columnas desde 3
  const parlantes = de('Parlante');
  const columnas = parlantes.length > 2 ? 2 : 1;
  const filas = Math.ceil(parlantes.length / columnas);
  parlantes.forEach((u, i) => {
    const x = columnas === 1 ? 0 : (i % columnas === 0 ? -1 : 1) * (ancho / 4);
    const z = -largo / 2 + (Math.floor(i / columnas) + 0.5) * (largo / filas);
    poner(u, [x, ALTO_SALA - u.tamano[1] / 2, z]);
  });

  //Pizarras restantes en pared izquierda, mirando al centro. La del carrito, delante de la pared
  {
    const separacion = 0.3;
    const total = pizarrasLaterales.reduce((s, u) => s + u.tamano[0], 0) + separacion * Math.max(0, pizarrasLaterales.length - 1);
    let z = -total / 2;
    for (const u of pizarrasLaterales) {
      const [w, , p] = u.tamano;
      if (u === enCarrito) montarEnCarrito(u, carrito, [-ancho / 2, z + w / 2], Math.PI / 2);
      else poner(u, [-ancho / 2 + p / 2 + 0.01, 1.4, z + w / 2], { rotacionY: Math.PI / 2 });
      z += w + separacion;
    }
  }

  // Panel de reserva afuera, junto a la puerta: su pantalla mira al pasillo
  de('Panel de reserva').forEach((u, i) => poner(u, [puerta.x - puerta.ancho / 2 - 0.3 - i * 0.35, 1.3, largo / 2 + u.tamano[2] / 2 + 0.01], { afuera: true }));

  //Soportes sin pizarra en esquina frontal derecha; otras categorías en piso junto a pared derecha
  soportes.filter((u) => u !== carrito).forEach((u, i) => {
    const [w, h, p] = u.tamano;
    poner(u, [ancho / 2 - w / 2 - 0.2, h / 2, -largo / 2 + p / 2 + 0.4 + i * (p + 0.2)]);
  });
  unidades
    .filter((u) => u.forma === 'caja')
    .forEach((u, i) => poner(u, [ancho / 2 - 0.35, u.tamano[1] / 2, -largo / 2 + 1 + i * 0.6]));

  return resultado;
}
