import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ALTO_SALA, ALTURA_EN_CARRITO, disposicionSala, ubicarEquipos } from './Ubicacion.js';
import { Box, Button, Paper, Typography } from '@mui/material';
import { metros } from '../proyectos/Formato.js';

const DURACION_CAIDA = 2;
const ALTURA_CAIDA = 2.4;
const SIN_MOVIMIENTO = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ETIQUETA = { position: 'absolute', left: 12, bgcolor: '#fff', px: 1, py: 0.5, borderRadius: 0.5 };

// Curva de caída con rebote al llegar
function rebote(t) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

export default function Sala3D({ sala, items, tecnologias, alto = 470 }) {
  const [seleccion, setSeleccion] = useState(null);
  const { ancho, largo, capacidad } = sala;
  const disposicion = useMemo(() => disposicionSala({ ancho, largo, capacidad }), [ancho, largo, capacidad]);
  const equipos = useMemo(() => ubicarEquipos(items, tecnologias, { ancho, largo, capacidad }), [items, tecnologias, ancho, largo, capacidad]);
  const lado = Math.max(ancho, largo);
  // Cámara a distancia justa para que entre toda la sala: radio de la esfera que la envuelve / sen(fov / 2).
  const camara = useMemo(() => {
    const distancia = (Math.hypot(ancho / 2, largo / 2, ALTO_SALA / 2) / Math.sin(THREE.MathUtils.degToRad(45 / 2))) * 1.02;
    const direccion = new THREE.Vector3(0.5, 0.72, 0.62).normalize();
    return direccion.multiplyScalar(distancia).add(new THREE.Vector3(0, 0.8, 0)).toArray();
  }, [ancho, largo]);
  const tecnologia = tecnologias.find((t) => t.id === seleccion);
  const cantidad = items.find((i) => i.tecnologiaId === seleccion)?.cantidad ?? 0;

  return (
    <Box sx={{ position: 'relative', height: alto, borderRadius: 1, overflow: 'hidden', bgcolor: '#f4f6f9' }}>
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: camara, fov: 45, near: 0.1, far: 120 }}
        onPointerMissed={() => setSeleccion(null)}
      >
        <color attach="background" args={['#f4f6f9']} />
        <Controles />
        <hemisphereLight args={['#ffffff', '#b9b3a8', 2.2]} />
        <directionalLight
          position={[ancho * 0.4, 7, largo * 0.2]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-lado}
          shadow-camera-right={lado}
          shadow-camera-top={lado}
          shadow-camera-bottom={-lado}
          shadow-bias={-0.0005}
        />
        <Habitacion ancho={ancho} largo={largo} d={disposicion} />
        {equipos.map((e) => (
          <Equipo key={e.clave} e={e} resaltado={e.tecnologiaId === seleccion} alElegir={() => setSeleccion(e.tecnologiaId)} />
        ))}
      </Canvas>

      
      {tecnologia && cantidad > 0 && (
        <Paper role="status" elevation={3} sx={{ position: 'absolute', top: 12, right: 12, p: 1.5, maxWidth: 240, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography sx={{ fontWeight: 700 }}>{tecnologia.modelo}</Typography>
          <Typography variant="body2">{tecnologia.marca}</Typography>
          <Typography variant="body2">{tecnologia.categoria} x{cantidad} en el proyecto</Typography>
          <Button size="small" onClick={() => setSeleccion(null)} sx={{ alignSelf: 'flex-start', px: 0 }}>Cerrar</Button>
        </Paper>
      )}
    </Box>
  );
}

// Cámara orbital: arrastrar rota, rueda acerca. No baja del piso
function Controles() {
  const { camera, gl } = useThree();
  const controles = useRef(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(0, 0.8, 0);
    c.enableDamping = true;
    c.maxPolarAngle = Math.PI / 2.05;
    c.minDistance = 1.5;
    c.maxDistance = 30;
    c.update();
    controles.current = c;
    return () => c.dispose();
  }, [camera, gl]);
  useFrame((_, delta) => controles.current?.update(delta));
  return null;
}

