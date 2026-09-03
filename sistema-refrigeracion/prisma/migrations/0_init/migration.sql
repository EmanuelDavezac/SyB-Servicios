-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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
    "localidad" VARCHAR(100),
    "condicion_pago_dias" INTEGER NOT NULL DEFAULT 30,
    "fecha_alta" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "informe_tecnico" (
    "id_informe" SERIAL NOT NULL,
    "numero" VARCHAR(50),
    "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
    "id_cliente" INTEGER,
    "destinatario" VARCHAR(150) NOT NULL,
    "cuit" VARCHAR(20),
    "calle" VARCHAR(100),
    "num_calle" INTEGER,
    "localidad" VARCHAR(100),
    "descripcion" TEXT NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "informe_tecnico_pkey" PRIMARY KEY ("id_informe")
);

-- CreateTable
CREATE TABLE "compra_insumo" (
    "id_compra" SERIAL NOT NULL,
    "id_proveedor" INTEGER,
    "fecha_compra" DATE NOT NULL DEFAULT CURRENT_DATE,
    "costo_total" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "neto" DECIMAL(10,2),
    "alicuota_iva" DECIMAL(5,2),

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
    "cantidad_usada" DECIMAL(10,3) NOT NULL,
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
    "descripcion_libre" VARCHAR(255),

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
    "saldo_pendiente" DECIMAL(10,2) NOT NULL,
    "estado_pago" VARCHAR(20) NOT NULL DEFAULT 'IMPAGA',
    "descripcion" TEXT,
    "neto" DECIMAL(10,2),
    "alicuota_iva" DECIMAL(5,2),
    "tipo_descuento" VARCHAR(20),
    "descuento_porcentaje" DECIMAL(5,2),
    "descuento_monto" DECIMAL(10,2),
    "equipo_descripcion" TEXT,

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
    "stock_actual" DECIMAL(10,3) DEFAULT 0,
    "stock_minimo" DECIMAL(10,3) DEFAULT 0,
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
    "id_factura" INTEGER NOT NULL,
    "monto_pagado" DECIMAL(10,2) NOT NULL,
    "id_recibo" INTEGER NOT NULL,

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

-- CreateTable
CREATE TABLE "servicio_insumo" (
    "id_servicio_ins" SERIAL NOT NULL,
    "id_servicio" INTEGER NOT NULL,
    "id_insumo" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "servicio_insumo_pkey" PRIMARY KEY ("id_servicio_ins")
);

-- CreateTable
CREATE TABLE "recibo" (
    "id_recibo" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "fecha_pago" DATE NOT NULL DEFAULT CURRENT_DATE,
    "monto_total" DECIMAL(10,2) NOT NULL,
    "forma_pago" VARCHAR(50),
    "observacion" TEXT,

    CONSTRAINT "recibo_pkey" PRIMARY KEY ("id_recibo")
);

-- CreateTable
CREATE TABLE "retencion" (
    "id_retencion" SERIAL NOT NULL,
    "id_recibo" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "direccion" VARCHAR(10) NOT NULL DEFAULT 'SUFRIDA',
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "retencion_pkey" PRIMARY KEY ("id_retencion")
);

-- CreateTable
CREATE TABLE "detalle_presupuesto" (
    "id_detalle" SERIAL NOT NULL,
    "id_presupuesto" INTEGER NOT NULL,
    "orden_linea" INTEGER NOT NULL DEFAULT 1,
    "cantidad" DECIMAL(10,3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "id_servicio" INTEGER,

    CONSTRAINT "detalle_presupuesto_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "presupuesto" (
    "id_presupuesto" SERIAL NOT NULL,
    "numero" SERIAL NOT NULL,
    "id_cliente" INTEGER,
    "destinatario_nombre" VARCHAR(150) NOT NULL,
    "destinatario_cuit" VARCHAR(20),
    "destinatario_domicilio" VARCHAR(150),
    "destinatario_localidad" VARCHAR(100),
    "destinatario_condicion_iva" VARCHAR(50),
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_DATE,
    "validez_dias" INTEGER NOT NULL DEFAULT 5,
    "condicion_pago" VARCHAR(100),
    "alicuota_iva" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "id_orden" INTEGER,

    CONSTRAINT "presupuesto_pkey" PRIMARY KEY ("id_presupuesto")
);

-- CreateIndex
CREATE INDEX "informe_tecnico_fecha_idx" ON "informe_tecnico"("fecha");

-- CreateIndex
CREATE INDEX "compra_insumo_fecha_compra_idx" ON "compra_insumo"("fecha_compra");

-- CreateIndex
CREATE INDEX "compra_insumo_id_proveedor_idx" ON "compra_insumo"("id_proveedor");

-- CreateIndex
CREATE INDEX "factura_fecha_emision_idx" ON "factura"("fecha_emision");

-- CreateIndex
CREATE INDEX "factura_estado_pago_idx" ON "factura"("estado_pago");

-- CreateIndex
CREATE INDEX "factura_id_orden_idx" ON "factura"("id_orden");

-- CreateIndex
CREATE UNIQUE INDEX "historial_notificaciones_dedupe_unique" ON "historial_notificaciones"("id_factura", "tipo_notificacion", "fecha_creacion");

-- CreateIndex
CREATE INDEX "orden_trabajo_fecha_creacion_idx" ON "orden_trabajo"("fecha_creacion");

-- CreateIndex
CREATE INDEX "orden_trabajo_estado_trabajo_idx" ON "orden_trabajo"("estado_trabajo");

-- CreateIndex
CREATE INDEX "orden_trabajo_id_cliente_idx" ON "orden_trabajo"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_pagos_parciales_id_factura" ON "pagos_parciales"("id_factura");

-- CreateIndex
CREATE INDEX "idx_pagos_parciales_id_recibo" ON "pagos_parciales"("id_recibo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_cuit_key" ON "proveedor"("cuit");

-- CreateIndex
CREATE INDEX "idx_recibo_fecha_pago" ON "recibo"("fecha_pago");

-- CreateIndex
CREATE INDEX "idx_recibo_id_cliente" ON "recibo"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_retencion_id_recibo" ON "retencion"("id_recibo");

-- CreateIndex
CREATE INDEX "idx_retencion_tipo" ON "retencion"("tipo");

-- CreateIndex
CREATE INDEX "idx_detalle_presupuesto_id_presupuesto" ON "detalle_presupuesto"("id_presupuesto");

-- CreateIndex
CREATE UNIQUE INDEX "presupuesto_numero_key" ON "presupuesto"("numero");

-- CreateIndex
CREATE INDEX "idx_presupuesto_estado" ON "presupuesto"("estado");

-- CreateIndex
CREATE INDEX "idx_presupuesto_fecha_emision" ON "presupuesto"("fecha_emision");

-- CreateIndex
CREATE INDEX "idx_presupuesto_id_cliente" ON "presupuesto"("id_cliente");

-- AddForeignKey
ALTER TABLE "informe_tecnico" ADD CONSTRAINT "informe_tecnico_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE SET NULL ON UPDATE NO ACTION;

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
ALTER TABLE "pagos_parciales" ADD CONSTRAINT "fk_pagos_parciales_recibo" FOREIGN KEY ("id_recibo") REFERENCES "recibo"("id_recibo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos_parciales" ADD CONSTRAINT "pagos_parciales_id_factura_fkey" FOREIGN KEY ("id_factura") REFERENCES "factura"("id_factura") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "servicio_insumo" ADD CONSTRAINT "servicio_insumo_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumo"("id_insumo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_insumo" ADD CONSTRAINT "servicio_insumo_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicio"("id_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibo" ADD CONSTRAINT "recibo_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "retencion" ADD CONSTRAINT "retencion_id_recibo_fkey" FOREIGN KEY ("id_recibo") REFERENCES "recibo"("id_recibo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_presupuesto" ADD CONSTRAINT "detalle_presupuesto_id_presupuesto_fkey" FOREIGN KEY ("id_presupuesto") REFERENCES "presupuesto"("id_presupuesto") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_presupuesto" ADD CONSTRAINT "detalle_presupuesto_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicio"("id_servicio") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "orden_trabajo"("id_orden") ON DELETE SET NULL ON UPDATE NO ACTION;
