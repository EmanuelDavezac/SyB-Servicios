/*
  Warnings:

  - You are about to drop the `Cliente` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Cliente";

-- CreateTable
CREATE TABLE "cliente" (
    "id_cliente" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "apellido" VARCHAR(50) NOT NULL,
    "cuit" VARCHAR(20),
    "calle" VARCHAR(100),
    "num_calle" INTEGER,
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "compra_insumo" (
    "id_compra" SERIAL NOT NULL,
    "id_proveedor" INTEGER,
    "fecha_compra" DATE NOT NULL DEFAULT CURRENT_DATE,
    "costo_total" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "compra_insumo_pkey" PRIMARY KEY ("id_compra")
);

-- CreateTable
CREATE TABLE "detalle_compra" (
    "id_detalle_compra" SERIAL NOT NULL,
    "id_compra" INTEGER,
    "id_insumo" INTEGER,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalle_compra_pkey" PRIMARY KEY ("id_detalle_compra")
);

-- CreateTable
CREATE TABLE "detalle_orden_insumo" (
    "id_detalle_ins" SERIAL NOT NULL,
    "id_orden" INTEGER,
    "id_insumo" INTEGER,
    "cantidad_usada" INTEGER NOT NULL,
    "precio_aplicado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalle_orden_insumo_pkey" PRIMARY KEY ("id_detalle_ins")
);

-- CreateTable
CREATE TABLE "detalle_orden_servicio" (
    "id_detalle_srv" SERIAL NOT NULL,
    "id_orden" INTEGER,
    "id_servicio" INTEGER,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio_acordado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalle_orden_servicio_pkey" PRIMARY KEY ("id_detalle_srv")
);

-- CreateTable
CREATE TABLE "factura" (
    "id_factura" SERIAL NOT NULL,
    "id_orden" INTEGER,
    "num_factura" VARCHAR(50),
    "tipo" VARCHAR(20),
    "fecha_emision" DATE NOT NULL,
    "fecha_vencimiento" DATE,
    "monto_total" DECIMAL(10,2) NOT NULL,
    "saldo_pendiente" DECIMAL(10,2),
    "estado_pago" VARCHAR(20) DEFAULT 'Impago',
    "descripcion" TEXT,

    CONSTRAINT "factura_pkey" PRIMARY KEY ("id_factura")
);

-- CreateTable
CREATE TABLE "historial_notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "id_factura" INTEGER,
    "id_cliente" INTEGER,
    "tipo_notificacion" VARCHAR(50),
    "fecha_creacion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "estado" VARCHAR(20),
    "descripcion" TEXT,

    CONSTRAINT "historial_notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "insumo" (
    "id_insumo" SERIAL NOT NULL,
    "id_proveedor" INTEGER,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "stock_actual" INTEGER DEFAULT 0,
    "stock_minimo" INTEGER DEFAULT 0,
    "precio_costo" DECIMAL(10,2) NOT NULL,
    "precio_venta" DECIMAL(10,2) NOT NULL,
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id_insumo")
);

-- CreateTable
CREATE TABLE "orden_trabajo" (
    "id_orden" SERIAL NOT NULL,
    "id_cliente" INTEGER,
    "fecha_creacion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "estado_trabajo" VARCHAR(20) DEFAULT 'Pendiente',
    "notas_internas" TEXT,

    CONSTRAINT "orden_trabajo_pkey" PRIMARY KEY ("id_orden")
);

-- CreateTable
CREATE TABLE "pagos_parciales" (
    "id_pago" SERIAL NOT NULL,
    "id_factura" INTEGER,
    "monto_pagado" DECIMAL(10,2) NOT NULL,
    "forma_pago" VARCHAR(50),
    "fecha_pago" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "pagos_parciales_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id_proveedor" SERIAL NOT NULL,
    "razon_social" VARCHAR(100) NOT NULL,
    "cuit" VARCHAR(20),
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "nombre_proveedor" VARCHAR(100),
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "servicio" (
    "id_servicio" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" BOOLEAN DEFAULT true,

    CONSTRAINT "servicio_pkey" PRIMARY KEY ("id_servicio")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_cuit_key" ON "proveedor"("cuit");

-- AddForeignKey
ALTER TABLE "compra_insumo" ADD CONSTRAINT "compra_insumo_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id_proveedor") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_id_compra_fkey" FOREIGN KEY ("id_compra") REFERENCES "compra_insumo"("id_compra") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumo"("id_insumo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_orden_insumo" ADD CONSTRAINT "detalle_orden_insumo_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumo"("id_insumo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_orden_insumo" ADD CONSTRAINT "detalle_orden_insumo_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "orden_trabajo"("id_orden") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_orden_servicio" ADD CONSTRAINT "detalle_orden_servicio_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "orden_trabajo"("id_orden") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_orden_servicio" ADD CONSTRAINT "detalle_orden_servicio_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicio"("id_servicio") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "orden_trabajo"("id_orden") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historial_notificaciones" ADD CONSTRAINT "historial_notificaciones_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historial_notificaciones" ADD CONSTRAINT "historial_notificaciones_id_factura_fkey" FOREIGN KEY ("id_factura") REFERENCES "factura"("id_factura") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insumo" ADD CONSTRAINT "insumo_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id_proveedor") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos_parciales" ADD CONSTRAINT "pagos_parciales_id_factura_fkey" FOREIGN KEY ("id_factura") REFERENCES "factura"("id_factura") ON DELETE CASCADE ON UPDATE NO ACTION;