// Paredes, piso, puerta, mesa y sillas. Paredes con BackSide: las que tapan la cámara no se dibujan
function Habitacion({ ancho, largo, d }) {
  return (
    <group>
      <mesh position={[0, d.alto / 2, 0]}>
        <boxGeometry args={[ancho, d.alto, largo]} />
        <meshStandardMaterial color="#e3e7ec" side={THREE.BackSide} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
        <planeGeometry args={[ancho, largo]} />
        <meshStandardMaterial color="#c9c3b8" />
      </mesh>
      {/* Puerta visible de los dos lados: desde afuera se ve junto al panel de reserva. */}
      <mesh position={[d.puerta.x, d.puerta.alto / 2, largo / 2 - 0.006]} rotation-y={Math.PI}>
        <planeGeometry args={[d.puerta.ancho, d.puerta.alto]} />
        <meshStandardMaterial color="#9c7a57" side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, 0, d.mesa.z]}>
        <mesh position={[0, d.mesa.alto - 0.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[d.mesa.ancho, 0.05, d.mesa.largo]} />
          <meshStandardMaterial color="#ddd6cb" />
        </mesh>
        <mesh position={[0, (d.mesa.alto - 0.05) / 2, 0]} castShadow>
          <boxGeometry args={[d.mesa.ancho * 0.4, d.mesa.alto - 0.05, d.mesa.largo * 0.75]} />
          <meshStandardMaterial color="#6d737b" />
        </mesh>
      </group>
      {d.sillas.map(([x, z, giro], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={giro}>
          <mesh position={[0, 0.46, 0]} castShadow>
            <boxGeometry args={[0.46, 0.07, 0.46]} />
            <meshStandardMaterial color="#3f4651" />
          </mesh>
          <mesh position={[0, 0.74, -0.21]} castShadow>
            <boxGeometry args={[0.44, 0.48, 0.05]} />
            <meshStandardMaterial color="#3f4651" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.44, 12]} />
            <meshStandardMaterial color="#8a9099" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

//Unidad de equipo: cae al montarse y se desliza si cambia su lugar
function Equipo({ e, resaltado, alElegir }) {
  const grupo = useRef(null);
  const inicio = useRef(null);
  const [w, h, p] = e.tamano;

  //Arranca arriba del destino; solo al montar (después, useFrame la lleva).
  useLayoutEffect(() => {
    const [x, y, z] = e.posicion;
    grupo.current.position.set(x, y + (SIN_MOVIMIENTO ? 0 : ALTURA_CAIDA), z);
  }, []);

  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useFrame((estado, delta) => {
    const g = grupo.current;
    const [x, y, z] = e.posicion;
    if (inicio.current === null) inicio.current = estado.clock.elapsedTime;
    const t = SIN_MOVIMIENTO ? 1 : Math.min(1, (estado.clock.elapsedTime - inicio.current) / DURACION_CAIDA);
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 8, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, z, 8, delta);
    g.position.y = t < 1 ? y + (1 - rebote(t)) * ALTURA_CAIDA : THREE.MathUtils.damp(g.position.y, y, 8, delta);
  });

  return (
    <group
      ref={grupo}
      rotation-y={e.rotacionY}
      onClick={(ev) => {
        ev.stopPropagation();
        alElegir();
      }}
      onPointerOver={(ev) => {
        ev.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <ModeloGenerico forma={e.forma} tamano={e.tamano} />
      {resaltado && (
        <mesh>
          <boxGeometry args={[w + 0.05, h + 0.05, p + 0.05]} />
          <meshBasicMaterial color="#f2a93b" wireframe />
        </mesh>
      )}
    </group>
  );
}

//Contenido de pantallas y tela de parlante dibujados en canvas. Una textura por tipo, compartida entre unidades
const texturas = new Map();
function textura(nombre, ancho, alto, dibujar, repetir) {
  if (!texturas.has(nombre)) {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    dibujar(lienzo.getContext('2d'), ancho, alto);
    const t = new THREE.CanvasTexture(lienzo);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repetir) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(...repetir);
    }
    texturas.set(nombre, t);
  }
  return texturas.get(nombre);
}

const redondeado = (c, x, y, w, h, r) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};

const circulo = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};

