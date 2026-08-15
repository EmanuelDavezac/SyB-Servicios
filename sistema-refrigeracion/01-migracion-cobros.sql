-- Migracion cobros con pagos parciales
-- Correr entero en Neon SQL Editor, rama produccion, base neondb.
-- Paso 0: verificaciones previas (ejecutar cada SELECT por separado antes de la migracion)

-- SELECT estado_pago, count(*) FROM factura GROUP BY estado_pago;
-- SELECT id_factura, estado_pago, monto_total, saldo_pendiente FROM factura ORDER BY id_factura;
-- SELECT * FROM pagos_parciales;
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'factura';
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'pagos_parciales';

BEGIN;

-- 1. Normalizar estados existentes: mayusculas, PENDIENTE -> IMPAGA
UPDATE factura SET estado_pago = upper(estado_pago) WHERE estado_pago IS NOT NULL;
UPDATE factura SET estado_pago = 'IMPAGA' WHERE estado_pago = 'PENDIENTE';
UPDATE factura SET estado_pago = 'IMPAGA' WHERE estado_pago IS NULL;

-- 2. Tabla recibo (cabecera de cobro)
CREATE TABLE recibo (
    id_recibo    SERIAL PRIMARY KEY,
    id_cliente   INTEGER NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    fecha_pago   DATE NOT NULL DEFAULT CURRENT_DATE,
    monto_total  DECIMAL(10,2) NOT NULL CHECK (monto_total > 0),
    forma_pago   VARCHAR(50),
    observacion  TEXT
);

CREATE INDEX idx_recibo_fecha_pago ON recibo(fecha_pago);
CREATE INDEX idx_recibo_id_cliente ON recibo(id_cliente);

-- 3. Backfill: un recibo por cada factura ya PAGADA, fechado en su fecha_emision
INSERT INTO recibo (id_cliente, fecha_pago, monto_total, forma_pago, observacion)
SELECT ot.id_cliente, f.fecha_emision, f.monto_total, 'No especificado', 'Backfill migracion cobros - factura #' || f.id_factura
FROM factura f
JOIN orden_trabajo ot ON ot.id_orden = f.id_orden
WHERE f.estado_pago = 'PAGADA' AND ot.id_cliente IS NOT NULL;

-- 4. Alterar pagos_parciales: agregar id_recibo, quitar forma_pago/fecha_pago, id_factura NOT NULL
ALTER TABLE pagos_parciales ADD COLUMN id_recibo INTEGER;

-- Vincular cada pago backfilled con su recibo (join 1 a 1 por factura via descripcion del recibo)
INSERT INTO pagos_parciales (id_factura, monto_pagado, id_recibo)
SELECT f.id_factura, f.monto_total, r.id_recibo
FROM factura f
JOIN recibo r ON r.observacion = 'Backfill migracion cobros - factura #' || f.id_factura
WHERE f.estado_pago = 'PAGADA';

ALTER TABLE pagos_parciales ADD CONSTRAINT fk_pagos_parciales_recibo
    FOREIGN KEY (id_recibo) REFERENCES recibo(id_recibo) ON DELETE CASCADE;
ALTER TABLE pagos_parciales ALTER COLUMN id_recibo SET NOT NULL;
ALTER TABLE pagos_parciales ALTER COLUMN id_factura SET NOT NULL;
ALTER TABLE pagos_parciales DROP COLUMN forma_pago;
ALTER TABLE pagos_parciales DROP COLUMN fecha_pago;
ALTER TABLE pagos_parciales ADD CONSTRAINT chk_pagos_parciales_monto_positivo CHECK (monto_pagado > 0);

CREATE INDEX idx_pagos_parciales_id_recibo ON pagos_parciales(id_recibo);
CREATE INDEX idx_pagos_parciales_id_factura ON pagos_parciales(id_factura);

-- 5. Inicializar saldo_pendiente en todas las facturas
UPDATE factura f
SET saldo_pendiente = f.monto_total - COALESCE((
    SELECT SUM(pp.monto_pagado) FROM pagos_parciales pp WHERE pp.id_factura = f.id_factura
), 0);

-- 6. CHECK sobre estado_pago, NOT NULL con default IMPAGA
ALTER TABLE factura ALTER COLUMN estado_pago SET DEFAULT 'IMPAGA';
ALTER TABLE factura ALTER COLUMN estado_pago SET NOT NULL;
ALTER TABLE factura ADD CONSTRAINT chk_factura_estado_pago
    CHECK (estado_pago IN ('IMPAGA', 'PARCIAL', 'PAGADA', 'ANULADA'));
ALTER TABLE factura ALTER COLUMN saldo_pendiente SET NOT NULL;

COMMIT;

-- Verificaciones posteriores (ejecutar cada SELECT por separado)

-- SELECT estado_pago, count(*) FROM factura GROUP BY estado_pago;
-- SELECT count(*) FROM recibo;
-- SELECT count(*) FROM pagos_parciales WHERE id_recibo IS NULL OR id_factura IS NULL;
-- SELECT f.id_factura, f.monto_total, f.saldo_pendiente, f.estado_pago FROM factura f ORDER BY f.id_factura;
-- SELECT r.id_recibo, r.id_cliente, r.fecha_pago, r.monto_total, pp.id_factura, pp.monto_pagado FROM recibo r JOIN pagos_parciales pp ON pp.id_recibo = r.id_recibo ORDER BY r.id_recibo;
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'factura'::regclass;
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pagos_parciales'::regclass;
