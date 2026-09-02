"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function obtenerInformesTecnicos() {
  try {
    const informes = await prisma.informe_tecnico.findMany({
      include: { cliente: true },
      orderBy: { fecha: "desc" },
    });

    return JSON.parse(JSON.stringify(informes));
  } catch (error) {
    console.error("Error obteniendo informes técnicos:", error);
    return [];
  }
}

export async function crearInformeTecnico(data: {
  id_cliente?: number | null;
  numero?: string;
  destinatario: string;
  cuit?: string;
  calle?: string;
  num_calle?: number;
  localidad?: string;
  descripcion: string;
}) {
  try {
    if (!data.destinatario.trim()) {
      return { success: false, error: "Completá a quién va destinado el informe." };
    }
    if (!data.descripcion.trim()) {
      return { success: false, error: "Completá el contenido del informe." };
    }

    const nuevoInforme = await prisma.informe_tecnico.create({
      data: {
        id_cliente: data.id_cliente || null,
        numero: data.numero?.trim() || null,
        destinatario: data.destinatario.trim(),
        cuit: data.cuit || null,
        calle: data.calle || null,
        num_calle: data.num_calle ?? null,
        localidad: data.localidad || null,
        descripcion: data.descripcion.trim(),
      },
    });

    revalidatePath("/informes-tecnicos");
    return { success: true, informe: JSON.parse(JSON.stringify(nuevoInforme)) };
  } catch (error) {
    console.error("Error creando informe técnico:", error);
    return { success: false, error: "No se pudo crear el informe técnico" };
  }
}

export async function anularInformeTecnico(id_informe: number) {
  try {
    const informe = await prisma.informe_tecnico.findUnique({ where: { id_informe } });
    if (!informe) {
      return { success: false, error: "El informe no existe" };
    }
    if (informe.estado === "ANULADO") {
      return { success: false, error: "El informe ya está anulado" };
    }

    await prisma.informe_tecnico.update({
      where: { id_informe },
      data: { estado: "ANULADO" },
    });

    revalidatePath("/informes-tecnicos");
    return { success: true };
  } catch (error) {
    console.error("Error anulando informe técnico:", error);
    return { success: false, error: "No se pudo anular el informe técnico" };
  }
}
