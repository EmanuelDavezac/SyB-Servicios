"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getFacturas() {
  try {
    const facturas = await prisma.factura.findMany({
      include: {
        orden_trabajo: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: {
        fecha_emision: "desc",
      },
    });

    // We do JSON stringify/parse to handle Decimals correctly if needed in client components
    return JSON.parse(JSON.stringify(facturas));
  } catch (error) {
    console.error("Error fetching facturas:", error);
    return [];
  }
}

export async function getOrdenesPendientesFacturacion() {
  try {
    // Only fetch orders that are finished but don't have an invoice yet, or simply "Finalizada"
    const ordenes = await prisma.orden_trabajo.findMany({
      where: {
        estado_trabajo: "Finalizado", // assuming "Finalizado" is the state
      },
      include: {
        cliente: true,
        factura: true,
      },
      orderBy: {
        fecha_creacion: "desc",
      },
    });

    // You can filter out orders that already have an invoice if business rules dictate 1:1 relation
    return JSON.parse(JSON.stringify(ordenes));
  } catch (error) {
    console.error("Error fetching ordenes pendientes de facturación:", error);
    return [];
  }
}

export async function crearFactura(data: {
  id_orden: number;
  num_factura: string;
  tipo: string;
  monto_total: number;
  estado_pago: string;
  descripcion?: string;
  fecha_vencimiento?: Date;
}) {
  try {
    const nuevaFactura = await prisma.factura.create({
      data: {
        id_orden: data.id_orden,
        num_factura: data.num_factura,
        tipo: data.tipo,
        fecha_emision: new Date(),
        fecha_vencimiento: data.fecha_vencimiento,
        monto_total: data.monto_total,
        estado_pago: data.estado_pago,
        descripcion: data.descripcion,
      },
    });

    revalidatePath("/facturacion");
    return { success: true, factura: JSON.parse(JSON.stringify(nuevaFactura)) };
  } catch (error) {
    console.error("Error creating factura:", error);
    return { success: false, error: "Error al crear la factura" };
  }
}

export async function actualizarEstadoFactura(id_factura: number, estado_pago: string) {
  try {
    await prisma.factura.update({
      where: { id_factura },
      data: { estado_pago },
    });
    revalidatePath("/facturacion");
    return { success: true };
  } catch (error) {
    console.error("Error updating estado de factura:", error);
    return { success: false, error: "Error al actualizar estado" };
  }
}

export async function eliminarFactura(id_factura: number) {
  try {
    await prisma.factura.delete({
      where: { id_factura },
    });
    revalidatePath("/facturacion");
    return { success: true };
  } catch (error) {
    console.error("Error deleting factura:", error);
    return { success: false, error: "Error al eliminar la factura" };
  }
}
