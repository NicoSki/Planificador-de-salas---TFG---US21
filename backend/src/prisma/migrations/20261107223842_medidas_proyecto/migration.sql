ALTER TABLE "Proyecto" DROP CONSTRAINT "proyecto_dimensiones";
ALTER TABLE "Proyecto" ADD CONSTRAINT "proyecto_dimensiones" CHECK ("ancho" BETWEEN 2 AND 30 AND "largo" BETWEEN 2 AND 30);
