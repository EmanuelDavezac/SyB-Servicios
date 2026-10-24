import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  darDeBajaCliente,
  reactivarCliente,
  crearCliente as crearClienteAction,
  actualizarCliente,
} from "@/actions/clientes";
import { crearOrden } from "@/actions/ordenes";
import { buscarDestinatarios } from "@/actions/presupuestos";
import { crearCliente, crearOrdenFinalizada, crearComprobanteEmitido } from "./factories";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

describe("darDeBajaCliente", () => {
  it("cliente sin deuda ni ordenes en curso: se da de baja, el registro sigue existiendo", async () => {
    const cliente = await crearCliente();

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(true);
    const actualizado = await prisma.cliente.findUnique({ where: { id_cliente: cliente.id_cliente } });
    expect(actualizado).not.toBeNull();
    expect(actualizado?.estado).toBe(false);
  });

  it("con comprobante IMPAGA: rechaza y el mensaje incluye el importe formateado", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    await crearComprobanteEmitido({ id_orden: orden.id_orden, estado_pago: "IMPAGA", saldo_pendiente: 125430 });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(formatCurrency(125430));
    expect(resultado.error).toContain("1 comprobante");

    const actualizado = await prisma.cliente.findUnique({ where: { id_cliente: cliente.id_cliente } });
    expect(actualizado?.estado).toBe(true);
  });

  it("con comprobante PARCIAL: rechaza", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    await crearComprobanteEmitido({ id_orden: orden.id_orden, estado_pago: "PARCIAL", saldo_pendiente: 500 });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(formatCurrency(500));
  });

  it("con orden Pendiente: rechaza", async () => {
    const cliente = await crearCliente();
    await crearOrdenFinalizada({ id_cliente: cliente.id_cliente, estado_trabajo: "Pendiente" });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("1 orden de trabajo sin cerrar");
  });

  it("con orden En proceso: rechaza", async () => {
    const cliente = await crearCliente();
    await crearOrdenFinalizada({ id_cliente: cliente.id_cliente, estado_trabajo: "En proceso" });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("en curso");
  });

  it("con deuda y orden en curso a la vez: el mensaje menciona los dos motivos", async () => {
    const cliente = await crearCliente();
    const ordenFacturada = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    await crearComprobanteEmitido({ id_orden: ordenFacturada.id_orden, estado_pago: "IMPAGA", saldo_pendiente: 1000 });
    await crearOrdenFinalizada({ id_cliente: cliente.id_cliente, estado_trabajo: "Pendiente" });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(formatCurrency(1000));
    expect(resultado.error).toContain("orden de trabajo sin cerrar");
  });

  it("comprobantes ANULADA, PAGADA o NO_APLICA no cuentan como deuda", async () => {
    const cliente = await crearCliente();
    // ordenA tiene, ademas de la anulada, un comprobante vigente (PAGADA): asi
    // se prueba que la ANULADA no suma deuda sin confundirse con el otro
    // motivo de bloqueo (orden Finalizado sin ninguna comprobante vigente).
    const ordenA = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const ordenB = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    const ordenC = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente });
    await crearComprobanteEmitido({ id_orden: ordenA.id_orden, estado_pago: "ANULADA", saldo_pendiente: 0 });
    await crearComprobanteEmitido({ id_orden: ordenA.id_orden, estado_pago: "PAGADA", saldo_pendiente: 0 });
    await crearComprobanteEmitido({ id_orden: ordenB.id_orden, estado_pago: "PAGADA", saldo_pendiente: 0 });
    await crearComprobanteEmitido({ id_orden: ordenC.id_orden, estado_pago: "NO_APLICA", saldo_pendiente: 0 });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(true);
  });

  it("una orden Finalizado SIN facturar bloquea la baja: el trabajo ya se entrego pero todavia puede deber", async () => {
    const cliente = await crearCliente();
    await crearOrdenFinalizada({ id_cliente: cliente.id_cliente, estado_trabajo: "Finalizado" });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("sin cerrar");
  });

  it("una orden Finalizado CON comprobante vigente (pagada) no bloquea la baja", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente, estado_trabajo: "Finalizado" });
    await crearComprobanteEmitido({ id_orden: orden.id_orden, estado_pago: "PAGADA", saldo_pendiente: 0 });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(true);
  });

  it("una orden Finalizado cuya unica comprobante esta ANULADA sigue contando como sin facturar: bloquea", async () => {
    const cliente = await crearCliente();
    const orden = await crearOrdenFinalizada({ id_cliente: cliente.id_cliente, estado_trabajo: "Finalizado" });
    await crearComprobanteEmitido({ id_orden: orden.id_orden, estado_pago: "ANULADA", saldo_pendiente: 0 });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("sin cerrar");
  });

  it("cliente ya inactivo: error", async () => {
    const cliente = await crearCliente({ estado: false });

    const resultado = await darDeBajaCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El cliente ya está dado de baja");
  });

  it("cliente inexistente: error", async () => {
    const resultado = await darDeBajaCliente(999999);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El cliente no existe");
  });
});

