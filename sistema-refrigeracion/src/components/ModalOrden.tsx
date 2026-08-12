"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    crearOrden,
    editarOrden,
    agregarServicioAOrden,
    crearServicioYAgregarAOrden,
    quitarServicioDeOrden,
    obtenerServiciosDeOrden,
    agregarInsumoAOrden,
    quitarInsumoDeOrden,
    obtenerInsumosDeOrden,
} from "@/actions/ordenes";
import { obtenerServicios } from "@/actions/servicios";
import { obtenerInsumos } from "@/actions/insumos";
import ModalConfirmacion from "@/components/ModalConfirmacion";

/* ─── tipos ──────────────────────────────────────────────────── */
interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
}

interface ServicioCatalogo {
    id_servicio: number;
    nombre: string;
    precio: number | string;
    descripcion?: string | null;
}

/** Servicio ya guardado en la BD (modo edición) */
interface DetalleServicio {
    id_detalle_srv: number;
    id_servicio: number | null;
    cantidad: number;
    precio_acordado: number | string;
    servicio: { nombre: string } | null;
}

/** Servicio pendiente de guardar (modo nueva orden) */
type ServicioPendiente =
    | { _tmpId: string; tipo: "existente"; id_servicio: number; nombre: string; cantidad: number; precio_acordado: number }
    | { _tmpId: string; tipo: "nuevo"; nombre: string; descripcion?: string; precio: number; cantidad: number };

/** Insumo del catálogo */
interface InsumoCatalogo {
    id_insumo: number;
    nombre: string;
    precio_venta: number | string;
    stock_actual: number | null;
}

/** Insumo ya guardado en la BD (modo edición) */
interface DetalleInsumo {
    id_detalle_ord_insumo: number;
    id_insumo: number;
    cantidad_usada: number;
    precio_aplicado: number | string;
    insumo: { nombre: string } | null;
}

/** Insumo pendiente de guardar (modo nueva orden) */
interface InsumoPendiente {
    _tmpId: string;
    id_insumo: number;
    nombre: string;
    cantidad: number;
    precio_aplicado: number;
}

interface OrdenInicial {
    id_orden: number;
    id_cliente: number | null;
    estado_trabajo: string | null;
    notas_internas: string | null;
}

interface Props {
    clientes: Cliente[];
    ordenInicial?: OrdenInicial;
    trigger?: React.ReactNode;
}

/* ─── helpers ────────────────────────────────────────────────── */
const fmtMoney = (n: number | string) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
        typeof n === "string" ? parseFloat(n) : n
    );
let tmpCounter = 0;
const tmpId = () => `tmp-${++tmpCounter}`;

