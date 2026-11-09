import { Router } from 'express';
import { listarCategorias, listarRoles, listarSitios, listarTiposSala } from '../controladores/tablasFijas.js';
import { autenticar, exigirClaveDefinitiva } from '../middlewares/sesion.js';
import rutasSesion from "./sesion.js";
import rutasTecnologias from "./tecnologias.js";
import rutasVersiones from "./versiones.js";
import rutasProyectos from "./proyectos.js";
import rutasUsuarios from "./usuarios.js";

const rutas = Router();

rutas.use('/sesion', rutasSesion); // ingresar, consultar, salir y cambiar la contraseña

rutas.use(autenticar, exigirClaveDefinitiva);
//De acá para abajo, cada pedido tiene una sesión válida y la contraseña definitiva. Cada ruta exige además el permiso de su rol
rutas.get('/categorias', listarCategorias);
rutas.get('/tipos-sala', listarTiposSala);
rutas.get('/sitios', listarSitios);
rutas.get('/roles', listarRoles);

rutas.use('/tecnologias', rutasTecnologias);
rutas.use('/versiones', rutasVersiones);
rutas.use('/proyectos', rutasProyectos);
rutas.use('/usuarios', rutasUsuarios);

export default rutas;