//Pizarra táctil: fondo de pantalla, hora y panel de opciones a la derecha.
const pantallaPizarra = () =>
  textura('pizarra', 1024, 576, (c, w, h) => {
    const fondo = c.createLinearGradient(0, h, w, 0);
    fondo.addColorStop(0, '#1d1446');
    fondo.addColorStop(0.45, '#5b2a86');
    fondo.addColorStop(0.75, '#b8457a');
    fondo.addColorStop(1, '#f08a4b');
    c.fillStyle = fondo;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255, 255, 255, 0.08)';
    c.beginPath();
    c.ellipse(w * 0.35, h * 1.05, w * 0.55, h * 0.45, -0.25, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.font = '600 96px "Segoe UI", sans-serif';
    c.fillText('9:35', w * 0.05, h * 0.21);
    c.font = '30px "Segoe UI", sans-serif';
    c.fillText('Sala de colaboración', w * 0.05, h * 0.29);
    c.fillStyle = 'rgba(15, 15, 30, 0.55)';
    redondeado(c, w * 0.64, h * 0.1, w * 0.31, h * 0.8, 18);
    for (let i = 0; i < 4; i++) {
      const y = h * (0.16 + i * 0.17);
      c.fillStyle = i === 0 ? '#5b5fc7' : 'rgba(255, 255, 255, 0.16)';
      redondeado(c, w * 0.665, y, w * 0.26, h * 0.12, 12);
      c.fillStyle = 'rgba(255, 255, 255, 0.85)';
      circulo(c, w * 0.7, y + h * 0.06, 13);
      redondeado(c, w * 0.73, y + h * 0.045, w * 0.15, 14, 7);
    }
  });

// Consola del kit de sala: reunión en curso, participantes y botón rojo de colgar.
const pantallaConsola = () =>
  textura('consola', 512, 320, (c, w, h) => {
    c.fillStyle = '#1f2029';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#2c2e48';
    c.fillRect(0, 0, w * 0.34, h);
    c.fillStyle = 'rgba(255, 255, 255, 0.8)';
    redondeado(c, w * 0.05, h * 0.1, w * 0.2, 12, 6);
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    redondeado(c, w * 0.05, h * 0.19, w * 0.25, 9, 4);
    redondeado(c, w * 0.05, h * 0.25, w * 0.17, 9, 4);
    ['#e8a87c', '#85c1e9', '#c39bd3', '#82e0aa'].forEach((color, i) => {
      const y = h * (0.17 + i * 0.15);
      c.fillStyle = color;
      circulo(c, w * 0.42, y, 13);
      c.fillStyle = 'rgba(255, 255, 255, 0.7)';
      redondeado(c, w * 0.47, y - 5, w * 0.17, 10, 5);
    });
    c.fillStyle = '#5b5fc7';
    redondeado(c, w * 0.73, h * 0.17, w * 0.23, h * 0.1, 8);
    redondeado(c, w * 0.73, h * 0.31, w * 0.23, h * 0.1, 8);
    c.fillStyle = '#2a2b36';
    c.fillRect(w * 0.34, h * 0.82, w * 0.66, h * 0.18);
    c.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 6; i++) circulo(c, w * (0.42 + i * 0.07), h * 0.91, 7);
    c.fillStyle = '#c4314b';
    redondeado(c, w * 0.86, h * 0.855, w * 0.11, h * 0.11, 8);
  });

// Panel de reserva: estado de la sala, para quien pasa por el pasillo.
const pantallaReserva = () =>
  textura('reserva', 256, 176, (c, w, h) => {
    c.fillStyle = '#1e7a46';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.font = '600 20px "Segoe UI", sans-serif';
    c.fillText('Sala de reuniones', 16, 32);
    c.font = '700 40px "Segoe UI", sans-serif';
    c.fillText('Disponible', 16, 86);
    c.font = '17px "Segoe UI", sans-serif';
    c.fillText('Libre hasta las 11:00', 16, 114);
    c.fillStyle = 'rgba(255, 255, 255, 0.92)';
    redondeado(c, 16, 130, 112, 30, 15);
    c.fillStyle = '#1e7a46';
    c.font = '600 16px "Segoe UI", sans-serif';
    c.fillText('Reservar', 40, 151);
  });

// Tela de parlante: grilla de puntos oscuros (dock y base de la consola).
const telaParlante = () =>
  textura(
    'tela',
    64,
    64,
    (c, w, h) => {
      c.fillStyle = '#34373d';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d1f23';
      for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) circulo(c, x, y, 1.8);
    },
    [5, 2],
  );

const Caja = ({ args, color, posicion, ...material }) => (
  <mesh position={posicion} castShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} {...material} />
  </mesh>
);

