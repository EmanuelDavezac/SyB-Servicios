-- Renombra factura -> comprobante (y factura_iva -> comprobante_iva) sin tocar
-- datos. Todo es RENAME: filas, secuencias y FKs se conservan. Los objetos se
-- renombran de forma condicional porque el historial de migraciones no esta 100%
-- sincronizado con la DB real.

-- Tablas
ALTER TABLE "factura" RENAME TO "comprobante";
ALTER TABLE "factura_iva" RENAME TO "comprobante_iva";

-- Columnas
ALTER TABLE "comprobante" RENAME COLUMN "id_factura" TO "id_comprobante";
ALTER TABLE "comprobante" RENAME COLUMN "num_factura" TO "num_comprobante";
ALTER TABLE "comprobante_iva" RENAME COLUMN "id_factura_iva" TO "id_comprobante_iva";
ALTER TABLE "comprobante_iva" RENAME COLUMN "id_factura" TO "id_comprobante";
ALTER TABLE "pagos_parciales" RENAME COLUMN "id_factura" TO "id_comprobante";
ALTER TABLE "historial_notificaciones" RENAME COLUMN "id_factura" TO "id_comprobante";

-- Secuencias de los SERIAL
ALTER SEQUENCE IF EXISTS "factura_id_factura_seq" RENAME TO "comprobante_id_comprobante_seq";
ALTER SEQUENCE IF EXISTS "factura_iva_id_factura_iva_seq" RENAME TO "comprobante_iva_id_comprobante_iva_seq";

-- Indices
ALTER INDEX IF EXISTS "factura_fecha_emision_idx" RENAME TO "comprobante_fecha_emision_idx";
ALTER INDEX IF EXISTS "factura_estado_pago_idx" RENAME TO "comprobante_estado_pago_idx";
ALTER INDEX IF EXISTS "factura_id_orden_idx" RENAME TO "comprobante_id_orden_idx";
ALTER INDEX IF EXISTS "factura_fiscal_idx" RENAME TO "comprobante_fiscal_idx";
ALTER INDEX IF EXISTS "factura_iva_id_factura_idx" RENAME TO "comprobante_iva_id_comprobante_idx";
ALTER INDEX IF EXISTS "idx_pagos_parciales_id_factura" RENAME TO "idx_pagos_parciales_id_comprobante";

-- Primary keys y foreign keys
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('comprobante',              'factura_pkey',                           'comprobante_pkey'),
    ('comprobante_iva',          'factura_iva_pkey',                       'comprobante_iva_pkey'),
    ('comprobante',              'factura_id_orden_fkey',                  'comprobante_id_orden_fkey'),
    ('comprobante_iva',          'factura_iva_id_factura_fkey',            'comprobante_iva_id_comprobante_fkey'),
    ('pagos_parciales',          'pagos_parciales_id_factura_fkey',        'pagos_parciales_id_comprobante_fkey'),
    ('historial_notificaciones', 'historial_notificaciones_id_factura_fkey', 'historial_notificaciones_id_comprobante_fkey')
  ) AS t(tabla, viejo, nuevo)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class k ON k.oid = c.conrelid
      WHERE k.relname = r.tabla AND c.conname = r.viejo
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.tabla, r.viejo, r.nuevo);
    END IF;
  END LOOP;
END $$;
