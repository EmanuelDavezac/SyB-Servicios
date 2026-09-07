import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearPresupuesto,
  actualizarPresupuesto,
  cambiarEstadoPresupuesto,
  eliminarPresupuesto,
  obtenerPresupuestos,
} from "@/actions/presupuestos";

function datosBase(overrides: Partial<Parameters<typeof crearPresupuesto>[0]> = {}) {
  return {
    destinatario: { nombre: "Cliente Ocasional" },
    alicuota_iva: 21,
    lineas: [{ cantidad: 2, descripcion: "Servicio X", precio_unitario: 500 }],
    ...overrides,
  };
}

describe("crearPresupuesto", () => {
  it("guarda encabezado y lineas en una transaccion", async () => {
    const resultado = await crearPresupuesto(datosBase());

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    const guardado = await prisma.presupuesto.findUnique({
      where: { id_presupuesto: resultado.presupuesto.id_presupuesto },
      include: { detalle_presupuesto: true },
    });
    expect(guardado?.destinatario_nombre).toBe("Cliente Ocasional");
    expect(guardado?.detalle_presupuesto).toHaveLength(1);
    expect(Number(guardado?.detalle_presupuesto[0].cantidad)).toBe(2);
  });

  it("sin lineas falla y no deja encabezado huerfano", async () => {
    const antes = await prisma.presupuesto.count();
    const resultado = await crearPresupuesto(datosBase({ lineas: [] }));

    expect(resultado.success).toBe(false);
    const despues = await prisma.presupuesto.count();
    expect(despues).toBe(antes);
  });
});

describe("actualizarPresupuesto", () => {
  it("reemplaza lineas y conserva el numero", async () => {
    const creado = await crearPresupuesto(datosBase());
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    const numeroOriginal = creado.presupuesto.numero;

    const resultado = await actualizarPresupuesto(creado.presupuesto.id_presupuesto, datosBase({
      lineas: [{ cantidad: 1, descripcion: "Otro servicio", precio_unitario: 999 }],
    }));

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.presupuesto.numero).toBe(numeroOriginal);

    const detalle = await prisma.detalle_presupuesto.findMany({
      where: { id_presupuesto: creado.presupuesto.id_presupuesto },
    });
    expect(detalle).toHaveLength(1);
    expect(detalle[0].descripcion).toBe("Otro servicio");
  });

  it("no se puede modificar ACEPTADO", async () => {
    const creado = await crearPresupuesto(datosBase());
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");

    const resultado = await actualizarPresupuesto(creado.presupuesto.id_presupuesto, datosBase());
    expect(resultado.success).toBe(false);
  });

  it("no se puede modificar RECHAZADO", async () => {
    const creado = await crearPresupuesto(datosBase());
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "RECHAZADO");

    const resultado = await actualizarPresupuesto(creado.presupuesto.id_presupuesto, datosBase());
    expect(resultado.success).toBe(false);
  });
});

describe("cambiarEstadoPresupuesto", () => {
  it("solo permite cambiar desde PENDIENTE", async () => {
    const creado = await crearPresupuesto(datosBase());
    expect(creado.success).toBe(true);
    if (!creado.success) return;

    const primero = await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");
    expect(primero.success).toBe(true);

    const segundo = await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "RECHAZADO");
    expect(segundo.success).toBe(false);
  });
});

describe("eliminarPresupuesto", () => {
  it("solo desde PENDIENTE y borra las lineas", async () => {
    const creado = await crearPresupuesto(datosBase());
    expect(creado.success).toBe(true);
    if (!creado.success) return;

    const resultado = await eliminarPresupuesto(creado.presupuesto.id_presupuesto);
    expect(resultado.success).toBe(true);

    const detalle = await prisma.detalle_presupuesto.count({
      where: { id_presupuesto: creado.presupuesto.id_presupuesto },
    });
    expect(detalle).toBe(0);
  });

  it("no se puede eliminar si no esta PENDIENTE", async () => {
    const creado = await crearPresupuesto(datosBase());
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");

    const resultado = await eliminarPresupuesto(creado.presupuesto.id_presupuesto);
    expect(resultado.success).toBe(false);
  });
});

describe("obtenerPresupuestos", () => {
  it("calcula subtotal, IVA, total y vencimiento", async () => {
    await crearPresupuesto(
      datosBase({
        alicuota_iva: 21,
        validez_dias: 5,
        lineas: [{ cantidad: 2, descripcion: "Servicio X", precio_unitario: 500 }],
      })
    );

    const lista = await obtenerPresupuestos();
    const fila = lista[0];
    expect(fila.subtotal).toBe(1000);
    expect(fila.monto_iva).toBe(210);
    expect(fila.total).toBe(1210);
    expect(fila.fecha_vencimiento).toBeDefined();
  });

  it("el flag vencido se calcula sobre emision mas validez_dias", async () => {
    const fechaEmision = new Date();
    fechaEmision.setDate(fechaEmision.getDate() - 10);

    await crearPresupuesto(datosBase({ fecha_emision: fechaEmision, validez_dias: 5 }));
    await crearPresupuesto(datosBase({ fecha_emision: new Date(), validez_dias: 30 }));

    const lista = await obtenerPresupuestos();
    const vencido = lista.find((p: { vencido: boolean }) => p.vencido === true);
    const vigente = lista.find((p: { vencido: boolean }) => p.vencido === false);

    expect(vencido).toBeDefined();
    expect(vigente).toBeDefined();
  });
});
