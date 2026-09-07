import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearInformeTecnico, obtenerInformesTecnicos, anularInformeTecnico } from "@/actions/informesTecnicos";
import { crearCliente } from "./factories";

describe("crearInformeTecnico", () => {
  it("crea el informe con cliente asociado", async () => {
    const cliente = await crearCliente({ nombre: "Ana", apellido: "Gomez" });

    const resultado = await crearInformeTecnico({
      id_cliente: cliente.id_cliente,
      destinatario: "Ana Gomez",
      descripcion: "Se reviso el equipo, sin fallas encontradas.",
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.informe.id_cliente).toBe(cliente.id_cliente);
    expect(resultado.informe.estado).toBe("ACTIVO");
  });

  it("crea el informe sin cliente asociado", async () => {
    const resultado = await crearInformeTecnico({
      destinatario: "Consumidor Final",
      descripcion: "Revision de rutina.",
    });

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.informe.id_cliente).toBeNull();
  });

  it("destinatario vacio falla", async () => {
    const resultado = await crearInformeTecnico({ destinatario: "   ", descripcion: "Contenido valido" });
    expect(resultado.success).toBe(false);
  });

  it("descripcion vacia falla", async () => {
    const resultado = await crearInformeTecnico({ destinatario: "Alguien", descripcion: "   " });
    expect(resultado.success).toBe(false);
  });
});

describe("obtenerInformesTecnicos", () => {
  it("lista los informes creados", async () => {
    await crearInformeTecnico({ destinatario: "Cliente A", descripcion: "Informe A" });
    await crearInformeTecnico({ destinatario: "Cliente B", descripcion: "Informe B" });

    const informes = await obtenerInformesTecnicos();
    expect(informes).toHaveLength(2);
  });
});

describe("anularInformeTecnico", () => {
  it("cambia el estado a ANULADO", async () => {
    const creado = await crearInformeTecnico({ destinatario: "Cliente A", descripcion: "Informe A" });
    expect(creado.success).toBe(true);
    if (!creado.success) return;

    const resultado = await anularInformeTecnico(creado.informe.id_informe);
    expect(resultado.success).toBe(true);

    const final = await prisma.informe_tecnico.findUnique({ where: { id_informe: creado.informe.id_informe } });
    expect(final?.estado).toBe("ANULADO");
  });

  it("informe inexistente devuelve error", async () => {
    const resultado = await anularInformeTecnico(999999);
    expect(resultado.success).toBe(false);
  });

  it("doble anulacion falla", async () => {
    const creado = await crearInformeTecnico({ destinatario: "Cliente A", descripcion: "Informe A" });
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await anularInformeTecnico(creado.informe.id_informe);

    const resultado = await anularInformeTecnico(creado.informe.id_informe);
    expect(resultado.success).toBe(false);
  });
});
