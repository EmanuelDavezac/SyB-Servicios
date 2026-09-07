import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearCliente } from "./factories";

describe("smoke", () => {
  it("crea un cliente y lo lee de vuelta", async () => {
    const creado = await crearCliente({ nombre: "Ana", apellido: "Gomez" });

    const leido = await prisma.cliente.findUnique({ where: { id_cliente: creado.id_cliente } });

    expect(leido).not.toBeNull();
    expect(leido?.nombre).toBe("Ana");
    expect(leido?.apellido).toBe("Gomez");
  });
});
