import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  darDeBajaServicio,
  reactivarServicio,
  actualizarRecetaServicio,
  crearServicio as crearServicioAction,
  editarServicio,
  obtenerServicios,
} from "@/actions/servicios";
import {
  darDeBajaInsumo,
  reactivarInsumo,
  crearInsumo,
  actualizarInsumo,
} from "@/actions/insumos";
import {
  darDeBajaProveedor,
  reactivarProveedor,
  crearProveedor as crearProveedorAction,
  editarProveedor,
  obtenerProveedores,
} from "@/actions/proveedores";
import { agregarServicioAOrden, agregarInsumoAOrden, crearOrden } from "@/actions/ordenes";
import { crearCompra } from "@/actions/compras";
import { crearCliente, crearServicio, crearInsumo as crearInsumoFactory, crearProveedor, crearOrdenFinalizada } from "./factories";

describe("darDeBajaServicio / reactivarServicio (CU10)", () => {
  it("se da de baja y el registro sigue existiendo", async () => {
    const servicio = await crearServicio();

    const resultado = await darDeBajaServicio(servicio.id_servicio);

    expect(resultado.success).toBe(true);
    const actualizado = await prisma.servicio.findUnique({ where: { id_servicio: servicio.id_servicio } });
    expect(actualizado).not.toBeNull();
    expect(actualizado?.estado).toBe(false);
  });

  it("bloquea si esta en una orden Pendiente", async () => {
    const servicio = await crearServicio();
    const orden = await crearOrdenFinalizada({
      estado_trabajo: "Pendiente",
      servicios: [{ id_servicio: servicio.id_servicio }],
    });

    const resultado = await darDeBajaServicio(servicio.id_servicio);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(`#${orden.id_orden}`);
  });

  it("bloquea si esta en una orden En proceso", async () => {
    const servicio = await crearServicio();
    await crearOrdenFinalizada({
      estado_trabajo: "En proceso",
      servicios: [{ id_servicio: servicio.id_servicio }],
    });

    const resultado = await darDeBajaServicio(servicio.id_servicio);

    expect(resultado.success).toBe(false);
  });

  it("una orden Finalizado no bloquea", async () => {
    const servicio = await crearServicio();
    await crearOrdenFinalizada({
      estado_trabajo: "Finalizado",
      servicios: [{ id_servicio: servicio.id_servicio }],
    });

    const resultado = await darDeBajaServicio(servicio.id_servicio);

    expect(resultado.success).toBe(true);
  });

  it("reactivar funciona", async () => {
    const servicio = await crearServicio({ estado: false });

    const resultado = await reactivarServicio(servicio.id_servicio);

    expect(resultado.success).toBe(true);
    const actualizado = await prisma.servicio.findUnique({ where: { id_servicio: servicio.id_servicio } });
    expect(actualizado?.estado).toBe(true);
  });

  it("no se puede dar de baja uno ya inactivo", async () => {
    const servicio = await crearServicio({ estado: false });
    const resultado = await darDeBajaServicio(servicio.id_servicio);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El servicio ya está dado de baja");
  });

  it("no se puede reactivar uno ya activo", async () => {
    const servicio = await crearServicio();
    const resultado = await reactivarServicio(servicio.id_servicio);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El servicio ya está activo");
  });

  it("actualizarRecetaServicio rechaza agregar un insumo inactivo nuevo", async () => {
    const servicio = await crearServicio();
    const insumoInactivo = await crearInsumoFactory({ estado: false });

    const resultado = await actualizarRecetaServicio(servicio.id_servicio, [
      { id_insumo: insumoInactivo.id_insumo, cantidad: 1 },
    ]);

    expect(resultado.success).toBe(false);
  });

  it("actualizarRecetaServicio preserva un insumo que ya estaba en la receta aunque se haya dado de baja despues", async () => {
    const servicio = await crearServicio();
    const insumo = await crearInsumoFactory();
    await prisma.servicio_insumo.create({ data: { id_servicio: servicio.id_servicio, id_insumo: insumo.id_insumo, cantidad: 1 } });
    await darDeBajaInsumo(insumo.id_insumo);

    // Se vuelve a guardar la receta sin tocarla (misma linea que ya tenia).
    const resultado = await actualizarRecetaServicio(servicio.id_servicio, [
      { id_insumo: insumo.id_insumo, cantidad: 2 },
    ]);

    expect(resultado.success).toBe(true);
    const receta = await prisma.servicio_insumo.findMany({ where: { id_servicio: servicio.id_servicio } });
    expect(receta).toHaveLength(1);
  });
});

