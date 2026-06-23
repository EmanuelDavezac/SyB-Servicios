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
} from "@/actions/ordenes";
import { obtenerServicios } from "@/actions/servicios";

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

        const [cat, srvs] = await Promise.all([
            obtenerServicios(),
            modoEdicion && ordenInicial
                ? obtenerServiciosDeOrden(ordenInicial.id_orden)
                : Promise.resolve([]),
        ]);
        setCatalogo(cat as unknown as ServicioCatalogo[]);
        setServiciosGuardados(srvs as DetalleServicio[]);
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
            if (res.success) setAbierto(false);
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

            setCargando(false);
            setIdCliente("");
            setEstadoTrabajo("Pendiente");
            setNotasInternas("");
            setServiciosPendientes([]);
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
            if (!confirm("¿Quitar este servicio?")) return;
            await quitarServicioDeOrden(item.id_detalle_srv);
            setServiciosGuardados((p) => p.filter((s) => s.id_detalle_srv !== item.id_detalle_srv));
        } else {
            setServiciosPendientes((p) => p.filter((s) => s._tmpId !== item._tmpId));
        }
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

    /* ── Modal content ── */
    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-start pt-10 z-[9999] p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col text-gray-800 my-auto">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <h3 className="text-lg font-bold tracking-wide">
                        {modoEdicion
                            ? `Editar Orden #${String(ordenInicial!.id_orden).padStart(5, "0")}`
                            : "Nueva Orden de Trabajo"}
                    </h3>
                    <button onClick={() => setAbierto(false)} className="text-white/70 hover:text-white text-2xl leading-none transition">
                        &times;
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">

                    {/* ── Datos de la orden ── */}
                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 border-b pb-1">Datos de la Orden</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                                <select
                                    value={idCliente}
                                    onChange={(e) => setIdCliente(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                <select
                                    value={estadoTrabajo}
                                    onChange={(e) => setEstadoTrabajo(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En proceso">En proceso</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                                <textarea
                                    value={notasInternas}
                                    onChange={(e) => setNotasInternas(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: El cliente pidió pasar los caños por el techo..."
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Servicios (siempre visible) ── */}
                    <section>
                        <div className="flex items-center justify-between mb-3 border-b pb-1">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600">
                                Servicios
                                {!modoEdicion && listaDisplay.length > 0 && (
                                    <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-amber-600">
                                        Se guardarán al crear la orden
                                    </span>
                                )}
                            </h4>
                            <button
                                onClick={() => setPanelAbierto((v) => !v)}
                                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1 rounded-full transition"
                            >
                                {panelAbierto ? "✕ Cerrar" : "+ Agregar servicio"}
                            </button>
                        </div>

                        {/* Lista */}
                        {listaDisplay.length === 0 ? (
                            <p className="text-xs text-gray-400 italic mb-2">Sin servicios cargados todavía.</p>
                        ) : (
                            <div className="space-y-1 mb-3">
                                {listaDisplay.map(({ key, nombre, cantidad, precio, pendiente, item }) => (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                                            pendiente ? "bg-amber-50 border border-amber-200" : "bg-blue-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {pendiente && (
                                                <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                                    pendiente
                                                </span>
                                            )}
                                            <span className={`font-medium ${pendiente ? "text-amber-900" : "text-blue-900"}`}>
                                                {nombre}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600 text-xs">
                                            <span>x{cantidad}</span>
                                            <span className={`font-semibold ${pendiente ? "text-amber-700" : "text-blue-700"}`}>
                                                {fmtMoney(precio)}
                                            </span>
                                            <button
                                                onClick={() => handleQuitar(item)}
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

                        {/* Panel agregar */}
                        {panelAbierto && (
                            <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
                                {/* Tabs */}
                                <div className="flex gap-2 text-xs font-semibold">
                                    <button
                                        onClick={() => setModoNuevo(false)}
                                        className={`px-3 py-1.5 rounded-full transition ${!modoNuevo ? "bg-blue-600 text-white" : "bg-white border text-gray-500 hover:bg-gray-100"}`}
                                    >
                                        Seleccionar existente
                                    </button>
                                    <button
                                        onClick={() => setModoNuevo(true)}
                                        className={`px-3 py-1.5 rounded-full transition ${modoNuevo ? "bg-blue-600 text-white" : "bg-white border text-gray-500 hover:bg-gray-100"}`}
                                    >
                                        Crear nuevo servicio
                                    </button>
                                </div>

                                {errSrv && (
                                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">{errSrv}</p>
                                )}

                                {/* Seleccionar existente */}
                                {!modoNuevo && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Servicio del catálogo</label>
                                            <select
                                                value={srvSeleccionado}
                                                onChange={(e) => handleSeleccionarSrv(e.target.value)}
                                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            >
                                                <option value="">Seleccioná...</option>
                                                {catalogo.map((s) => (
                                                    <option key={s.id_servicio} value={s.id_servicio}>
                                                        {s.nombre} — {fmtMoney(s.precio)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                                                <input
                                                    type="number" min="1"
                                                    value={cantExistente}
                                                    onChange={(e) => setCantExistente(e.target.value)}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Precio acordado ($)</label>
                                                <input
                                                    type="number"
                                                    value={precioExistente}
                                                    onChange={(e) => setPrecioExistente(e.target.value)}
                                                    placeholder="Precio"
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAgregarExistente}
                                            disabled={agregando || !srvSeleccionado}
                                            className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {agregando ? "Agregando..." : "Agregar a la orden"}
                                        </button>
                                    </div>
                                )}

                                {/* Crear nuevo */}
                                {modoNuevo && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del servicio *</label>
                                                <input
                                                    value={nuevoNombre}
                                                    onChange={(e) => setNuevoNombre(e.target.value)}
                                                    placeholder="Ej: Instalación split 3000 frigorías"
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
                                                <input
                                                    value={nuevaDesc}
                                                    onChange={(e) => setNuevaDesc(e.target.value)}
                                                    placeholder="Descripción breve..."
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Precio ($) *</label>
                                                <input
                                                    type="number"
                                                    value={nuevoPrecio}
                                                    onChange={(e) => setNuevoPrecio(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                                                <input
                                                    type="number" min="1"
                                                    value={nuevaCant}
                                                    onChange={(e) => setNuevaCant(e.target.value)}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 italic">
                                            El nuevo servicio se agregará al catálogo y a esta orden al mismo tiempo.
                                        </p>
                                        <button
                                            onClick={handleCrearNuevo}
                                            disabled={agregando || !nuevoNombre.trim() || !nuevoPrecio}
                                            className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {agregando ? "Creando..." : "Agregar servicio"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={() => setAbierto(false)}
                        className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        disabled={!idCliente || cargando}
                        className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cargando
                            ? "Guardando..."
                            : modoEdicion
                            ? "Guardar Cambios"
                            : `Crear Orden${serviciosPendientes.length > 0 ? ` + ${serviciosPendientes.length} servicio${serviciosPendientes.length > 1 ? "s" : ""}` : ""}`}
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
        </>
    );
}