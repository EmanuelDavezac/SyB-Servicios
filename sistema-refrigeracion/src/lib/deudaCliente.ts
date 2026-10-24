import type { Prisma } from "@prisma/client";
import { ESTADOS_COMPROBANTE } from "@/lib/estadoComprobante";

// Acepta tanto el cliente de Prisma normal como un TransactionClient: quien
// llama a darDeBajaCliente (clientes.ts) necesita calcular esto dentro de la
// misma transaccion que valida y da de baja; obtenerDeudaPorCliente
// (cobros.ts) lo llama fuera de una transaccion. No es "use server": es un
// helper de calculo puro sobre la base, no un endpoint.
type ClientePrisma = Prisma.TransactionClient;

export interface DeudaCliente {
    saldo: number;
    cantidadComprobantes: number;
}

/**
 * Deuda de un cliente: suma de saldo_pendiente y cantidad de comprobantes en
 * estado IMPAGA o PARCIAL cuya orden de trabajo es del cliente. Mismo
 * criterio que usa obtenerDeudaPorCliente (cobros.ts) y darDeBajaCliente
 * (clientes.ts), centralizado aca para que no se desincronicen.
 */
export async function obtenerDeudaCliente(db: ClientePrisma, id_cliente: number): Promise<DeudaCliente> {
    const agregado = await db.comprobante.aggregate({
        where: {
            estado_pago: { in: [ESTADOS_COMPROBANTE.IMPAGA, ESTADOS_COMPROBANTE.PARCIAL] },
            orden_trabajo: { id_cliente },
        },
        _sum: { saldo_pendiente: true },
        _count: { id_comprobante: true },
    });

    return {
        saldo: Number(agregado._sum.saldo_pendiente ?? 0),
        cantidadComprobantes: agregado._count.id_comprobante,
    };
}