describe("darDeBajaInsumo / reactivarInsumo (CU14)", () => {
  it("bloquea si esta en la receta de un servicio activo", async () => {
    const servicio = await crearServicio();
    const insumo = await crearInsumoFactory();
    await prisma.servicio_insumo.create({ data: { id_servicio: servicio.id_servicio, id_insumo: insumo.id_insumo, cantidad: 1 } });

    const resultado = await darDeBajaInsumo(insumo.id_insumo);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(servicio.nombre);
  });

  it("no bloquea si el servicio de la receta esta inactivo", async () => {
    const servicio = await crearServicio({ estado: false });
    const insumo = await crearInsumoFactory();
    await prisma.servicio_insumo.create({ data: { id_servicio: servicio.id_servicio, id_insumo: insumo.id_insumo, cantidad: 1 } });

    const resultado = await darDeBajaInsumo(insumo.id_insumo);

    expect(resultado.success).toBe(true);
  });

  it("reactivar funciona", async () => {
    const insumo = await crearInsumoFactory({ estado: false });
    const resultado = await reactivarInsumo(insumo.id_insumo);
    expect(resultado.success).toBe(true);
    const actualizado = await prisma.insumo.findUnique({ where: { id_insumo: insumo.id_insumo } });
    expect(actualizado?.estado).toBe(true);
  });

  it("no se puede dar de baja uno ya inactivo", async () => {
    const insumo = await crearInsumoFactory({ estado: false });
    const resultado = await darDeBajaInsumo(insumo.id_insumo);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El insumo ya está dado de baja");
  });

  it("no se puede reactivar uno ya activo", async () => {
    const insumo = await crearInsumoFactory();
    const resultado = await reactivarInsumo(insumo.id_insumo);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El insumo ya está activo");
  });

  it("crearInsumo rechaza un proveedor inactivo", async () => {
    const proveedor = await crearProveedor({ estado: false });

    const resultado = await crearInsumo({
      nombre: "Gas R134a",
      id_proveedor: proveedor.id_proveedor,
      stock_actual: 0,
      stock_minimo: 0,
      precio_costo: 100,
      precio_venta: 200,
    });

    expect(resultado.success).toBe(false);
  });

  it("actualizarInsumo rechaza cambiar a un proveedor distinto que este inactivo", async () => {
    const proveedorOriginal = await crearProveedor();
    const proveedorInactivo = await crearProveedor({ estado: false });
    const insumo = await crearInsumoFactory({ proveedor: { connect: { id_proveedor: proveedorOriginal.id_proveedor } } });

    const resultado = await actualizarInsumo(insumo.id_insumo, {
      nombre: insumo.nombre,
      id_proveedor: proveedorInactivo.id_proveedor,
      stock_actual: 0,
      stock_minimo: 0,
      precio_costo: 100,
      precio_venta: 200,
    });

    expect(resultado.success).toBe(false);
  });

  it("actualizarInsumo preserva el proveedor inactivo si no se lo cambia", async () => {
    const proveedor = await crearProveedor();
    const insumo = await crearInsumoFactory({ proveedor: { connect: { id_proveedor: proveedor.id_proveedor } } });
    await darDeBajaProveedor(proveedor.id_proveedor);

    const resultado = await actualizarInsumo(insumo.id_insumo, {
      nombre: "Nombre editado",
      id_proveedor: proveedor.id_proveedor,
      stock_actual: 0,
      stock_minimo: 0,
      precio_costo: 100,
      precio_venta: 200,
    });

    expect(resultado.success).toBe(true);
  });
});

