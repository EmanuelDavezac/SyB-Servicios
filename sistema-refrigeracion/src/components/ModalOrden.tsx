"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    crearOrden,
    editarOrden,
    agregarServicioAOrden,
    crearServicioYAgregarAOrden,
    agregarServicioLibreAOrden,
    quitarServicioDeOrden,
    obtenerServiciosDeOrden,
    agregarInsumoAOrden,
    quitarInsumoDeOrden,
    obtenerInsumosDeOrden,
    actualizarAlicuotaServicio,
    actualizarAlicuotaInsumo,
} from "@/actions/ordenes";
import { obtenerServicios } from "@/actions/servicios";
import { obtenerInsumos } from "@/actions/insumos";
import ModalConfirmacion from "@/components/ModalConfirmacion";
import { ALICUOTAS_IVA_SUGERIDAS, ALICUOTA_IVA_DEFAULT, alicuotaValida } from "@/lib/comprobantes";

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
    servicio_insumo?: {
        id_insumo: number;
        cantidad: number | string;
        insumo: { nombre: string; precio_venta: number | string } | null;
    }[];
}

/** Servicio ya guardado en la BD (modo edición) */
interface DetalleServicio {
    id_detalle_srv: number;
    id_servicio: number | null;
    cantidad: number;
    precio_acordado: number | string;
    servicio: { nombre: string } | null;
    descripcion_libre: string | null;
    alicuota_iva: number | string;
}

/** Servicio pendiente de guardar (modo nueva orden) */
type ServicioPendiente =
    | { _tmpId: string; tipo: "existente"; id_servicio: number; nombre: string; cantidad: number; precio_acordado: number; alicuota_iva: number }
    | { _tmpId: string; tipo: "nuevo"; nombre: string; descripcion?: string; precio: number; cantidad: number; alicuota_iva: number }
    | { _tmpId: string; tipo: "libre"; descripcion_libre: string; cantidad: number; precio_acordado: number; alicuota_iva: number };

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
    alicuota_iva: number | string;
    insumo: { nombre: string } | null;
}

