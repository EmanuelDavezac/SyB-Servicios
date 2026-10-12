import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearPresupuesto,
  actualizarPresupuesto,
  cambiarEstadoPresupuesto,
  eliminarPresupuesto,
  obtenerPresupuestos,
  buscarDestinatarios,
  crearOrdenDesdePresupuesto,
} from "@/actions/presupuestos";
import { crearCliente } from "./factories";

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

  it("filtra por cliente/destinatario (CU19)", async () => {
    await crearPresupuesto(datosBase({ destinatario: { nombre: "Juan Perez" } }));
    await crearPresupuesto(datosBase({ destinatario: { nombre: "Maria Gomez" } }));

    const filtrados = await obtenerPresupuestos({ cliente: "perez" });

    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].destinatario_nombre).toBe("Juan Perez");
  });
});

describe("buscarDestinatarios (CU45)", () => {
  it("sugiere clientes activos", async () => {
    const cliente = await crearCliente({ nombre: "Roberto", apellido: "Diaz" });

    const sugerencias = await buscarDestinatarios("Diaz");

    expect(sugerencias).toHaveLength(1);
    expect(sugerencias[0].id_cliente).toBe(cliente.id_cliente);
    expect(sugerencias[0].nombre).toBe("Roberto Diaz");
  });

  it("tambien sugiere destinatarios de presupuestos anteriores sin cliente vinculado", async () => {
    await crearPresupuesto(datosBase({ destinatario: { nombre: "Carlos Ocasional", localidad: "Rosario" } }));

    const sugerencias = await buscarDestinatarios("Ocasional");

    expect(sugerencias).toHaveLength(1);
    expect(sugerencias[0].id_cliente).toBeNull();
    expect(sugerencias[0].nombre).toBe("Carlos Ocasional");
    expect(sugerencias[0].localidad).toBe("Rosario");
  });

  it("no repite un destinatario que ya aparece como cliente cargado", async () => {
    const cliente = await crearCliente({ nombre: "Laura", apellido: "Martinez" });
    await crearPresupuesto(
      datosBase({ destinatario: { id_cliente: cliente.id_cliente, nombre: "Laura Martinez" } })
    );
    // Presupuesto viejo del mismo nombre pero sin cliente vinculado (antes de cargarla).
    await crearPresupuesto(datosBase({ destinatario: { nombre: "Laura Martinez" } }));

    const sugerencias = await buscarDestinatarios("Martinez");

    expect(sugerencias).toHaveLength(1);
    expect(sugerencias[0].id_cliente).toBe(cliente.id_cliente);
  });

  it("menos de 2 caracteres no busca nada", async () => {
    const sugerencias = await buscarDestinatarios("a");
    expect(sugerencias).toEqual([]);
  });
});

describe("crearOrdenDesdePresupuesto (CU47)", () => {
  it("genera la orden con las lineas del presupuesto y guarda el vinculo", async () => {
    const cliente = await crearCliente();
    const creado = await crearPresupuesto(
      datosBase({
        destinatario: { id_cliente: cliente.id_cliente, nombre: `${cliente.nombre} ${cliente.apellido}` },
        lineas: [{ cantidad: 2, descripcion: "Carga de gas", precio_unitario: 500 }],
      })
    );
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");

    const resultado = await crearOrdenDesdePresupuesto(creado.presupuesto.id_presupuesto);

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.orden.id_cliente).toBe(cliente.id_cliente);
    expect(resultado.orden.estado_trabajo).toBe("Pendiente");

    const lineas = await prisma.detalle_orden_servicio.findMany({ where: { id_orden: resultado.orden.id_orden } });
    expect(lineas).toHaveLength(1);
    expect(lineas[0].cantidad).toBe(2);
    expect(Number(lineas[0].precio_acordado)).toBe(500);
    expect(lineas[0].descripcion_libre).toBe("Carga de gas");

    const presupuestoFinal = await prisma.presupuesto.findUnique({ where: { id_presupuesto: creado.presupuesto.id_presupuesto } });
    expect(presupuestoFinal?.id_orden).toBe(resultado.orden.id_orden);
  });

  it("una cantidad fraccionaria se pasa como 1 linea por el importe total, sin perder plata", async () => {
    const cliente = await crearCliente();
    const creado = await crearPresupuesto(
      datosBase({
        destinatario: { id_cliente: cliente.id_cliente, nombre: "x" },
        lineas: [{ cantidad: 2.5, descripcion: "Cano de cobre", precio_unitario: 100 }],
      })
    );
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");

    const resultado = await crearOrdenDesdePresupuesto(creado.presupuesto.id_presupuesto);

    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    const lineas = await prisma.detalle_orden_servicio.findMany({ where: { id_orden: resultado.orden.id_orden } });
    expect(lineas[0].cantidad).toBe(1);
    expect(Number(lineas[0].precio_acordado)).toBe(250);
  });

  it("rechaza si el presupuesto no esta ACEPTADO", async () => {
    const cliente = await crearCliente();
    const creado = await crearPresupuesto(
      datosBase({ destinatario: { id_cliente: cliente.id_cliente, nombre: "x" } })
    );
    expect(creado.success).toBe(true);
    if (!creado.success) return;

    const resultado = await crearOrdenDesdePresupuesto(creado.presupuesto.id_presupuesto);
    expect(resultado.success).toBe(false);
  });

  it("rechaza si no tiene cliente vinculado", async () => {
    const creado = await crearPresupuesto(datosBase({ destinatario: { nombre: "Sin cliente" } }));
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");

    const resultado = await crearOrdenDesdePresupuesto(creado.presupuesto.id_presupuesto);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("cliente vinculado");
  });

  it("no se puede generar dos veces la misma orden", async () => {
    const cliente = await crearCliente();
    const creado = await crearPresupuesto(
      datosBase({ destinatario: { id_cliente: cliente.id_cliente, nombre: "x" } })
    );
    expect(creado.success).toBe(true);
    if (!creado.success) return;
    await cambiarEstadoPresupuesto(creado.presupuesto.id_presupuesto, "ACEPTADO");

    const primera = await crearOrdenDesdePresupuesto(creado.presupuesto.id_presupuesto);
    expect(primera.success).toBe(true);

    const segunda = await crearOrdenDesdePresupuesto(creado.presupuesto.id_presupuesto);
    expect(segunda.success).toBe(false);
    expect(segunda.error).toContain("Ya se generó una orden");
  });
});
