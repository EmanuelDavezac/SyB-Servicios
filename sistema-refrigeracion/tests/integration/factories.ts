import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function crearCliente(overrides: Partial<Prisma.clienteCreateInput> = {}) {
  return prisma.cliente.create({
    data: {
      nombre: "Juan",
      apellido: "Perez",
      condicion_pago_dias: 30,
      ...overrides,
    },
  });
}

export function crearProveedor(overrides: Partial<Prisma.proveedorCreateInput> = {}) {
  return prisma.proveedor.create({
    data: {
      razon_social: "Proveedor SRL",
      ...overrides,
    },
  });
}

export function crearInsumo(overrides: Partial<Prisma.insumoCreateInput> = {}) {
  return prisma.insumo.create({
    data: {
      nombre: "Gas R410a",
      descripcion: "kg",
      stock_actual: 10,
      stock_minimo: 2,
      precio_costo: 100,
      precio_venta: 200,
      ...overrides,
    },
  });
}

export function crearServicio(overrides: Partial<Prisma.servicioCreateInput> = {}) {
  return prisma.servicio.create({
    data: {
      nombre: "Carga de gas",
      precio: 1000,
      ...overrides,
    },
  });
}

interface LineaServicio {
  id_servicio?: number;
  cantidad?: number;
  precio_acordado?: number;
}

interface LineaInsumo {
  id_insumo?: number;
  cantidad_usada?: number;
  precio_aplicado?: number;
}

interface OrdenFinalizadaOptions {
  id_cliente?: number;
  estado_trabajo?: string;
  servicios?: LineaServicio[];
  insumos?: LineaInsumo[];
}

// Orden de trabajo con estado_trabajo "Finalizado", con al menos un servicio
// y un insumo cargados (por default, si no se pasan lineas explicitas), lista
// para pasarle a crearFactura.
export async function crearOrdenFinalizada(options: OrdenFinalizadaOptions = {}) {
  const id_cliente = options.id_cliente ?? (await crearCliente()).id_cliente;

  const servicios = options.servicios ?? [{}];
  const insumos = options.insumos ?? [{}];

  const lineasServicio = await Promise.all(
    servicios.map(async (linea) => ({
      id_servicio: linea.id_servicio ?? (await crearServicio()).id_servicio,
      cantidad: linea.cantidad ?? 1,
      precio_acordado: linea.precio_acordado ?? 1000,
    }))
  );

  const lineasInsumo = await Promise.all(
    insumos.map(async (linea) => ({
      id_insumo: linea.id_insumo ?? (await crearInsumo()).id_insumo,
      cantidad_usada: linea.cantidad_usada ?? 1,
      precio_aplicado: linea.precio_aplicado ?? 200,
    }))
  );

  return prisma.orden_trabajo.create({
    data: {
      id_cliente,
      estado_trabajo: options.estado_trabajo ?? "Finalizado",
      detalle_orden_servicio: { create: lineasServicio },
      detalle_orden_insumo: { create: lineasInsumo },
    },
    include: {
      detalle_orden_servicio: true,
      detalle_orden_insumo: true,
      cliente: true,
    },
  });
}

interface FacturaEmitidaOptions {
  id_orden?: number;
  tipo?: string;
  neto?: number;
  alicuota_iva?: number;
  monto_total?: number;
  saldo_pendiente?: number;
  estado_pago?: string;
  fecha_vencimiento?: Date;
}

// Comprobante ya emitido directo en la base (sin pasar por crearFactura), util
// para tests que necesitan una factura preexistente sin ejercitar esa action.
export async function crearFacturaEmitida(overrides: FacturaEmitidaOptions = {}) {
  const id_orden = overrides.id_orden ?? (await crearOrdenFinalizada()).id_orden;
  const neto = overrides.neto ?? 1000;
  const alicuota_iva = overrides.alicuota_iva ?? 21;
  const monto_total = overrides.monto_total ?? neto + neto * (alicuota_iva / 100);

  return prisma.factura.create({
    data: {
      id_orden,
      tipo: overrides.tipo ?? "Factura",
      num_factura: `F-${id_orden}`,
      fecha_emision: new Date(),
      fecha_vencimiento: overrides.fecha_vencimiento ?? null,
      neto,
      alicuota_iva,
      monto_total,
      saldo_pendiente: overrides.saldo_pendiente ?? monto_total,
      estado_pago: overrides.estado_pago ?? "IMPAGA",
    },
  });
}
