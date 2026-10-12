-- CreateTable
CREATE TABLE "recibo_medio_pago" (
    "id_medio_pago" SERIAL NOT NULL,
    "id_recibo" INTEGER NOT NULL,
    "forma_pago" VARCHAR(50) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "recibo_medio_pago_pkey" PRIMARY KEY ("id_medio_pago")
);

-- CreateIndex
CREATE INDEX "idx_recibo_medio_pago_id_recibo" ON "recibo_medio_pago"("id_recibo");

-- AddForeignKey
ALTER TABLE "recibo_medio_pago" ADD CONSTRAINT "recibo_medio_pago_id_recibo_fkey" FOREIGN KEY ("id_recibo") REFERENCES "recibo"("id_recibo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Indice que la migracion 20260922120000_factura_fiscal_e_iva_por_linea ya
-- declaraba pero que nunca quedo creado en Neon (se habian aplicado esas
-- columnas a mano, sin correr esa migracion completa). Se completa aca, de
-- paso, porque recien se marco esa migracion como aplicada: IF NOT EXISTS
-- para que no falle si en algun ambiente si llego a existir.
CREATE INDEX IF NOT EXISTS "factura_fiscal_idx" ON "factura"("fiscal");
