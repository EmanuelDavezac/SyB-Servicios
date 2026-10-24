"use server";

import { prisma } from "@/lib/prisma";

export async function obtenerClientes(filtros?: {
    nombre?: string;
    cuit?: string;
    estado?: string;
}) {
    try {
        await requerirUsuario();
        const nombre = filtros?.nombre?.trim();
        const cuit = filtros?.cuit?.trim();
        const estado = filtros?.estado;

        const clientes = await prisma.cliente.findMany({
            where: {
                ...(nombre
                    ? {
                          OR: [
                              { nombre: { contains: nombre, mode: "insensitive" } },
                              { apellido: { contains: nombre, mode: "insensitive" } },
                          ],
                      }
                    : {}),
                ...(cuit ? { cuit: { contains: cuit, mode: "insensitive" } } : {}),
                ...(estado === "Activo" ? { estado: true } : {}),
                ...(estado === "Inactivo" ? { estado: false } : {}),
            },
            orderBy: {
                apellido: "asc",
            },
        });

        return clientes;

    } catch (error) {
        console.error("Error al obtener los clientes:", error);
        // Devolvemos un arreglo vacío para que no se rompa la pantalla si hay un error
        return [];
    }
}

// Next.js nos da esta herramienta para actualizar la pantalla automáticamente
import { revalidatePath } from "next/cache";
import { requerirUsuario } from "@/lib/sesion";
import { ESTADOS_COMPROBANTE, TIPOS_COMPROBANTE_FACTURABLE, TOLERANCIA_MONTO } from "@/lib/estadoComprobante";
import { obtenerDeudaCliente } from "@/lib/deudaCliente";
import { ESTADOS_ORDEN_EN_CURSO } from "@/lib/estadosOrden";
import { validarDatosNumericosCliente } from "@/lib/validaciones-cliente";

async function cuitYaExiste(cuit: string, idExcluir?: number) {
    const existente = await prisma.cliente.findFirst({
        where: {
            cuit: { equals: cuit, mode: "insensitive" },
            ...(idExcluir ? { id_cliente: { not: idExcluir } } : {}),
        },
        select: { id_cliente: true },
    });
    return !!existente;
}

async function emailYaExiste(email: string, idExcluir?: number) {
    const existente = await prisma.cliente.findFirst({
        where: {
            email: { equals: email, mode: "insensitive" },
            ...(idExcluir ? { id_cliente: { not: idExcluir } } : {}),
        },
        select: { id_cliente: true },
    });
    return !!existente;
}

export async function crearCliente(datos: {
    nombre: string;
    apellido: string;
    cuit?: string;
    telefono?: string;
    email?: string;
    calle?: string;
    num_calle?: number;
    localidad?: string;
    condicion_pago_dias?: number;
}) {

    try {
        await requerirUsuario();
        const errorValidacion = validarDatosNumericosCliente(datos);
        if (errorValidacion) return { success: false, error: errorValidacion };
        const cuit = datos.cuit?.trim();
        if (cuit && (await cuitYaExiste(cuit))) {
            return { success: false, error: "Ya existe un cliente con ese DNI/CUIT" };
        }
        const email = datos.email?.trim();
        if (email && (await emailYaExiste(email))) {
            return { success: false, error: "Ya existe un cliente con ese email" };
        }

        const nuevoCliente = await prisma.cliente.create({
            data: {
                nombre: datos.nombre,
                apellido: datos.apellido,
                cuit: datos.cuit || null,
                telefono: datos.telefono || null,
                email: datos.email || null,
                calle: datos.calle || null,
                num_calle: datos.num_calle ?? null,
                localidad: datos.localidad || null,
                condicion_pago_dias: datos.condicion_pago_dias ?? 30,
            },
        });

        // Le avisa a Next.js que recargue la página de clientes para mostrar el nuevo
        revalidatePath("/clientes");
        return { success: true, cliente: nuevoCliente };

    } catch (error) {
        console.error("Error al crear cliente:", error);
        return { success: false, error: "No se pudo crear el cliente" };
    }
}

export async function actualizarCliente(id_cliente: number, datos: {
    nombre: string;
    apellido: string;
    cuit?: string;
    telefono?: string;
    email?: string;
    calle?: string;
    num_calle?: number;
    localidad?: string;
    condicion_pago_dias?: number;
}) {
    try {
        await requerirUsuario();
        const errorValidacion = validarDatosNumericosCliente(datos);
        if (errorValidacion) return { success: false, error: errorValidacion };
        const cuit = datos.cuit?.trim();
        if (cuit && (await cuitYaExiste(cuit, id_cliente))) {
            return { success: false, error: "Ya existe un cliente con ese DNI/CUIT" };
        }
        const email = datos.email?.trim();
        if (email && (await emailYaExiste(email, id_cliente))) {
            return { success: false, error: "Ya existe un cliente con ese email" };
        }

        const cliente = await prisma.cliente.update({
            where: { id_cliente },
            data: {
                nombre: datos.nombre,
                apellido: datos.apellido,
                cuit: datos.cuit || null,
                telefono: datos.telefono || null,
                email: datos.email || null,
                calle: datos.calle || null,
                num_calle: datos.num_calle ?? null,
                localidad: datos.localidad || null,
                ...(datos.condicion_pago_dias !== undefined ? { condicion_pago_dias: datos.condicion_pago_dias } : {}),
            },
        });

        revalidatePath("/clientes");
        return { success: true, cliente };

    } catch (error) {
        console.error("Error al actualizar cliente:", error);
        return { success: false, error: "No se pudo actualizar el cliente" };
    }
}

