-- Migración: presupuestos + columnas de IVA en factura
-- Correr a mano en el Editor SQL de Neon, dentro de una transacción.
-- Después: npx prisma db pull && npx prisma generate

BEGIN;

-- ============================================================
-- Secuencia de numeración de presupuestos
-- Arranca en 953 porque el talonario en papel ya va por el 952.
-- ============================================================
CREATE SEQUENCE presupuesto_numero_seq START WITH 953;

-- ============================================================
-- Tabla presupuesto
-- ============================================================
CREATE TABLE presupuesto (
    id_presupuesto          serial PRIMARY KEY,
    numero                  int NOT NULL UNIQUE DEFAULT nextval('presupuesto_numero_seq'),
    id_cliente              int NULL REFERENCES cliente(id_cliente) ON DELETE SET NULL,

    -- Datos del destinatario, snapshot al momento de emitir (no join contra cliente)
    destinatario_nombre           varchar(150) NOT NULL,
    destinatario_cuit             varchar(20),
    destinatario_domicilio        varchar(150),
    destinatario_localidad        varchar(100),
    destinatario_condicion_iva    varchar(50),

    fecha_emision           date NOT NULL DEFAULT CURRENT_DATE,
    validez_dias            int NOT NULL DEFAULT 5,
    condicion_pago          varchar(100),
    alicuota_iva            numeric(5,2) NOT NULL DEFAULT 21,
    estado                  varchar(20) NOT NULL DEFAULT 'PENDIENTE'
                                 CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO')),
    observaciones           text,

    -- Sin usar todavía, es para la conversión presupuesto -> orden (paso siguiente)
    id_orden                int NULL REFERENCES orden_trabajo(id_orden) ON DELETE SET NULL
);

ALTER SEQUENCE presupuesto_numero_seq OWNED BY presupuesto.numero;

CREATE INDEX idx_presupuesto_id_cliente ON presupuesto(id_cliente);
CREATE INDEX idx_presupuesto_fecha_emision ON presupuesto(fecha_emision);
CREATE INDEX idx_presupuesto_estado ON presupuesto(estado);

-- ============================================================
-- Tabla detalle_presupuesto
-- ============================================================
CREATE TABLE detalle_presupuesto (
    id_detalle       serial PRIMARY KEY,
    id_presupuesto   int NOT NULL REFERENCES presupuesto(id_presupuesto) ON DELETE CASCADE,
    orden_linea      int NOT NULL DEFAULT 1,
    cantidad         numeric(10,3) NOT NULL CHECK (cantidad > 0),
    descripcion      text NOT NULL,
    precio_unitario  numeric(10,2) NOT NULL,
    id_servicio      int NULL REFERENCES servicio(id_servicio)
);

CREATE INDEX idx_detalle_presupuesto_id_presupuesto ON detalle_presupuesto(id_presupuesto);

-- ============================================================
-- Columnas de IVA en factura (nullable: no sabemos si las 16
-- facturas existentes son neto o total con IVA; se decide después)
-- ============================================================
ALTER TABLE factura ADD COLUMN neto numeric(10,2);
ALTER TABLE factura ADD COLUMN alicuota_iva numeric(5,2);

COMMIT;
