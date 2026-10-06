import { prisma } from "./src/lib/prisma";

async function main() {
    const factura = await prisma.factura.findFirst({
        where: { num_factura: "Factura A-0074" }
    });
    if (!factura) {
        console.log("No invoice found.");
        process.exit(1);
    }
    console.log("Factura encontrda:", factura.id_factura, "estado:", factura.estado_pago, "vencimiento:", factura.fecha_vencimiento);
    
    const notificaciones = await prisma.historial_notificaciones.findMany({
        where: { id_factura: factura.id_factura }
    });
    console.log("Notificaciones:", notificaciones);
}

main().catch(console.error).finally(() => prisma.$disconnect());