// Una orden Finalizado sin comprobante vigente (ninguna Comprobante no anulada; un
// Remito no cuenta) es trabajo ya entregado pero todavia no facturado: el cliente
// puede terminar debiendolo y hoy no aparece en obtenerDeudaCliente porque
// esa cuenta solo mira comprobantes ya emitidas. Mismo chequeo que
// ordenYaFacturada en ordenes.ts, en sentido inverso.
function ordenFinalizadaSinFacturar(id_cliente: number) {
    return {
        id_cliente,
        estado_trabajo: "Finalizado",
        comprobante: {
            none: {
                tipo: { in: [...TIPOS_COMPROBANTE_FACTURABLE] },
                estado_pago: { not: ESTADOS_COMPROBANTE.ANULADA },
            },
        },
    };
}

function revalidarListadosDeClientes() {
    // /clientes es el listado en si; los demas son pantallas que arman un
    // selector o buscador de clientes y no deben seguir ofreciendo a uno que
    // se acaba de dar de baja (o dejar de ofrecer a uno recien reactivado).
    revalidatePath("/clientes");
    revalidatePath("/ordenes");
    revalidatePath("/presupuestos");
    revalidatePath("/informes-tecnicos");
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

/**
 * Baja logica (estado = false), nunca un delete: un cliente dado de baja
 * sigue existiendo con todo su historial (ordenes, comprobantes), solo deja de
 * poder vincularse a operaciones nuevas (ver crearOrden/editarOrden,
 * buscarDestinatarios). Se rechaza si tiene deuda pendiente (comprobantes IMPAGA
 * o PARCIAL) o trabajo sin cerrar (ordenes Pendiente/En proceso, o
 * Finalizado todavia sin facturar), juntando todos los motivos en un solo
 * mensaje.
 */
export async function darDeBajaCliente(id_cliente: number) {
    try {
        await requerirUsuario();

        await prisma.$transaction(async (tx) => {
            const cliente = await tx.cliente.findUnique({ where: { id_cliente } });
            if (!cliente) {
                throw new Error("El cliente no existe");
            }
            if (!cliente.estado) {
                throw new Error("El cliente ya está dado de baja");
            }

            const { saldo, cantidadComprobantes } = await obtenerDeudaCliente(tx, id_cliente);
            // Las ordenes en curso (ESTADOS_ORDEN_EN_CURSO) ya cuentan por si
            // solas como "sin cerrar", mas alla de la plata.
            const ordenesSinCerrar = await tx.orden_trabajo.count({
                where: {
                    OR: [
                        { id_cliente, estado_trabajo: { in: ESTADOS_ORDEN_EN_CURSO } },
                        ordenFinalizadaSinFacturar(id_cliente),
                    ],
                },
            });

            const motivos: string[] = [];
            if (saldo > TOLERANCIA_MONTO) {
                motivos.push(
                    `adeuda ${formatCurrency(saldo)} en ${cantidadComprobantes} comprobante${cantidadComprobantes === 1 ? "" : "s"}`
                );
            }
            if (ordenesSinCerrar > 0) {
                motivos.push(
                    `tiene ${ordenesSinCerrar} orden${ordenesSinCerrar === 1 ? "" : "es"} de trabajo sin cerrar (en curso o finalizada sin facturar)`
                );
            }
            if (motivos.length > 0) {
                throw new Error(
                    `No se puede dar de baja a ${cliente.nombre} ${cliente.apellido}: ${motivos.join(" y ")}.`
                );
            }

            await tx.cliente.update({ where: { id_cliente }, data: { estado: false } });
        });

        revalidarListadosDeClientes();
        return { success: true };
    } catch (error) {
        console.error("Error al dar de baja cliente:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo dar de baja al cliente" };
    }
}

export async function reactivarCliente(id_cliente: number) {
    try {
        await requerirUsuario();
        const cliente = await prisma.cliente.findUnique({ where: { id_cliente } });
        if (!cliente) {
            return { success: false, error: "El cliente no existe" };
        }
        if (cliente.estado) {
            return { success: false, error: "El cliente ya está activo" };
        }

        await prisma.cliente.update({ where: { id_cliente }, data: { estado: true } });
        revalidarListadosDeClientes();
        return { success: true };
    } catch (error) {
        console.error("Error al reactivar cliente:", error);
        return { success: false, error: "No se pudo reactivar el cliente" };
    }
}
