import "server-only";

import { prisma } from "@/lib/prisma";

// Vive fuera de src/actions/servicios.ts ("use server") a proposito: todo lo
// exportado desde un archivo "use server" es un endpoint invocable por HTTP, y
// esta consulta no valida sesion. La usan servicios.ts y ordenes.ts, que ya
// validan sesion antes de llamarla.
export async function nombreDeServicioYaExiste(nombre: string, idExcluir?: number) {
    const existente = await prisma.servicio.findFirst({
        where: {
            nombre: { equals: nombre, mode: "insensitive" },
            ...(idExcluir ? { id_servicio: { not: idExcluir } } : {}),
        },
        select: { id_servicio: true },
    });
    return !!existente;
}
