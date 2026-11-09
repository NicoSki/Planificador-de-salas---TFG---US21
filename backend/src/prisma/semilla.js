// Cuentas iniciales: sin ellas nadie puede ingresar ni quedar como autor de una acción
// El resto de las cuentas las crea el Administrador desde la aplicación. Las contraseñas salen de .env
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';

const CUENTAS = [
  { nombre: 'Administrador', apellido: 'General', email: 'admin@admin.com', rolId: 'administrador', variable: 'SEMILLA_CLAVE_ADMINISTRADOR' },
  { nombre: 'Desarrollador', apellido: 'General', email: 'desarrollador@desarrollador.com', rolId: 'desarrollador', variable: 'SEMILLA_CLAVE_DESARROLLADOR' },
];

// Crea solo las que faltan: correrlo dos veces no duplica ni cambia contraseñas.
for (const { variable, ...datos } of CUENTAS) {
  const clave = process.env[variable];
  if (!clave) throw new Error(`Falta ${variable} en backend/.env`);
  if (await prisma.usuario.findUnique({ where: { email: datos.email } })) {
    console.log(`${datos.email}: ya existía, no se modificó.`);
    continue;
  }
  await prisma.usuario.create({ data: { ...datos, claveHash: await bcrypt.hash(clave, 12) } });
  console.log(`${datos.email}: cuenta creada.`);
}
await prisma.$disconnect();