describe("darDeBajaProveedor / reactivarProveedor (CU32)", () => {
  it("bloquea con insumos activos", async () => {
    const proveedor = await crearProveedor();
    const insumo = await crearInsumoFactory({ proveedor: { connect: { id_proveedor: proveedor.id_proveedor } } });

    const resultado = await darDeBajaProveedor(proveedor.id_proveedor);

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain(insumo.nombre);
  });

  it("no bloquea si todos sus insumos estan inactivos", async () => {
    const proveedor = await crearProveedor();
    await crearInsumoFactory({ proveedor: { connect: { id_proveedor: proveedor.id_proveedor } }, estado: false });

    const resultado = await darDeBajaProveedor(proveedor.id_proveedor);

    expect(resultado.success).toBe(true);
  });

  it("reactivar funciona", async () => {
    const proveedor = await crearProveedor({ estado: false });
    const resultado = await reactivarProveedor(proveedor.id_proveedor);
    expect(resultado.success).toBe(true);
    const actualizado = await prisma.proveedor.findUnique({ where: { id_proveedor: proveedor.id_proveedor } });
    expect(actualizado?.estado).toBe(true);
  });

  it("no se puede dar de baja uno ya inactivo", async () => {
    const proveedor = await crearProveedor({ estado: false });
    const resultado = await darDeBajaProveedor(proveedor.id_proveedor);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El proveedor ya está dado de baja");
  });

  it("no se puede reactivar uno ya activo", async () => {
    const proveedor = await crearProveedor();
    const resultado = await reactivarProveedor(proveedor.id_proveedor);
    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("El proveedor ya está activo");
  });
});

describe("Uso de entidades inactivas en operaciones nuevas", () => {
  it("agregarServicioAOrden rechaza un servicio inactivo", async () => {
    const cliente = await crearCliente();
    const servicioInactivo = await crearServicio({ estado: false });
    const ordenRes = await crearOrden({ id_cliente: cliente.id_cliente, estado_trabajo: "Pendiente" });
    expect(ordenRes.success).toBe(true);

    const resultado = await agregarServicioAOrden({
      id_orden: ordenRes.orden!.id_orden,
      id_servicio: servicioInactivo.id_servicio,
      cantidad: 1,
      precio_acordado: 1000,
    });

    expect(resultado.success).toBe(false);
  });

  it("agregarInsumoAOrden rechaza un insumo inactivo", async () => {
    const cliente = await crearCliente();
    const insumoInactivo = await crearInsumoFactory({ estado: false });
    const ordenRes = await crearOrden({ id_cliente: cliente.id_cliente, estado_trabajo: "Pendiente" });
    expect(ordenRes.success).toBe(true);

    const resultado = await agregarInsumoAOrden({
      id_orden: ordenRes.orden!.id_orden,
      id_insumo: insumoInactivo.id_insumo,
      cantidad: 1,
      precio_aplicado: 200,
    });

    expect(resultado.success).toBe(false);
  });

  it("crearCompra rechaza un proveedor inactivo", async () => {
    const proveedor = await crearProveedor({ estado: false });
    const insumo = await crearInsumoFactory();

    const resultado = await crearCompra({
      id_proveedor: proveedor.id_proveedor,
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumo.id_insumo, cantidad: 1, precio_unitario: 100 }],
    });

    expect(resultado.success).toBe(false);
  });

  it("crearCompra rechaza un insumo inactivo", async () => {
    const insumoInactivo = await crearInsumoFactory({ estado: false });

    const resultado = await crearCompra({
      alicuota_iva: 21,
      insumos: [{ id_insumo: insumoInactivo.id_insumo, cantidad: 1, precio_unitario: 100 }],
    });

    expect(resultado.success).toBe(false);
  });
});

describe("crearServicio / editarServicio - nombre duplicado (CU08)", () => {
  it("crearServicio rechaza un nombre ya usado", async () => {
    await crearServicio({ nombre: "Carga de gas R410a" });

    const resultado = await crearServicioAction({ nombre: "Carga de gas R410a", precio: 1000 });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("Ya existe un servicio con ese nombre");
  });

  it("crearServicio no distingue mayusculas/espacios", async () => {
    await crearServicio({ nombre: "Carga de gas R410a" });

    const resultado = await crearServicioAction({ nombre: "  CARGA DE GAS r410a  ", precio: 1000 });

    expect(resultado.success).toBe(false);
  });

  it("editarServicio rechaza renombrar a un nombre que ya tiene otro servicio", async () => {
    await crearServicio({ nombre: "Carga de gas R410a" });
    const otro = await crearServicio({ nombre: "Reparacion de compresor" });

    const resultado = await editarServicio(otro.id_servicio, { nombre: "Carga de gas R410a", precio: 500 });

    expect(resultado.success).toBe(false);
  });

  it("editarServicio permite guardar el servicio sin cambiar su propio nombre", async () => {
    const servicio = await crearServicio({ nombre: "Carga de gas R410a" });

    const resultado = await editarServicio(servicio.id_servicio, { nombre: "Carga de gas R410a", precio: 1500 });

    expect(resultado.success).toBe(true);
  });
});

