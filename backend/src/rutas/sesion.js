import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { cambiarClave, consultar, ingresar, salir } from '../controladores/sesion.js';
import { autenticar } from '../middlewares/sesion.js';

// Rutas de autenticación: máximo 10 pedidos por minuto por IP (TFG, sección Seguridad)
const limite = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde esta conexión. Esperá un minuto.' },
});

const rutasSesion = Router();
rutasSesion.post('/', limite, ingresar);
rutasSesion.get('/', consultar);
rutasSesion.delete('/', salir);
rutasSesion.put('/clave', limite, autenticar, cambiarClave);

export default rutasSesion;