/* ─── componente ─────────────────────────────────────────────── */
export default function ModalOrden({ clientes, ordenInicial, trigger }: Props) {
    const modoEdicion = !!ordenInicial;

    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [mounted, setMounted] = useState(false);

    /* campos de la orden */
    const [idCliente, setIdCliente] = useState(
        ordenInicial ? String(ordenInicial.id_cliente ?? "") : ""
    );
    const [estadoTrabajo, setEstadoTrabajo] = useState(
        ordenInicial?.estado_trabajo ?? "Pendiente"
    );
    const [notasInternas, setNotasInternas] = useState(
        ordenInicial?.notas_internas ?? ""
    );

    /* catálogo de servicios */
    const [catalogo, setCatalogo] = useState<ServicioCatalogo[]>([]);

    /* servicios guardados en la BD (modo edición) */
    const [serviciosGuardados, setServiciosGuardados] = useState<DetalleServicio[]>([]);

    /* servicios pendientes de guardar (modo nueva orden) */
    const [serviciosPendientes, setServiciosPendientes] = useState<ServicioPendiente[]>([]);

    /* panel de agregar */
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [modoNuevo, setModoNuevo] = useState(false);
    /* campos seleccionar existente */
    const [srvSeleccionado, setSrvSeleccionado] = useState("");
    const [cantExistente, setCantExistente] = useState("1");
    const [precioExistente, setPrecioExistente] = useState("");
    /* campos crear nuevo */
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevaDesc, setNuevaDesc] = useState("");
    const [nuevoPrecio, setNuevoPrecio] = useState("");
    const [nuevaCant, setNuevaCant] = useState("1");

    const [agregando, setAgregando] = useState(false);
    const [errSrv, setErrSrv] = useState<string | null>(null);

    /* ── Insumos ── */
    const [catalogoInsumos, setCatalogoInsumos] = useState<InsumoCatalogo[]>([]);
    const [insumosGuardados, setInsumosGuardados] = useState<DetalleInsumo[]>([]);
    const [insumosPendientes, setInsumosPendientes] = useState<InsumoPendiente[]>([]);
    const [panelInsumoAbierto, setPanelInsumoAbierto] = useState(false);
    const [insumoSeleccionado, setInsumoSeleccionado] = useState("");
    const [cantInsumo, setCantInsumo] = useState("1");
    const [agregandoInsumo, setAgregandoInsumo] = useState(false);
    const [errInsumo, setErrInsumo] = useState<string | null>(null);

    /* ── Confirmaciones de quitar ── */
    const [itemAConfirmarSrv, setItemAConfirmarSrv] = useState<DetalleServicio | ServicioPendiente | null>(null);
    const [quitandoSrv, setQuitandoSrv] = useState(false);
    const [itemAConfirmarInsumo, setItemAConfirmarInsumo] = useState<DetalleInsumo | InsumoPendiente | null>(null);
    const [quitandoInsumo, setQuitandoInsumo] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    /* ── Abrir modal ── */
    async function handleAbrir() {
        if (modoEdicion && ordenInicial) {
            setIdCliente(String(ordenInicial.id_cliente ?? ""));
            setEstadoTrabajo(ordenInicial.estado_trabajo ?? "Pendiente");
            setNotasInternas(ordenInicial.notas_internas ?? "");
        }
        resetPanel();
        setServiciosPendientes([]);
        setAbierto(true);

        const [cat, srvs, catInsumos, insumos] = await Promise.all([
            obtenerServicios(),
            modoEdicion && ordenInicial
                ? obtenerServiciosDeOrden(ordenInicial.id_orden)
                : Promise.resolve([]),
            obtenerInsumos(),
            modoEdicion && ordenInicial
                ? obtenerInsumosDeOrden(ordenInicial.id_orden)
                : Promise.resolve([]),
        ]);
        setCatalogo(cat as unknown as ServicioCatalogo[]);
        setServiciosGuardados(srvs as DetalleServicio[]);
        setCatalogoInsumos(catInsumos as unknown as InsumoCatalogo[]);
        setInsumosGuardados(insumos as DetalleInsumo[]);
    }

    function resetPanel() {
        setPanelAbierto(false);
        setModoNuevo(false);
        setSrvSeleccionado("");
        setCantExistente("1");
        setPrecioExistente("");
        setNuevoNombre("");
        setNuevaDesc("");
        setNuevoPrecio("");
        setNuevaCant("1");
        setErrSrv(null);
    }

    function resetPanelInsumo() {
        setPanelInsumoAbierto(false);
        setInsumoSeleccionado("");
        setCantInsumo("1");
        setErrInsumo(null);
    }

    function handleSeleccionarSrv(idStr: string) {
        setSrvSeleccionado(idStr);
        const srv = catalogo.find((s) => String(s.id_servicio) === idStr);
        setPrecioExistente(srv ? String(parseFloat(String(srv.precio))) : "");
    }

    /* ── Guardar toda la orden ── */
    async function handleGuardar() {
        if (!idCliente) return;
        setCargando(true);

        if (modoEdicion && ordenInicial) {
            /* ── modo edición: solo actualiza campos de la orden ── */
            const res = await editarOrden(ordenInicial.id_orden, {
                id_cliente: Number(idCliente),
                estado_trabajo: estadoTrabajo,
                notas_internas: notasInternas || undefined,
            });
            setCargando(false);
            if (res.success) {
                setAbierto(false);
            }
            else alert("Error al guardar los cambios. Intentá de nuevo.");
        } else {
            /* ── modo nueva: crear orden y luego guardar servicios pendientes ── */
            const res = await crearOrden({
                id_cliente: Number(idCliente),
                estado_trabajo: estadoTrabajo,
                notas_internas: notasInternas || undefined,
            });

            if (!res.success || !res.orden) {
                setCargando(false);
                alert("Error al crear la orden. Intentá de nuevo.");
                return;
            }

            const id_orden = res.orden.id_orden;

            /* guardar cada servicio pendiente */
            for (const srv of serviciosPendientes) {
                if (srv.tipo === "existente") {
                    await agregarServicioAOrden({
                        id_orden,
                        id_servicio: srv.id_servicio,
                        cantidad: srv.cantidad,
                        precio_acordado: srv.precio_acordado,
                    });
                } else {
                    await crearServicioYAgregarAOrden({
                        id_orden,
                        nombre: srv.nombre,
                        descripcion: srv.descripcion,
                        precio: srv.precio,
                        cantidad: srv.cantidad,
                    });
                }
            }

            /* guardar cada insumo pendiente (sin descontar stock) */
            for (const ins of insumosPendientes) {
                await agregarInsumoAOrden({
                    id_orden,
                    id_insumo: ins.id_insumo,
                    cantidad: ins.cantidad,
                    precio_aplicado: ins.precio_aplicado,
                });
            }

            setCargando(false);
            setIdCliente("");
            setEstadoTrabajo("Pendiente");
            setNotasInternas("");
            setServiciosPendientes([]);
            setInsumosPendientes([]);
            setAbierto(false);
        }
    }


    /* ── Agregar servicio existente ──
       En modo edición → guarda en BD al instante.
       En modo nuevo   → agrega al estado local pendiente. */
    async function handleAgregarExistente() {
        if (!srvSeleccionado) { setErrSrv("Seleccioná un servicio."); return; }
        const cantidad = parseInt(cantExistente) || 1;
        const precio = parseFloat(precioExistente);
        if (isNaN(precio) || precio < 0) { setErrSrv("El precio no es válido."); return; }

        const srv = catalogo.find((s) => String(s.id_servicio) === srvSeleccionado)!;

        if (modoEdicion && ordenInicial) {
            setAgregando(true); setErrSrv(null);
            const res = await agregarServicioAOrden({
                id_orden: ordenInicial.id_orden,
                id_servicio: srv.id_servicio,
                cantidad,
                precio_acordado: precio,
            });
            if (res.success) {
                setServiciosGuardados(await obtenerServiciosDeOrden(ordenInicial.id_orden));
                resetPanel();
            } else setErrSrv(res.error || "Error al agregar.");
            setAgregando(false);
        } else {
            /* modo nueva orden: solo acumular en estado local */
            setServiciosPendientes((prev) => [
                ...prev,
                { _tmpId: tmpId(), tipo: "existente", id_servicio: srv.id_servicio, nombre: srv.nombre, cantidad, precio_acordado: precio },
            ]);
            resetPanel();
        }
    }

    /* ── Crear nuevo servicio ──
       En modo edición → guarda en BD al instante.
       En modo nuevo   → agrega al estado local pendiente. */
    async function handleCrearNuevo() {
        if (!nuevoNombre.trim()) { setErrSrv("El nombre es obligatorio."); return; }
        const precio = parseFloat(nuevoPrecio);
        if (isNaN(precio) || precio < 0) { setErrSrv("El precio no es válido."); return; }
        const cantidad = parseInt(nuevaCant) || 1;

        if (modoEdicion && ordenInicial) {
            setAgregando(true); setErrSrv(null);
            const res = await crearServicioYAgregarAOrden({
                id_orden: ordenInicial.id_orden,
                nombre: nuevoNombre.trim(),
                descripcion: nuevaDesc.trim() || undefined,
                precio,
                cantidad,
            });
            if (res.success) {
                setServiciosGuardados(await obtenerServiciosDeOrden(ordenInicial.id_orden));
                const cat = await obtenerServicios();
                setCatalogo(cat as unknown as ServicioCatalogo[]);
                resetPanel();
            } else setErrSrv(res.error || "Error al crear.");
            setAgregando(false);
        } else {
            setServiciosPendientes((prev) => [
                ...prev,
                { _tmpId: tmpId(), tipo: "nuevo", nombre: nuevoNombre.trim(), descripcion: nuevaDesc.trim() || undefined, precio, cantidad },
            ]);
            resetPanel();
        }
    }

    /* ── Quitar servicio ── */
    async function handleQuitar(item: DetalleServicio | ServicioPendiente) {
        if ("id_detalle_srv" in item) {
            setItemAConfirmarSrv(item);
        } else {
            setServiciosPendientes((p) => p.filter((s) => s._tmpId !== item._tmpId));
        }
    }

    async function confirmarQuitarSrv() {
        if (!itemAConfirmarSrv || !("id_detalle_srv" in itemAConfirmarSrv)) return;
        setQuitandoSrv(true);
        await quitarServicioDeOrden(itemAConfirmarSrv.id_detalle_srv);
        setServiciosGuardados((p) => p.filter((s) => s.id_detalle_srv !== (itemAConfirmarSrv as DetalleServicio).id_detalle_srv));
        setQuitandoSrv(false);
        setItemAConfirmarSrv(null);
    }

    /* ── Agregar insumo ── */
    async function handleAgregarInsumo() {
        if (!insumoSeleccionado) { setErrInsumo("Seleccioná un insumo."); return; }
        const cantidad = parseFloat(cantInsumo) || 0;
        if (cantidad <= 0) { setErrInsumo("La cantidad debe ser mayor a 0."); return; }

        const ins = catalogoInsumos.find((i) => String(i.id_insumo) === insumoSeleccionado)!;
        const precio = parseFloat(String(ins.precio_venta));

        if (modoEdicion && ordenInicial) {
            setAgregandoInsumo(true); setErrInsumo(null);
            const res = await agregarInsumoAOrden({
                id_orden: ordenInicial.id_orden,
                id_insumo: ins.id_insumo,
                cantidad,
                precio_aplicado: precio,
            });
            if (res.success) {
                setInsumosGuardados(await obtenerInsumosDeOrden(ordenInicial.id_orden));
                resetPanelInsumo();
            } else setErrInsumo(res.error || "Error al agregar.");
            setAgregandoInsumo(false);
        } else {
            setInsumosPendientes((prev) => [
                ...prev,
                { _tmpId: tmpId(), id_insumo: ins.id_insumo, nombre: ins.nombre, cantidad, precio_aplicado: precio },
            ]);
            resetPanelInsumo();
        }
    }

    /* ── Quitar insumo ── */
    async function handleQuitarInsumo(item: DetalleInsumo | InsumoPendiente) {
        if ("id_detalle_ord_insumo" in item) {
            setItemAConfirmarInsumo(item);
        } else {
            setInsumosPendientes((p) => p.filter((i) => i._tmpId !== item._tmpId));
        }
    }

    async function confirmarQuitarInsumo() {
        if (!itemAConfirmarInsumo || !("id_detalle_ord_insumo" in itemAConfirmarInsumo)) return;
        setQuitandoInsumo(true);
        await quitarInsumoDeOrden(itemAConfirmarInsumo.id_detalle_ord_insumo);
        setInsumosGuardados((p) => p.filter((i) => i.id_detalle_ord_insumo !== (itemAConfirmarInsumo as DetalleInsumo).id_detalle_ord_insumo));
        setQuitandoInsumo(false);
        setItemAConfirmarInsumo(null);
    }

    /* ── Lista unificada para el render ── */
    const listaDisplay: { key: string; nombre: string; cantidad: number; precio: number | string; pendiente: boolean; item: DetalleServicio | ServicioPendiente }[] = [
        ...serviciosGuardados.map((d) => ({
            key: `g-${d.id_detalle_srv}`,
            nombre: d.servicio?.nombre || "Servicio",
            cantidad: d.cantidad,
            precio: d.precio_acordado,
            pendiente: false,
            item: d,
        })),
        ...serviciosPendientes.map((p) => ({
            key: p._tmpId,
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio: p.tipo === "existente" ? p.precio_acordado : p.precio,
            pendiente: true,
            item: p,
        })),
    ];

    const insumosDisplay: { key: string; nombre: string; cantidad: number; precio: number; pendiente: boolean; item: DetalleInsumo | InsumoPendiente }[] = [
        ...insumosGuardados.map((d) => ({
            key: `gi-${d.id_detalle_ord_insumo}`,
            nombre: d.insumo?.nombre || "Insumo",
            cantidad: d.cantidad_usada,
            precio: parseFloat(String(d.precio_aplicado)),
            pendiente: false,
            item: d,
        })),
        ...insumosPendientes.map((p) => ({
            key: p._tmpId,
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio: p.precio_aplicado,
            pendiente: true,
            item: p,
        })),
    ];

    /* ── Modal content ── */
    const modalContent = (
        <div className="modal-backdrop overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col text-gray-800 my-auto">

                {/* Header */}
                <div className="modal-header">
                    <h3 className="text-xl font-bold">
                        {modoEdicion
                            ? `Editar Orden #${String(ordenInicial!.id_orden).padStart(5, "0")}`
                            : "Nueva Orden de Trabajo"}
                    </h3>
                    <button onClick={() => setAbierto(false)} className="text-white hover:text-white/80 text-2xl leading-none transition">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">

                    {/* ── Datos de la orden ── */}
                    <section>
                        <h4 className="section-title">DATOS DE LA ORDEN</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Cliente *</label>
                                <select
                                    value={idCliente}
                                    onChange={(e) => setIdCliente(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">Seleccioná un cliente...</option>
                                    {clientes.map((c) => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.apellido}, {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                                <select
                                    value={estadoTrabajo}
                                    onChange={(e) => setEstadoTrabajo(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En proceso">En proceso</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notas internas</label>
                                <textarea
                                    value={notasInternas}
                                    onChange={(e) => setNotasInternas(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: El cliente pidió pasar los caños por el techo..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Servicios ── */}
                    <section>
                        <div className="section-title">
                            <span>SERVICIOS</span>
                            <button
                                onClick={() => setPanelAbierto((v) => !v)}
                                className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-3 py-1 rounded-full transition"
                            >
                                {panelAbierto ? "✕ Cerrar" : "+ Agregar servicio"}
                            </button>
                        </div>

                        {/* Contenido de servicios */}
                        {listaDisplay.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-2">Sin servicios cargados todavía.</p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {listaDisplay.map(({ key, nombre, cantidad, precio, pendiente, item }) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between rounded-lg px-4 py-2 text-sm border border-gray-100 bg-gray-50/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            {pendiente && (
                                                <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                                    nuevo
                                                </span>
                                            )}
                                            <span className="font-medium text-gray-700">
                                                {nombre}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-500">
                                            <span className="text-xs">x{cantidad}</span>
                                            <span className="font-bold text-gray-800">
                                                {fmtMoney(precio)}
                                            </span>
                                            <button
                                                onClick={() => handleQuitar(item)}
                                                className="text-red-400 hover:text-red-600 transition"
                                                title="Quitar"
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Panel agregar (simplificado para match captura) */}
                        {panelAbierto && (
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-4">
                                <div className="flex gap-2 text-xs font-bold">
                                    <button
                                        onClick={() => setModoNuevo(false)}
                                        className={`px-4 py-1.5 rounded-full transition ${!modoNuevo ? "bg-blue-600 text-white shadow-md" : "bg-white border border-gray-200 text-gray-500"}`}
                                    >
                                        Seleccionar existente
                                    </button>
                                    <button
                                        onClick={() => setModoNuevo(true)}
                                        className={`px-4 py-1.5 rounded-full transition ${modoNuevo ? "bg-blue-600 text-white shadow-md" : "bg-white border border-gray-200 text-gray-500"}`}
                                    >
                                        Crear nuevo
                                    </button>
                                </div>

                                {errSrv && (
                                    <p className="text-xs text-red-600 font-bold">{errSrv}</p>
                                )}

                                {!modoNuevo ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Servicio *</label>
                                            <select
                                                value={srvSeleccionado}
                                                onChange={(e) => handleSeleccionarSrv(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                            >
                                                <option value="">Seleccioná...</option>
                                                {catalogo.map((s) => (
                                                    <option key={s.id_servicio} value={s.id_servicio}>
                                                        {s.nombre} ({fmtMoney(s.precio)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cant.</label>
                                            <input type="number" value={cantExistente} onChange={(e) => setCantExistente(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Precio Unit.</label>
                                            <input type="number" value={precioExistente} onChange={(e) => setPrecioExistente(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                                        </div>
                                        <button onClick={handleAgregarExistente} className="col-span-2 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700">Agregar Servicio</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre *</label>
                                            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Ej: Reparación de compresor" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Precio *</label>
                                            <input type="number" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cant.</label>
                                            <input type="number" value={nuevaCant} onChange={(e) => setNuevaCant(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                                        </div>
                                        <button onClick={handleCrearNuevo} className="col-span-2 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700">Crear y Agregar</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ── Insumos utilizados ── */}
                    <section>
                        <div className="flex items-center justify-between mb-3 border-b pb-1">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-orange-600">
                                Insumos Utilizados
                                <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-orange-400">
                                    (stock se descuenta al facturar)
                                </span>
                            </h4>
                            <button
                                onClick={() => setPanelInsumoAbierto((v) => !v)}
                                className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 font-semibold px-3 py-1 rounded-full transition"
                            >
                                {panelInsumoAbierto ? "✕ Cerrar" : "+ Agregar insumo"}
                            </button>
                        </div>

                        {/* Lista insumos */}
                        {insumosDisplay.length === 0 ? (
                            <p className="text-xs text-gray-400 italic mb-2">Sin insumos registrados.</p>
                        ) : (
                            <div className="space-y-1 mb-3">
                                {insumosDisplay.map(({ key, nombre, cantidad, precio, pendiente, item }) => (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                                            pendiente ? "bg-amber-50 border border-amber-200" : "bg-orange-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {pendiente && (
                                                <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                                    pendiente
                                                </span>
                                            )}
                                            <span className={`font-medium ${pendiente ? "text-amber-900" : "text-orange-900"}`}>
                                                {nombre}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600 text-xs">
                                            <span>x{cantidad}</span>
                                            <span className="font-bold text-gray-800">{fmtMoney(precio * cantidad)}</span>
                                            <button
                                                onClick={() => handleQuitarInsumo(item)}
                                                className="text-red-400 hover:text-red-600 transition font-bold text-base leading-none"
                                                title="Quitar"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Panel agregar insumo */}
                        {panelInsumoAbierto && (
                            <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
                                {errInsumo && (
                                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">{errInsumo}</p>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Insumo del stock</label>
                                    <select
                                        value={insumoSeleccionado}
                                        onChange={(e) => setInsumoSeleccionado(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    >
                                        <option value="">Seleccioná...</option>
                                        {catalogoInsumos.map((ins) => (
                                            <option key={ins.id_insumo} value={ins.id_insumo}>
                                                {ins.nombre} — Stock: {ins.stock_actual ?? 0}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad utilizada (ej. 0.5 para medio metro/kilo)</label>
                                    <input
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={cantInsumo}
                                        onChange={(e) => setCantInsumo(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <button
                                    onClick={handleAgregarInsumo}
                                    disabled={agregandoInsumo || !insumoSeleccionado}
                                    className="w-full py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {agregandoInsumo ? "Agregando..." : "Agregar insumo a la orden"}
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                <div className="modal-footer">
                    <button onClick={() => setAbierto(false)} className="btn-outline">
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        disabled={!idCliente || cargando}
                        className="btn-primary"
                    >
                        {cargando ? "Guardando..." : (modoEdicion ? "Guardar Cambios" : "Crear Orden")}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {trigger ? (
                <span onClick={handleAbrir} style={{ cursor: "pointer" }}>{trigger}</span>
            ) : (
                <button onClick={handleAbrir} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
                    + Nueva Orden
                </button>
            )}
            {abierto && mounted && createPortal(modalContent, document.body)}

            {/* ── Confirmación quitar servicio ── */}
            <ModalConfirmacion
                isOpen={!!itemAConfirmarSrv && "id_detalle_srv" in (itemAConfirmarSrv ?? {})}
                titulo="Quitar servicio"
                mensaje="¿Querés quitar este servicio de la orden? El servicio seguirá disponible en el catálogo."
                labelConfirmar="Quitar servicio"
                procesando={quitandoSrv}
                onConfirmar={confirmarQuitarSrv}
                onCancelar={() => setItemAConfirmarSrv(null)}
            />

            {/* ── Confirmación quitar insumo ── */}
            <ModalConfirmacion
                isOpen={!!itemAConfirmarInsumo && "id_detalle_ord_insumo" in (itemAConfirmarInsumo ?? {})}
                titulo="Quitar insumo"
                mensaje="¿Querés quitar este insumo de la orden?"
                labelConfirmar="Quitar insumo"
                procesando={quitandoInsumo}
                onConfirmar={confirmarQuitarInsumo}
                onCancelar={() => setItemAConfirmarInsumo(null)}
            />
        </>
    );
}