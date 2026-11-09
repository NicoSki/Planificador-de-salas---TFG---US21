import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rutas from './rutas/rutas.js';
import { prisma } from './db.js';

const app = express();
//Limite para intentos de ingreso a la aplicacion
if (process.env.CONFIAR_PROXY) app.set('trust proxy', Number(process.env.CONFIAR_PROXY));
app.use(cors({ origin: process.env.ORIGEN_FRONTEND, credentials: true })); 
app.use(morgan('dev'));
app.use(express.json());
app.use('/api', rutas);

// Errores no previstos
app.use((err, req, res, next) => {
  if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' }); // único repetido
  if (err.status === 400) return res.status(400).json({ error: 'La solicitud no tiene un formato válido.' }); // JSON mal armado
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});


// Si la base no responde, la API no arranca
await prisma.$queryRaw`SELECT 1`;
console.log('Base de datos conectada');

const puerto = process.env.PUERTO_API ?? process.env.PORT ?? 3000;
app.listen(puerto, () => console.log(`API escuchando en http://localhost:${puerto}`));