// Caja de bordes redondeados. Geometría propia: se libera al desmontar.
function CajaRedondeada({ args: [w, h, p, radio], posicion, children }) {
  const geometria = useMemo(() => new RoundedBoxGeometry(w, h, p, 3, radio), [w, h, p, radio]);
  useEffect(() => () => geometria.dispose(), [geometria]);
  return (
    <mesh geometry={geometria} position={posicion} castShadow>
      {children}
    </mesh>
  );
}

// Pantalla encendida: textura sin luces de escena, como un monitor real.
const Contenido = ({ ancho, alto, z, textura: mapa }) => (
  <mesh position={[0, 0, z]}>
    <planeGeometry args={[ancho, alto]} />
    <meshBasicMaterial map={mapa} toneMapped={false} />
  </mesh>
);

// Cable USB-C del dock: sale por el costado, queda apoyado en la mesa y termina en su conector.
function CableUsbC({ desde: [x, y, z] }) {
  const { geometria, punta, giro } = useMemo(() => {
    const puntos = [
      [x - 0.01, y + 0.012, z],
      [x + 0.05, y, z + 0.015],
      [x + 0.14, y, z + 0.1],
      [x + 0.2, y, z + 0.22],
      [x + 0.27, y, z + 0.3],
    ].map((v) => new THREE.Vector3(...v));
    const curva = new THREE.CatmullRomCurve3(puntos);
    const tangente = curva.getTangent(1);
    return { geometria: new THREE.TubeGeometry(curva, 48, 0.0035, 8), punta: puntos.at(-1), giro: Math.atan2(tangente.x, tangente.z) };
  }, [x, y, z]);
  useEffect(() => () => geometria.dispose(), [geometria]);
  return (
    <group>
      <mesh geometry={geometria} castShadow>
        <meshStandardMaterial color="#16181b" roughness={0.6} />
      </mesh>
      <group position={punta} rotation-y={giro}>
        <Caja args={[0.012, 0.008, 0.026]} color="#16181b" posicion={[0, 0, 0.013]} />
        <Caja args={[0.009, 0.004, 0.01]} color="#a7adb4" posicion={[0, 0, 0.031]} metalness={0.8} roughness={0.3} />
      </group>
    </group>
  );
}

