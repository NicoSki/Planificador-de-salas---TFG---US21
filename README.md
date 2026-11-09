# Aplicación web de planificación de salas de videoconferencia y estimación presupuestaria

Trabajo Final de Graduación de la Licenciatura en Informática, Universidad Siglo 21.

Autor: **Nicolas Carmelo Skibicki**.

Este repositorio contiene el código fuente de la aplicación y este instructivo para su puesta en marcha.

La aplicación centraliza la planificación de salas de videoconferencia. Permite mantener un catálogo de tecnologías y estándares versionados por tipo de sala, armar un proyecto con su selección de equipos validada contra el estándar, verla en una escena 3D y estimar su presupuesto en tiempo real. La estimación pasa luego por un circuito de aprobación presupuestaria, y cada proyecto puede exportarse en un PDF de referencia sin valores comerciales.

## Tecnologías

| Capa | Herramientas |
|---|---|
| Interfaz | React, Vite, Material UI, Three.js y React Three Fiber |
| API | Node.js, Express, JSON Web Tokens, bcrypt y PDFKit |
| Datos | PostgreSQL y Prisma ORM |
| Ejecución | Docker y Docker Compose |

## Requisitos

- [Git](https://git-scm.com/).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución, o Docker Engine con el complemento Compose.
- Los puertos locales 8080 y 5433 libres.
- Chrome, Edge o Firefox, con WebGL habilitado para la escena 3D.

## Puesta en marcha

Los comandos se ejecutan en una terminal, desde la carpeta indicada.

### 1. Descargar el código

```bash
git clone URL_DE_ESTE_REPOSITORIO
cd NOMBRE_DE_LA_CARPETA
```

### 2. Crear los archivos de configuración

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 3. Completar la base de datos en `.env`

Definí un usuario y una contraseña para PostgreSQL. Usá solo letras y números, porque estos valores forman parte de la dirección de conexión.

```dotenv
POSTGRES_USER=salas
POSTGRES_PASSWORD=UnaClaveLarga2026
POSTGRES_DB=planificadorsalas
```

### 4. Completar la API en `backend/.env`

Generá el secreto de firma de las sesiones:

```bash
docker run --rm node:24-slim node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Pegá el resultado en `JWT_SECRETO` y definí las contraseñas de las dos cuentas iniciales:

```dotenv
JWT_SECRETO=resultado_del_comando_anterior
SEMILLA_CLAVE_ADMINISTRADOR=elegir_una_contraseña
SEMILLA_CLAVE_DESARROLLADOR=elegir_otra_contraseña
```

El resto de las variables de ese archivo puede quedar como está: Docker Compose define los valores de conexión al levantar los servicios.

### 5. Levantar la aplicación

```bash
docker compose up -d --build
```

La primera vez tarda varios minutos, porque construye las imágenes. Las migraciones de la base de datos se aplican solas al iniciar la API.

### 6. Crear las cuentas iniciales

Esperá unos segundos a que la API termine de iniciar y ejecutá:

```bash
docker compose exec backend npm run db:sembrar
```

### 7. Ingresar

Abrí <http://localhost:8080> e iniciá sesión:

| Cuenta | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@admin.com` | La de `SEMILLA_CLAVE_ADMINISTRADOR` |
| Desarrollador | `desarrollador@desarrollador.com` | La de `SEMILLA_CLAVE_DESARROLLADOR` |

## Primer uso

La aplicación se instala con los roles, sitios, categorías y tipos de sala, pero sin tecnologías ni proyectos. Para recorrer el flujo completo:

1. Con la cuenta **Administrador**, creá una cuenta por rol. Cada una recibe una contraseña temporal, que se muestra una sola vez, vence a las 24 horas y debe cambiarse en el primer ingreso. La nueva contraseña debe tener entre 12 y 64 caracteres, con mayúscula, minúscula, número y carácter especial.
2. Como **colaborador operacional**, cargá las tecnologías del catálogo y proponé la versión del estándar de cada tipo de sala.
3. Como **líder de videoconferencias**, aprobá las versiones pendientes.
4. Como **gestor de proyectos**, creá un proyecto, seleccioná los equipos, revisá la escena 3D y guardá la estimación.
5. Resolvé la aprobación presupuestaria: el **analista** hasta 20.000 USD y el **jefe de control de gestión** por encima de ese monto.
6. Descargá el PDF de referencia del proyecto, que no incluye precios.

La cuenta **Desarrollador** tiene acceso a toda la aplicación y sirve para una revisión rápida. Es un rol técnico para el desarrollo y la demostración, y no debe existir en producción.

## Comandos útiles

| Acción | Comando |
|---|---|
| Ver los registros de la API | `docker compose logs -f backend` |
| Detener la aplicación y conservar los datos | `docker compose down` |
| Volver a iniciarla | `docker compose up -d` |
| Detenerla y **borrar todos los datos** | `docker compose down -v` |

## Estructura del proyecto

| Carpeta o archivo | Contenido |
|---|---|
| `frontend/` | Interfaz web y configuración de Nginx |
| `backend/src/rutas/` y `backend/src/controladores/` | API |
| `backend/src/reglas/` | Reglas de negocio: presupuesto, selección, versiones y acceso |
| `backend/src/prisma/` | Modelo de datos, migraciones y cuentas iniciales |
| `docker-compose.yml` | Servicios de base de datos, API e interfaz |

## Seguridad

Los archivos `.env` contienen contraseñas y secretos, y no deben subirse al repositorio. Antes de publicar la aplicación en un servidor, usá contraseñas robustas y HTTPS, ya que la sesión se guarda en una cookie `Secure`.