describe("reactivarCliente", () => {
  it("vuelve estado a true", async () => {
    const cliente = await crearCliente({ estado: false });

    const resultado = await reactivarCliente(cliente.id_cliente);

    expect(resultado.success).toBe(true);
    const actualizado = await prisma.cliente.findUnique({ where: { id_cliente: cliente.id_cliente } });
    expect(actualizado?.estado).toBe(true);
  });

  it("cliente ya activo: error", async () => {
    const cliente = await crearCliente();

    const resultado = await reactivarCliente(cliente.id_cliente);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El cliente ya está activo");
  });
});

describe("crearOrden con cliente inactivo", () => {
  it("rechaza", async () => {
    const cliente = await crearCliente({ estado: false });

    const resultado = await crearOrden({ id_cliente: cliente.id_cliente, estado_trabajo: "Pendiente" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El cliente seleccionado no existe o está dado de baja");
  });
});

describe("buscarDestinatarios", () => {
  it("no devuelve clientes inactivos", async () => {
    const activo = await crearCliente({ nombre: "Carlos", apellido: "Gomez" });
    const inactivo = await crearCliente({ nombre: "Carla", apellido: "Gomez", estado: false });

    const sugerencias = await buscarDestinatarios("Gomez");
    const ids = sugerencias.map((s: { id_cliente: number }) => s.id_cliente);

    expect(ids).toContain(activo.id_cliente);
    expect(ids).not.toContain(inactivo.id_cliente);
  });
});

describe("crearCliente / actualizarCliente - DNI/CUIT duplicado (CU04)", () => {
  it("crearCliente rechaza un CUIT ya usado", async () => {
    await crearCliente({ cuit: "20-12345678-9" });

    const resultado = await crearClienteAction({ nombre: "Pedro", apellido: "Gomez", cuit: "20-12345678-9" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("Ya existe un cliente con ese DNI/CUIT");
  });

  it("actualizarCliente rechaza cambiar el CUIT a uno que ya tiene otro cliente", async () => {
    await crearCliente({ cuit: "20-12345678-9" });
    const otro = await crearCliente({ nombre: "Pedro", apellido: "Gomez", cuit: "20-98765432-1" });

    const resultado = await actualizarCliente(otro.id_cliente, { nombre: "Pedro", apellido: "Gomez", cuit: "20-12345678-9" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("Ya existe un cliente con ese DNI/CUIT");
  });

  it("actualizarCliente permite guardar el cliente sin cambiar su propio CUIT", async () => {
    const cliente = await crearCliente({ cuit: "20-12345678-9" });

    const resultado = await actualizarCliente(cliente.id_cliente, {
      nombre: cliente.nombre,
      apellido: "Apellido Nuevo",
      cuit: "20-12345678-9",
    });

    expect(resultado.success).toBe(true);
  });
});

describe("crearCliente / actualizarCliente - correo duplicado (CU06)", () => {
  it("crearCliente rechaza un email ya usado", async () => {
    await crearCliente({ email: "juan@mail.com" });

    const resultado = await crearClienteAction({ nombre: "Pedro", apellido: "Gomez", email: "juan@mail.com" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("Ya existe un cliente con ese email");
  });

  it("actualizarCliente rechaza cambiar el email a uno que ya tiene otro cliente", async () => {
    await crearCliente({ email: "juan@mail.com" });
    const otro = await crearCliente({ nombre: "Pedro", apellido: "Gomez", email: "pedro@mail.com" });

    const resultado = await actualizarCliente(otro.id_cliente, { nombre: "Pedro", apellido: "Gomez", email: "juan@mail.com" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("Ya existe un cliente con ese email");
  });

  it("actualizarCliente permite guardar el cliente sin cambiar su propio email", async () => {
    const cliente = await crearCliente({ email: "juan@mail.com" });

    const resultado = await actualizarCliente(cliente.id_cliente, {
      nombre: cliente.nombre,
      apellido: "Apellido Nuevo",
      email: "juan@mail.com",
    });

    expect(resultado.success).toBe(true);
  });
});