// Modelo genérico por categoría, armado con primitivas según forma. Mismo modelo para toda tecnología de la categoría.
// Frente del modelo = +z local.
function ModeloGenerico({ forma, tamano: [w, h, p] }) {
  switch (forma) {
    case 'pantalla':
      return (
        <group>
          <Caja args={[w, h, p]} color="#1c1f24" />
          <mesh position={[0, 0, p / 2 + 0.002]}>
            <planeGeometry args={[w * 0.95, h * 0.9]} />
            <meshStandardMaterial color="#21426e" emissive="#0d2340" roughness={0.3} />
          </mesh>
        </group>
      );
    case 'pizarra-inteligente':
      // Pizarra táctil de colaboración: marco fino, pantalla con contenido y cámara arriba al centro.
      return (
        <group>
          <Caja args={[w, h, p]} color="#2f333a" />
          <Contenido ancho={w * 0.965} alto={h * 0.93} z={p / 2 + 0.002} textura={pantallaPizarra()} />
          <Caja args={[w * 0.16, 0.04, p * 0.9]} color="#1b1d21" posicion={[0, h / 2 + 0.02, 0]} />
          <mesh position={[0, h / 2 + 0.02, p * 0.45 + 0.004]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.011, 0.011, 0.008, 20]} />
            <meshStandardMaterial color="#050506" roughness={0.15} />
          </mesh>
        </group>
      );
    case 'pizarra':
      return (
        <group>
          <Caja args={[w, h, p]} color="#b8bec6" />
          <mesh position={[0, 0, p / 2 + 0.002]}>
            <planeGeometry args={[w * 0.96, h * 0.93]} />
            <meshStandardMaterial color="#fbfbfa" roughness={0.4} />
          </mesh>
        </group>
      );
    case 'barra':
      return (
        <group>
          <Caja args={[w, h, p]} color="#2a2d32" />
          <mesh position={[0, 0, p / 2 + 0.003]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[h * 0.28, h * 0.28, 0.006, 24]} />
            <meshStandardMaterial color="#0b0c0e" roughness={0.2} />
          </mesh>
        </group>
      );
    case 'hub': {
      // Kit de sala: base cuadrada con parlante, cuello cilíndrico con aro y pantalla táctil inclinada.
      const base = 0.055;
      return (
        <group>
          <CajaRedondeada args={[0.2, base, 0.2, 0.012]} posicion={[0, -h / 2 + base / 2, 0]}>
            <meshStandardMaterial map={telaParlante()} roughness={0.9} />
          </CajaRedondeada>
          <Caja args={[0.12, 0.003, 0.002]} color="#e0566b" posicion={[0, -h / 2 + 0.008, 0.1005]} />
          <mesh position={[0, -h / 2 + base + 0.003, 0]}>
            <cylinderGeometry args={[0.058, 0.058, 0.006, 32]} />
            <meshStandardMaterial color="#c3c8ce" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -h / 2 + base + 0.03, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.05, 32]} />
            <meshStandardMaterial color="#2c2f34" roughness={0.8} />
          </mesh>
          <group position={[0, -h / 2 + base + 0.13, -0.015]} rotation-x={-0.45}>
            <Caja args={[w, 0.19, 0.014]} color="#16181c" />
            <Contenido ancho={w * 0.95} alto={0.172} z={0.0075} textura={pantallaConsola()} />
          </group>
        </group>
      );
    }

    case 'microfono':
      return (
        <mesh castShadow>
          <cylinderGeometry args={[w / 2, w / 2, h, 24]} />
          <meshStandardMaterial color={forma === 'microfono' ? '#33373d' : '#2a2d32'} />
        </mesh>
      );
    case 'parlante':
      return (
        <mesh>
          <cylinderGeometry args={[w / 2, w / 2, h, 24]} />
          <meshStandardMaterial color="#f3f4f5" />
        </mesh>
      );
    case 'panel':
      return (
        <group>
          <Caja args={[w, h, p]} color="#1c1f24" />
          <Contenido ancho={w * 0.88} alto={h * 0.82} z={p / 2 + 0.002} textura={pantallaReserva()} />
        </group>
      );
    case 'soporte': {
      // Carrito móvil: patas con ruedas, dos postes y travesaño a la altura de la pizarra, que va delante (+z).
      const pie = -h / 2 + 0.07;
      return (
        <group>
          {[-1, 1].map((lado) => (
            <group key={lado}>
              <Caja args={[0.06, 0.04, p]} color="#4b5563" posicion={[lado * w * 0.38, pie, 0]} />
              <Caja args={[0.05, h - 0.09, 0.05]} color="#6b7280" posicion={[lado * w * 0.3, 0.045, -0.05]} />
              {[-1, 1].map((punta) => (
                <mesh key={punta} position={[lado * w * 0.38, -h / 2 + 0.035, punta * (p / 2 - 0.05)]} rotation-z={Math.PI / 2}>
                  <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
                  <meshStandardMaterial color="#1f2328" />
                </mesh>
              ))}
            </group>
          ))}
          <Caja args={[w * 0.76, 0.04, 0.05]} color="#4b5563" posicion={[0, pie, -0.05]} />
          <Caja args={[w * 0.7, 0.05, 0.04]} color="#6b7280" posicion={[0, ALTURA_EN_CARRITO - h / 2, -0.05]} />
        </group>
      );
    }
    case 'inyector':
      // Dock BYOM: caja con tela de parlante, tapa con botones y cable USB-C apoyado en la mesa.
      return (
        <group>
          <CajaRedondeada args={[w, h * 0.86, p, 0.022]} posicion={[0, -h * 0.07, 0]}>
            <meshStandardMaterial map={telaParlante()} roughness={0.95} />
          </CajaRedondeada>
          <CajaRedondeada args={[w * 0.97, h * 0.16, p * 0.97, 0.02]} posicion={[0, h / 2 - h * 0.08, 0]}>
            <meshStandardMaterial color="#3a3d43" roughness={0.55} />
          </CajaRedondeada>
          {[-0.03, 0, 0.03].map((x) => (
            <mesh key={x} position={[x, h / 2 + 0.001, p * 0.2]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.007, 20]} />
              <meshStandardMaterial color="#5a5e66" />
            </mesh>
          ))}
          <CableUsbC desde={[w / 2, -h / 2 + 0.0035, 0]} />
        </group>
      );
    default:
      return <Caja args={[w, h, p]} color="#3b3f45" />; // otras: caja oscura de su medida
  }
}