/** Insumo pendiente de guardar (modo nueva orden) */
interface InsumoPendiente {
    _tmpId: string;
    id_insumo: number;
    nombre: string;
    cantidad: number;
    precio_aplicado: number;
    alicuota_iva: number;
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

type ModoPanel = "existente" | "libre" | "nuevo";

const DATALIST_IVA_ID = "orden-alicuotas-iva";

/** "21" / "10,5" -> número válido de alícuota, o null si no es válido */
function parseAlicuota(texto: string): number | null {
    const n = parseFloat(texto.replace(",", "."));
    return alicuotaValida(n) ? n : null;
}

/** Input de IVA % por línea. Guarda (onCommit) al salir del campo si el valor
 *  es válido y cambió; si es inválido vuelve al último valor guardado. */
function InputIva({
    valor,
    onCommit,
    className = "",
}: {
    valor: number;
    onCommit: (alicuota: number) => void | Promise<void>;
    className?: string;
}) {
    const [texto, setTexto] = useState(String(valor));
    // Si el valor guardado cambia desde afuera, el texto se resincroniza
    const [valorPrevio, setValorPrevio] = useState(valor);
    if (valor !== valorPrevio) {
        setValorPrevio(valor);
        setTexto(String(valor));
    }

    return (
        <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            list={DATALIST_IVA_ID}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => {
                const n = parseAlicuota(texto);
                if (n === null) { setTexto(String(valor)); return; }
                if (n !== valor) onCommit(n);
            }}
            title="Alícuota de IVA (%)"
            className={`w-16 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right bg-white ${className}`}
        />
    );
}

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
    const [modoPanel, setModoPanel] = useState<ModoPanel>("existente");
    /* campos seleccionar existente */
    const [srvSeleccionado, setSrvSeleccionado] = useState("");
    const [cantExistente, setCantExistente] = useState("1");
    const [precioExistente, setPrecioExistente] = useState("");
    /* campos crear nuevo (catálogo) */
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevaDesc, setNuevaDesc] = useState("");
    const [nuevoPrecio, setNuevoPrecio] = useState("");
    const [nuevaCant, setNuevaCant] = useState("1");
    /* campos descripcion libre */
    const [libreDesc, setLibreDesc] = useState("");
    const [librePrecio, setLibrePrecio] = useState("");
    const [libreCant, setLibreCant] = useState("1");
    /* IVA % del servicio a agregar (compartido por las 3 pestañas) */
    const [ivaServicio, setIvaServicio] = useState(String(ALICUOTA_IVA_DEFAULT));

    const [agregando, setAgregando] = useState(false);
    const [errSrv, setErrSrv] = useState<string | null>(null);

    /* ── Insumos ── */
    const [catalogoInsumos, setCatalogoInsumos] = useState<InsumoCatalogo[]>([]);
    const [insumosGuardados, setInsumosGuardados] = useState<DetalleInsumo[]>([]);
    const [insumosPendientes, setInsumosPendientes] = useState<InsumoPendiente[]>([]);
    const [panelInsumoAbierto, setPanelInsumoAbierto] = useState(false);
    const [insumoSeleccionado, setInsumoSeleccionado] = useState("");
    const [cantInsumo, setCantInsumo] = useState("1");
    const [ivaInsumo, setIvaInsumo] = useState(String(ALICUOTA_IVA_DEFAULT));
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
        setModoPanel("existente");
        setSrvSeleccionado("");
        setCantExistente("1");
        setPrecioExistente("");
        setNuevoNombre("");
        setNuevaDesc("");
        setNuevoPrecio("");
        setNuevaCant("1");
        setLibreDesc("");
        setLibrePrecio("");
        setLibreCant("1");
        setIvaServicio(String(ALICUOTA_IVA_DEFAULT));
        setErrSrv(null);
    }

    function resetPanelInsumo() {
        setPanelInsumoAbierto(false);
        setInsumoSeleccionado("");
        setCantInsumo("1");
        setIvaInsumo(String(ALICUOTA_IVA_DEFAULT));
        setErrInsumo(null);
    }

    /* ── Cambiar IVA % de una línea ya listada ── */
    async function cambiarIvaServicio(item: DetalleServicio | ServicioPendiente, alicuota: number) {
        if ("id_detalle_srv" in item) {
            const res = await actualizarAlicuotaServicio(item.id_detalle_srv, alicuota);
            if (!res.success) { setErrSrv(res.error || "No se pudo actualizar el IVA."); return; }
            setServiciosGuardados((p) => p.map((s) => s.id_detalle_srv === item.id_detalle_srv ? { ...s, alicuota_iva: alicuota } : s));
        } else {
            setServiciosPendientes((p) => p.map((s) => s._tmpId === item._tmpId ? { ...s, alicuota_iva: alicuota } : s));
        }
    }

    async function cambiarIvaInsumo(item: DetalleInsumo | InsumoPendiente, alicuota: number) {
        if ("id_detalle_ord_insumo" in item) {
            const res = await actualizarAlicuotaInsumo(item.id_detalle_ord_insumo, alicuota);
            if (!res.success) { setErrInsumo(res.error || "No se pudo actualizar el IVA."); return; }
            setInsumosGuardados((p) => p.map((i) => i.id_detalle_ord_insumo === item.id_detalle_ord_insumo ? { ...i, alicuota_iva: alicuota } : i));
        } else {
            setInsumosPendientes((p) => p.map((i) => i._tmpId === item._tmpId ? { ...i, alicuota_iva: alicuota } : i));
        }
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
            const res = await editarOrden(ordenInicial.id_orden, {
                id_cliente: Number(idCliente),
                estado_trabajo: estadoTrabajo,
                notas_internas: notasInternas || undefined,
            });
            setCargando(false);
            if (res.success) {
                setAbierto(false);
            } else alert("Error al guardar los cambios. Intentá de nuevo.");
        } else {
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

            for (const srv of serviciosPendientes) {
                if (srv.tipo === "existente") {
                    await agregarServicioAOrden({
                        id_orden,
                        id_servicio: srv.id_servicio,
                        cantidad: srv.cantidad,
                        precio_acordado: srv.precio_acordado,
                        alicuota_iva: srv.alicuota_iva,
                    });
                } else if (srv.tipo === "nuevo") {
                    await crearServicioYAgregarAOrden({
                        id_orden,
                        nombre: srv.nombre,
                        descripcion: srv.descripcion,
                        precio: srv.precio,
                        cantidad: srv.cantidad,
                        alicuota_iva: srv.alicuota_iva,
                    });
                } else {
                    await agregarServicioLibreAOrden({
                        id_orden,
                        descripcion_libre: srv.descripcion_libre,
                        cantidad: srv.cantidad,
                        precio_acordado: srv.precio_acordado,
                        alicuota_iva: srv.alicuota_iva,
                    });
                }
            }

            for (const ins of insumosPendientes) {
                await agregarInsumoAOrden({
                    id_orden,
                    id_insumo: ins.id_insumo,
                    cantidad: ins.cantidad,
                    precio_aplicado: ins.precio_aplicado,
                    alicuota_iva: ins.alicuota_iva,
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

    /* ── Agregar servicio del catálogo ── */
    async function handleAgregarExistente() {
        if (!srvSeleccionado) { setErrSrv("Seleccioná un servicio."); return; }
        const cantidad = parseInt(cantExistente) || 1;
        const precio = parseFloat(precioExistente);
        if (isNaN(precio) || precio < 0) { setErrSrv("El precio no es válido."); return; }
        const alicuota = parseAlicuota(ivaServicio);
        if (alicuota === null) { setErrSrv("El IVA debe estar entre 0 y 100."); return; }

        const srv = catalogo.find((s) => String(s.id_servicio) === srvSeleccionado)!;

        const recetaLineas = (srv.servicio_insumo ?? []).map((si) => ({
            id_insumo: si.id_insumo,
            nombre: si.insumo?.nombre ?? "Insumo",
            cantidad: (typeof si.cantidad === "string" ? parseFloat(si.cantidad) : si.cantidad) * cantidad,
            precio_aplicado: parseFloat(String(si.insumo?.precio_venta ?? 0)),
            alicuota_iva: ALICUOTA_IVA_DEFAULT,
        }));

        if (modoEdicion && ordenInicial) {
            setAgregando(true); setErrSrv(null);
            const res = await agregarServicioAOrden({
                id_orden: ordenInicial.id_orden,
                id_servicio: srv.id_servicio,
                cantidad,
                precio_acordado: precio,
                alicuota_iva: alicuota,
            });
            if (res.success) {
                for (const linea of recetaLineas) {
                    await agregarInsumoAOrden({
                        id_orden: ordenInicial.id_orden,
                        id_insumo: linea.id_insumo,
                        cantidad: linea.cantidad,
                        precio_aplicado: linea.precio_aplicado,
                        alicuota_iva: linea.alicuota_iva,
                    });
                }
                setServiciosGuardados(await obtenerServiciosDeOrden(ordenInicial.id_orden));
                if (recetaLineas.length > 0) {
                    setInsumosGuardados(await obtenerInsumosDeOrden(ordenInicial.id_orden));
                }
                resetPanel();
            } else setErrSrv(res.error || "Error al agregar.");
            setAgregando(false);
        } else {
            setServiciosPendientes((prev) => [
                ...prev,
                { _tmpId: tmpId(), tipo: "existente", id_servicio: srv.id_servicio, nombre: srv.nombre, cantidad, precio_acordado: precio, alicuota_iva: alicuota },
            ]);
            setInsumosPendientes((prev) => [
                ...prev,
                ...recetaLineas.map((linea) => ({ _tmpId: tmpId(), ...linea })),
            ]);
            resetPanel();
        }
    }

    /* ── Agregar descripcion libre (sin catálogo) ── */
    async function handleAgregarLibre() {
        if (!libreDesc.trim()) { setErrSrv("Describí qué se hizo."); return; }
        const precio = parseFloat(librePrecio);
        if (isNaN(precio) || precio < 0) { setErrSrv("El precio no es válido."); return; }
        const cantidad = parseInt(libreCant) || 1;
        const alicuota = parseAlicuota(ivaServicio);
        if (alicuota === null) { setErrSrv("El IVA debe estar entre 0 y 100."); return; }

        if (modoEdicion && ordenInicial) {
            setAgregando(true); setErrSrv(null);
            const res = await agregarServicioLibreAOrden({
                id_orden: ordenInicial.id_orden,
                descripcion_libre: libreDesc.trim(),
                cantidad,
                precio_acordado: precio,
                alicuota_iva: alicuota,
            });
            if (res.success) {
                setServiciosGuardados(await obtenerServiciosDeOrden(ordenInicial.id_orden));
                resetPanel();
            } else setErrSrv(res.error || "Error al agregar.");
            setAgregando(false);
        } else {
            setServiciosPendientes((prev) => [
                ...prev,
                { _tmpId: tmpId(), tipo: "libre", descripcion_libre: libreDesc.trim(), cantidad, precio_acordado: precio, alicuota_iva: alicuota },
            ]);
            resetPanel();
        }
    }

    /* ── Crear nuevo servicio en catálogo ── */
    async function handleCrearNuevo() {
        if (!nuevoNombre.trim()) { setErrSrv("El nombre es obligatorio."); return; }
        const precio = parseFloat(nuevoPrecio);
        if (isNaN(precio) || precio < 0) { setErrSrv("El precio no es válido."); return; }
        const cantidad = parseInt(nuevaCant) || 1;
        const alicuota = parseAlicuota(ivaServicio);
        if (alicuota === null) { setErrSrv("El IVA debe estar entre 0 y 100."); return; }

        if (modoEdicion && ordenInicial) {
            setAgregando(true); setErrSrv(null);
            const res = await crearServicioYAgregarAOrden({
                id_orden: ordenInicial.id_orden,
                nombre: nuevoNombre.trim(),
                descripcion: nuevaDesc.trim() || undefined,
                precio,
                cantidad,
                alicuota_iva: alicuota,
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
                { _tmpId: tmpId(), tipo: "nuevo", nombre: nuevoNombre.trim(), descripcion: nuevaDesc.trim() || undefined, precio, cantidad, alicuota_iva: alicuota },
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

        const alicuota = parseAlicuota(ivaInsumo);
        if (alicuota === null) { setErrInsumo("El IVA debe estar entre 0 y 100."); return; }

        const ins = catalogoInsumos.find((i) => String(i.id_insumo) === insumoSeleccionado)!;
        const precio = parseFloat(String(ins.precio_venta));

        if (modoEdicion && ordenInicial) {
            setAgregandoInsumo(true); setErrInsumo(null);
            const res = await agregarInsumoAOrden({
                id_orden: ordenInicial.id_orden,
                id_insumo: ins.id_insumo,
                cantidad,
                precio_aplicado: precio,
                alicuota_iva: alicuota,
            });
            if (res.success) {
                setInsumosGuardados(await obtenerInsumosDeOrden(ordenInicial.id_orden));
                resetPanelInsumo();
            } else setErrInsumo(res.error || "Error al agregar.");
            setAgregandoInsumo(false);
        } else {
            setInsumosPendientes((prev) => [
                ...prev,
                { _tmpId: tmpId(), id_insumo: ins.id_insumo, nombre: ins.nombre, cantidad, precio_aplicado: precio, alicuota_iva: alicuota },
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
    const listaDisplay: {
        key: string;
        nombre: string;
        cantidad: number;
        precio: number | string;
        alicuota: number;
        pendiente: boolean;
        libre: boolean;
        item: DetalleServicio | ServicioPendiente;
    }[] = [
        ...serviciosGuardados.map((d) => ({
            key: `g-${d.id_detalle_srv}`,
            nombre: d.descripcion_libre || d.servicio?.nombre || "Servicio",
            cantidad: d.cantidad,
            precio: d.precio_acordado,
            alicuota: parseFloat(String(d.alicuota_iva)),
            pendiente: false,
            libre: !!d.descripcion_libre,
            item: d,
        })),
        ...serviciosPendientes.map((p) => ({
            key: p._tmpId,
            nombre: p.tipo === "libre" ? p.descripcion_libre : p.nombre,
            cantidad: p.cantidad,
            precio: p.tipo === "existente" || p.tipo === "libre" ? p.precio_acordado : p.precio,
            alicuota: p.alicuota_iva,
            pendiente: true,
            libre: p.tipo === "libre",
            item: p,
        })),
    ];

    const insumosDisplay: {
        key: string;
        nombre: string;
        cantidad: number;
        precio: number;
        alicuota: number;
        pendiente: boolean;
        item: DetalleInsumo | InsumoPendiente;
    }[] = [
        ...insumosGuardados.map((d) => ({
            key: `gi-${d.id_detalle_ord_insumo}`,
            nombre: d.insumo?.nombre || "Insumo",
            cantidad: d.cantidad_usada,
            precio: parseFloat(String(d.precio_aplicado)),
            alicuota: parseFloat(String(d.alicuota_iva)),
            pendiente: false,
            item: d,
        })),
        ...insumosPendientes.map((p) => ({
            key: p._tmpId,
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio: p.precio_aplicado,
            alicuota: p.alicuota_iva,
            pendiente: true,
            item: p,
        })),
    ];

    const tabCls = (active: boolean) =>
        `px-4 py-1.5 rounded-full transition text-xs font-bold ${
            active ? "bg-blue-600 text-white shadow-md" : "bg-white border border-gray-200 text-gray-500"
        }`;

    /* ── Modal content ── */
    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-stretch md:items-center z-[9999] p-0 md:p-4">
            <div className="bg-white md:rounded-xl shadow-2xl w-full max-w-2xl flex flex-col text-gray-800 overflow-hidden md:max-h-[calc(100vh-2rem)]">

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

                <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1 min-h-0">

                    <datalist id={DATALIST_IVA_ID}>
                        {ALICUOTAS_IVA_SUGERIDAS.map((a) => (
                            <option key={a} value={a} />
                        ))}
                    </datalist>

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

                        {/* Lista servicios */}
                        {listaDisplay.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-2">Sin servicios cargados todavía.</p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {listaDisplay.map(({ key, nombre, cantidad, precio, alicuota, pendiente, libre, item }) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between rounded-lg px-4 py-2 text-sm border border-gray-100 bg-gray-50/50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {pendiente && (
                                                <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                                                    nuevo
                                                </span>
                                            )}
                                            {libre && !pendiente && (
                                                <span className="text-[9px] font-bold uppercase text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded shrink-0">
                                                    libre
                                                </span>
                                            )}
                                            <span className="font-medium text-gray-700 truncate" title={nombre}>
                                                {nombre}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-500 shrink-0">
                                            <span className="text-xs">x{cantidad}</span>
                                            <span className="font-bold text-gray-800">
                                                {fmtMoney(precio)}
                                            </span>
                                            <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                                                IVA
                                                <InputIva valor={alicuota} onCommit={(n) => cambiarIvaServicio(item, n)} />
                                                %
                                            </label>
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

                        {/* Panel agregar */}
                        {panelAbierto && (
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-4">
                                {/* Tabs */}
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setModoPanel("existente")} className={tabCls(modoPanel === "existente")}>
                                        Del catalogo
                                    </button>
                                    <button onClick={() => setModoPanel("libre")} className={tabCls(modoPanel === "libre")}>
                                        Solo en esta orden
                                    </button>
                                    <button onClick={() => setModoPanel("nuevo")} className={tabCls(modoPanel === "nuevo")}>
                                        Crear en catalogo
                                    </button>
                                </div>

                                {errSrv && (
                                    <p className="text-xs text-red-600 font-bold">{errSrv}</p>
                                )}

                                <div className="w-32">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">IVA %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        list={DATALIST_IVA_ID}
                                        value={ivaServicio}
                                        onChange={(e) => setIvaServicio(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                    />
                                </div>

                                {/* Tab: del catálogo */}
                                {modoPanel === "existente" && (
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
                                        <button
                                            onClick={handleAgregarExistente}
                                            disabled={agregando}
                                            className="col-span-2 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {agregando ? "Agregando..." : "Agregar Servicio"}
                                        </button>
                                    </div>
                                )}

                                {/* Tab: solo en esta orden */}
                                {modoPanel === "libre" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                Que se hizo *
                                            </label>
                                            <input
                                                value={libreDesc}
                                                onChange={(e) => setLibreDesc(e.target.value)}
                                                placeholder="Ej: Reparacion compresor split Carrier 3000 frigorias"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                Este texto aparece tal cual en el comprobante. No se agrega al catalogo de servicios.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Precio *</label>
                                            <input
                                                type="number"
                                                value={librePrecio}
                                                onChange={(e) => setLibrePrecio(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cant.</label>
                                            <input
                                                type="number"
                                                value={libreCant}
                                                onChange={(e) => setLibreCant(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAgregarLibre}
                                            disabled={agregando}
                                            className="col-span-2 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {agregando ? "Agregando..." : "Agregar"}
                                        </button>
                                    </div>
                                )}

                                {/* Tab: crear en catálogo */}
                                {modoPanel === "nuevo" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre *</label>
                                            <input
                                                value={nuevoNombre}
                                                onChange={(e) => setNuevoNombre(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                                placeholder="Ej: Reparación de compresor"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Precio *</label>
                                            <input type="number" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cant.</label>
                                            <input type="number" value={nuevaCant} onChange={(e) => setNuevaCant(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                                        </div>
                                        <button
                                            onClick={handleCrearNuevo}
                                            disabled={agregando}
                                            className="col-span-2 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {agregando ? "Creando..." : "Crear y Agregar"}
                                        </button>
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
                                {insumosDisplay.map(({ key, nombre, cantidad, precio, alicuota, pendiente, item }) => (
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
                                            <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                                                IVA
                                                <InputIva valor={alicuota} onCommit={(n) => cambiarIvaInsumo(item, n)} />
                                                %
                                            </label>
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
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">IVA %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        list={DATALIST_IVA_ID}
                                        value={ivaInsumo}
                                        onChange={(e) => setIvaInsumo(e.target.value)}
                                        className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
