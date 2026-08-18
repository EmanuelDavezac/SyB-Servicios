BEGIN;

ALTER TABLE factura
  ADD COLUMN tipo_descuento       varchar(20),
  ADD COLUMN descuento_porcentaje numeric(5,2),
  ADD COLUMN descuento_monto      numeric(10,2),
  ADD COLUMN equipo_descripcion   text;

ALTER TABLE factura
  ADD CONSTRAINT factura_tipo_descuento_check
  CHECK (tipo_descuento IN ('PORCENTAJE', 'EQUIPO'));

COMMIT;