describe("crearInsumo / actualizarInsumo - insumo duplicado (CU12)", () => {
  it("crearInsumo rechaza un nombre ya usado", async () => {
    await crearInsumoFactory({ nombre: "Gas R410a" });

    const resultado = await crearInsumo({
      nombre: "Gas R410a",
      stock_actual: 0,
      stock_minimo: 0,
      precio_costo: 100,
      precio_venta: 200,
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain("Ya existe un insumo con ese nombre");
  });

  it("actualizarInsumo rechaza renombrar a un nombre que ya tiene otro insumo", async () => {
    await crearInsumoFactory({ nombre: "Gas R410a" });
    const otro = await crearInsumoFactory({ nombre: "Cano de cobre 1/4" });

    const resultado = await actualizarInsumo(otro.id_insumo, {
      nombre: "Gas R410a",
      stock_actual: 0,
      stock_minimo: 0,
      precio_costo: 100,
      precio_venta: 200,
    });

    expect(resultado.success).toBe(false);
  });

  it("actualizarInsumo permite guardar el insumo sin cambiar su propio nombre", async () => {
    const insumo = await crearInsumoFactory({ nombre: "Gas R410a" });

    const resultado = await actualizarInsumo(insumo.id_insumo, {
      nombre: "Gas R410a",
      stock_actual: 5,
      stock_minimo: 1,
      precio_costo: 100,
      precio_venta: 200,
    });

    expect(resultado.success).toBe(true);
  });
});

describe("crearProveedor / editarProveedor - CUIT duplicado con mensaje claro (CU31)", () => {
  it("crearProveedor rechaza un CUIT ya usado, sin exponer el error generico de la base", async () => {
    await crearProveedor({ cuit: "30712345678" });

    const resultado = await crearProveedorAction({ razon_social: "Otro Proveedor SRL", cuit: "30712345678" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("Ya existe un proveedor con ese CUIT");
  });

  it("editarProveedor rechaza cambiar el CUIT a uno que ya tiene otro proveedor", async () => {
    await crearProveedor({ cuit: "30712345678" });
    const otro = await crearProveedor({ cuit: "30787654321" });

    const resultado = await editarProveedor(otro.id_proveedor, { razon_social: "Proveedor SRL", cuit: "30712345678" });

    expect(resultado.success).toBe(false);
    expect(resultado.error).toBe("Ya existe un proveedor con ese CUIT");
  });

  it("editarProveedor permite guardar el proveedor sin cambiar su propio CUIT", async () => {
    const proveedor = await crearProveedor({ cuit: "30712345678" });

    const resultado = await editarProveedor(proveedor.id_proveedor, { razon_social: "Nueva Razon Social", cuit: "30712345678" });

    expect(resultado.success).toBe(true);
  });
});

describe("obtenerServicios - filtros (CU25)", () => {
  it("filtra por nombre sin distinguir mayusculas", async () => {
    await crearServicio({ nombre: "Carga de gas R410a" });
    await crearServicio({ nombre: "Reparacion de compresor" });

    const resultado = await obtenerServicios({ nombre: "CARGA DE GAS" });

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Carga de gas R410a"]);
  });

  it("filtra por rango de precio: solo desde", async () => {
    await crearServicio({ nombre: "Barato", precio: 100 });
    await crearServicio({ nombre: "Caro", precio: 900 });

    const resultado = await obtenerServicios({ precioDesde: 500 });

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Caro"]);
  });

  it("filtra por rango de precio: solo hasta", async () => {
    await crearServicio({ nombre: "Barato", precio: 100 });
    await crearServicio({ nombre: "Caro", precio: 900 });

    const resultado = await obtenerServicios({ precioHasta: 500 });

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Barato"]);
  });

  it("filtra por rango de precio: desde y hasta", async () => {
    await crearServicio({ nombre: "Barato", precio: 100 });
    await crearServicio({ nombre: "Medio", precio: 500 });
    await crearServicio({ nombre: "Caro", precio: 900 });

    const resultado = await obtenerServicios({ precioDesde: 300, precioHasta: 700 });

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Medio"]);
  });

  it("un rango invertido (desde > hasta) no se aplica: trae todo", async () => {
    await crearServicio({ nombre: "Barato", precio: 100 });
    await crearServicio({ nombre: "Caro", precio: 900 });

    const resultado = await obtenerServicios({ precioDesde: 900, precioHasta: 100 });

    expect(resultado).toHaveLength(2);
  });

  it("filtra por estado Activo", async () => {
    await crearServicio({ nombre: "Activo uno", estado: true });
    await crearServicio({ nombre: "Inactivo uno", estado: false });

    const resultado = await obtenerServicios({ estado: "Activo" });

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Activo uno"]);
  });

  it("filtra por estado Inactivo", async () => {
    await crearServicio({ nombre: "Activo uno", estado: true });
    await crearServicio({ nombre: "Inactivo uno", estado: false });

    const resultado = await obtenerServicios({ estado: "Inactivo" });

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Inactivo uno"]);
  });

  it("sin filtros devuelve activos e inactivos", async () => {
    await crearServicio({ nombre: "Activo uno", estado: true });
    await crearServicio({ nombre: "Inactivo uno", estado: false });

    const resultado = await obtenerServicios({ incluirInactivos: true });

    expect(resultado).toHaveLength(2);
  });

  it("una llamada sin parametros (selectores) devuelve solo los activos", async () => {
    await crearServicio({ nombre: "Activo uno", estado: true });
    await crearServicio({ nombre: "Inactivo uno", estado: false });

    const resultado = await obtenerServicios();

    expect(resultado.map((s: { nombre: string }) => s.nombre)).toEqual(["Activo uno"]);
  });
});

describe("obtenerProveedores - filtros (CU33)", () => {
  it("filtra por razon social sin distinguir mayusculas", async () => {
    await crearProveedor({ razon_social: "Distribuidora Frio Sur" });
    await crearProveedor({ razon_social: "Repuestos del Centro" });

    const resultado = await obtenerProveedores({ razonSocial: "frio sur" });

    expect(resultado.map((p) => p.razon_social)).toEqual(["Distribuidora Frio Sur"]);
  });

  it("filtra por nombre de contacto (nombre_proveedor)", async () => {
    await crearProveedor({ razon_social: "Distribuidora SRL", nombre_proveedor: "Juan Garcia" });
    await crearProveedor({ razon_social: "Repuestos SA", nombre_proveedor: "Maria Lopez" });

    const resultado = await obtenerProveedores({ razonSocial: "Garcia" });

    expect(resultado.map((p) => p.razon_social)).toEqual(["Distribuidora SRL"]);
  });

  it("filtra por CUIT", async () => {
    await crearProveedor({ razon_social: "Uno", cuit: "30712345678" });
    await crearProveedor({ razon_social: "Dos", cuit: "30798765432" });

    const resultado = await obtenerProveedores({ cuit: "712345" });

    expect(resultado.map((p) => p.razon_social)).toEqual(["Uno"]);
  });

  it("filtra por estado Activo", async () => {
    await crearProveedor({ razon_social: "Activo uno", estado: true });
    await crearProveedor({ razon_social: "Inactivo uno", estado: false });

    const resultado = await obtenerProveedores({ estado: "Activo" });

    expect(resultado.map((p) => p.razon_social)).toEqual(["Activo uno"]);
  });

  it("filtra por estado Inactivo", async () => {
    await crearProveedor({ razon_social: "Activo uno", estado: true });
    await crearProveedor({ razon_social: "Inactivo uno", estado: false });

    const resultado = await obtenerProveedores({ estado: "Inactivo" });

    expect(resultado.map((p) => p.razon_social)).toEqual(["Inactivo uno"]);
  });

  it("sin filtros devuelve activos e inactivos", async () => {
    await crearProveedor({ razon_social: "Activo uno", estado: true });
    await crearProveedor({ razon_social: "Inactivo uno", estado: false });

    const resultado = await obtenerProveedores({ incluirInactivos: true });

    expect(resultado).toHaveLength(2);
  });

  it("una llamada sin parametros (selectores) devuelve solo los activos", async () => {
    await crearProveedor({ razon_social: "Activo uno", estado: true });
    await crearProveedor({ razon_social: "Inactivo uno", estado: false });

    const resultado = await obtenerProveedores();

    expect(resultado.map((p) => p.razon_social)).toEqual(["Activo uno"]);
  });
});
