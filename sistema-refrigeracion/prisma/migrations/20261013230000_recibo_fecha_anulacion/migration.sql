-- Anular un cobro ya no borra el recibo: se marca con la fecha de anulacion.
ALTER TABLE "recibo" ADD COLUMN "fecha_anulacion" TIMESTAMP(3);
