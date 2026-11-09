-- CreateEnum
CREATE TYPE "EstadoTecnologia" AS ENUM ('Activa', 'Inactiva');

-- CreateEnum
CREATE TYPE "EstadoVersion" AS ENUM ('Pendiente', 'Vigente', 'Historica', 'Rechazada');

-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('Pendiente', 'Aprobado', 'Denegado');

-- CreateEnum
CREATE TYPE "AccionProyecto" AS ENUM ('Creado', 'Editado', 'Aprobado', 'Denegado');

-- CreateTable
CREATE TABLE "Rol" (
    "id" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sitio" (
    "id" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,

    CONSTRAINT "Sitio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoSala" (
    "id" VARCHAR(20) NOT NULL,
    "estandar" VARCHAR(20) NOT NULL,
    "tamano" VARCHAR(10) NOT NULL,
    "ancho" DECIMAL(4,2) NOT NULL,
    "largo" DECIMAL(4,2) NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "TipoSala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "apellido" VARCHAR(60) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "rolId" VARCHAR(20) NOT NULL,
    "claveHash" VARCHAR(100) NOT NULL,
    "claveTemporalVence" TIMESTAMP(3),
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadaHasta" TIMESTAMP(3),
    "ultimoIngreso" TIMESTAMP(3),
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaveAnterior" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "claveHash" VARCHAR(100) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaveAnterior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tecnologia" (
    "id" SERIAL NOT NULL,
    "modelo" VARCHAR(60) NOT NULL,
    "marca" VARCHAR(40) NOT NULL,
    "categoriaId" VARCHAR(20) NOT NULL,
    "precioCentavos" INTEGER NOT NULL,
    "estado" "EstadoTecnologia" NOT NULL DEFAULT 'Activa',
    "fechaPrecio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tecnologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionEstandar" (
    "id" SERIAL NOT NULL,
    "tipoSalaId" VARCHAR(20) NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "EstadoVersion" NOT NULL DEFAULT 'Pendiente',
    "observaciones" VARCHAR(500) NOT NULL DEFAULT '',
    "autorId" INTEGER NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaPorId" INTEGER,
    "fechaResolucion" TIMESTAMP(3),
    "motivoRechazo" VARCHAR(500),

    CONSTRAINT "VersionEstandar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionItem" (
    "versionId" INTEGER NOT NULL,
    "tecnologiaId" INTEGER NOT NULL,
    "cantidadMaxima" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VersionItem_pkey" PRIMARY KEY ("versionId","tecnologiaId")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "sitioId" VARCHAR(20) NOT NULL,
    "versionId" INTEGER NOT NULL,
    "ancho" DECIMAL(4,2) NOT NULL,
    "largo" DECIMAL(4,2) NOT NULL,
    "gestorId" INTEGER NOT NULL,
    "estado" "EstadoProyecto" NOT NULL DEFAULT 'Pendiente',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoItem" (
    "proyectoId" INTEGER NOT NULL,
    "tecnologiaId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioCentavos" INTEGER NOT NULL,

    CONSTRAINT "ProyectoItem_pkey" PRIMARY KEY ("proyectoId","tecnologiaId")
);

-- CreateTable
CREATE TABLE "RegistroProyecto" (
    "id" SERIAL NOT NULL,
    "proyectoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "accion" "AccionProyecto" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCentavos" INTEGER NOT NULL,
    "motivo" VARCHAR(500),

    CONSTRAINT "RegistroProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Sitio_nombre_key" ON "Sitio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_orden_key" ON "Categoria"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "TipoSala_orden_key" ON "TipoSala"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "TipoSala_estandar_tamano_key" ON "TipoSala"("estandar", "tamano");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rolId_idx" ON "Usuario"("rolId");

-- CreateIndex
CREATE INDEX "ClaveAnterior_usuarioId_fecha_idx" ON "ClaveAnterior"("usuarioId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Tecnologia_modelo_key" ON "Tecnologia"("modelo");

-- CreateIndex
CREATE INDEX "Tecnologia_categoriaId_idx" ON "Tecnologia"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "VersionEstandar_tipoSalaId_numero_key" ON "VersionEstandar"("tipoSalaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "una_vigente_por_tipo_sala" ON "VersionEstandar"("tipoSalaId") WHERE ("estado" = 'Vigente');

-- CreateIndex
CREATE UNIQUE INDEX "una_pendiente_por_tipo_sala" ON "VersionEstandar"("tipoSalaId") WHERE ("estado" = 'Pendiente');

-- CreateIndex
CREATE INDEX "VersionItem_tecnologiaId_idx" ON "VersionItem"("tecnologiaId");

-- CreateIndex
CREATE INDEX "Proyecto_sitioId_idx" ON "Proyecto"("sitioId");

-- CreateIndex
CREATE INDEX "Proyecto_versionId_idx" ON "Proyecto"("versionId");

-- CreateIndex
CREATE INDEX "Proyecto_gestorId_idx" ON "Proyecto"("gestorId");

-- CreateIndex
CREATE INDEX "Proyecto_estado_idx" ON "Proyecto"("estado");

-- CreateIndex
CREATE INDEX "ProyectoItem_tecnologiaId_idx" ON "ProyectoItem"("tecnologiaId");

-- CreateIndex
CREATE INDEX "RegistroProyecto_proyectoId_fecha_idx" ON "RegistroProyecto"("proyectoId", "fecha");

-- CreateIndex
CREATE INDEX "RegistroProyecto_usuarioId_idx" ON "RegistroProyecto"("usuarioId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaveAnterior" ADD CONSTRAINT "ClaveAnterior_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tecnologia" ADD CONSTRAINT "Tecnologia_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionEstandar" ADD CONSTRAINT "VersionEstandar_tipoSalaId_fkey" FOREIGN KEY ("tipoSalaId") REFERENCES "TipoSala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionEstandar" ADD CONSTRAINT "VersionEstandar_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionEstandar" ADD CONSTRAINT "VersionEstandar_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionItem" ADD CONSTRAINT "VersionItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionEstandar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionItem" ADD CONSTRAINT "VersionItem_tecnologiaId_fkey" FOREIGN KEY ("tecnologiaId") REFERENCES "Tecnologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_sitioId_fkey" FOREIGN KEY ("sitioId") REFERENCES "Sitio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionEstandar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoItem" ADD CONSTRAINT "ProyectoItem_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoItem" ADD CONSTRAINT "ProyectoItem_tecnologiaId_fkey" FOREIGN KEY ("tecnologiaId") REFERENCES "Tecnologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroProyecto" ADD CONSTRAINT "RegistroProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroProyecto" ADD CONSTRAINT "RegistroProyecto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contenido fijo: La aplicación solo lo lee.
INSERT INTO "Rol" ("id", "nombre") VALUES
  ('gestor', 'Gestor de proyectos'), 
  ('colaborador', 'Colaborador operacional'),
  ('lider', 'Líder de videoconferencias'), 
  ('analista', 'Analista de presupuestos'),
  ('jefe', 'Jefe de control de gestión'), 
  ('administrador', 'Administrador'), 
  ('desarrollador', 'Desarrollador');

INSERT INTO "Sitio" ("id", "nombre") VALUES
  ('buenos-aires', 'Buenos Aires'), 
  ('nueva-york', 'New York'), 
  ('ciudad-de-mexico', 'Ciudad de México');

INSERT INTO "Categoria" ("id", "nombre", "orden") VALUES
  ('sistema-sala', 'Sistema de sala', 1), 
  ('camara', 'Cámara', 2), 
  ('pantalla', 'Pantalla', 3),
  ('microfono', 'Micrófono', 4), 
  ('parlante', 'Parlante', 5), 
  ('pizarra', 'Pizarra', 6),
  ('panel-reserva', 'Panel de reserva', 7), 
  ('inyector-energia', 'Inyector de energía', 8), 
  ('soporte', 'Soporte', 9),
  ('pizarra-inteligente', 'Pizarra Inteligente', 10),
  ('todo-en-uno', 'Todo en uno', 11);

INSERT INTO "TipoSala" ("id", "estandar", "tamano", "ancho", "largo", "capacidad", "orden") VALUES
  ('vc-mediana', 'Videoconferencia', 'Mediana', 4, 6, 8, 1),
  ('vc-grande', 'Videoconferencia', 'Grande', 6, 10, 16, 2),
  ('colab-pequena', 'Colaboración', 'Pequeña', 3, 3.5, 4, 3),
  ('colab-mediana', 'Colaboración', 'Mediana', 4, 5, 8, 4),
  ('byom-pequena', 'BYOM', 'Pequeña', 3.5, 3.5, 4, 5),
  ('byom-mediana', 'BYOM', 'Mediana', 4, 5, 8, 6);

-- Restricciones de integridad: reglas del TFG
ALTER TABLE "Tecnologia" ADD CONSTRAINT "tecnologia_precio_positivo" CHECK ("precioCentavos" > 0);
ALTER TABLE "TipoSala" ADD CONSTRAINT "tipo_sala_medidas" CHECK ("ancho" > 0 AND "largo" > 0 AND "capacidad" > 0);
ALTER TABLE "Usuario" ADD CONSTRAINT "usuario_email_minusculas" CHECK ("email" = lower("email"));
ALTER TABLE "Usuario" ADD CONSTRAINT "usuario_intentos" CHECK ("intentosFallidos" >= 0);
ALTER TABLE "VersionEstandar" ADD CONSTRAINT "version_numero" CHECK ("numero" >= 1);
ALTER TABLE "VersionItem" ADD CONSTRAINT "version_item_cantidad" CHECK ("cantidadMaxima" >= 1);
ALTER TABLE "Proyecto" ADD CONSTRAINT "proyecto_dimensiones" CHECK ("ancho" BETWEEN 3 AND 6 AND "largo" BETWEEN 3.5 AND 10);
ALTER TABLE "ProyectoItem" ADD CONSTRAINT "proyecto_item_valores" CHECK ("cantidad" >= 1 AND "precioCentavos" > 0);
ALTER TABLE "RegistroProyecto" ADD CONSTRAINT "registro_total" CHECK ("totalCentavos" >= 0);
ALTER TABLE "RegistroProyecto" ADD CONSTRAINT "registro_motivo_al_denegar" CHECK ("accion" <> 'Denegado' OR coalesce(length(trim("motivo")), 0) > 0);