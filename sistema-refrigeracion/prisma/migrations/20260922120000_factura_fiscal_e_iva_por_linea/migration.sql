-- AlterTable
ALTER TABLE "detalle_orden_insumo" ADD COLUMN     "alicuota_iva" DECIMAL(5,2) NOT NULL DEFAULT 21;

-- AlterTable
ALTER TABLE "detalle_orden_servicio" ADD COLUMN     "alicuota_iva" DECIMAL(5,2) NOT NULL DEFAULT 21;

-- AlterTable
ALTER TABLE "factura" ADD COLUMN     "fiscal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "punto_venta" INTEGER;

-- CreateTable
CREATE TABLE "factura_iva" (
    "id_factura_iva" SERIAL NOT NULL,
    "id_factura" INTEGER NOT NULL,
    "alicuota" DECIMAL(5,2) NOT NULL,
    "neto_gravado" DECIMAL(10,2) NOT NULL,
    "monto_iva" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "factura_iva_pkey" PRIMARY KEY ("id_factura_iva")
);

-- CreateIndex
CREATE INDEX "factura_iva_id_factura_idx" ON "factura_iva"("id_factura");

-- CreateIndex
CREATE INDEX "factura_fiscal_idx" ON "factura"("fiscal");

-- AddForeignKey
ALTER TABLE "factura_iva" ADD CONSTRAINT "factura_iva_id_factura_fkey" FOREIGN KEY ("id_factura") REFERENCES "factura"("id_factura") ON DELETE CASCADE ON UPDATE NO ACTION;
