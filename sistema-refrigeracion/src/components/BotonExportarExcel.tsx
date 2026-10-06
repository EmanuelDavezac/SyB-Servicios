"use client";

import * as XLSX from "xlsx";

interface Props {
  data: any;
  tipoReporte: string;
  mes: string;
  anio: string;
}

export default function BotonExportarExcel({ data, tipoReporte, mes, anio }: Props) {
  const exportar = () => {
    if (!data) return;

    let ws: XLSX.WorkSheet;
    const wb = XLSX.utils.book_new();
    let fileName = `Reporte_${tipoReporte}_${mes}_${anio}.xlsx`;

    if (tipoReporte === "ingresos-egresos") {
      const { movimientos, balanceGeneral, totalIngresos, totalEgresos, totalFacturado, totalFacturadoFiscal, totalFacturadoInterno } = data;
      const rows = movimientos.map((m: any) => ({
        Fecha: new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" }),
        Comprobante: m.comprobante,
        Tipo: m.tipo_comprobante,
        Entidad: m.entidad,
        Ingreso: m.tipo_comprobante === "Ingreso" ? m.monto : "",
        Egreso: m.tipo_comprobante === "Egreso" ? m.monto : "",
      }));
      
      // Filas en blanco para separar
      rows.push({ Fecha: "", Comprobante: "", Tipo: "", Entidad: "", Ingreso: "", Egreso: "" });
      
      // Resumen estadistico
      rows.push({ Fecha: "", Comprobante: "", Tipo: "", Entidad: "TOTAL INGRESOS COBRADOS", Ingreso: totalIngresos, Egreso: "" });
      rows.push({ Fecha: "", Comprobante: "", Tipo: "", Entidad: "TOTAL EGRESOS INSUMOS", Ingreso: "", Egreso: totalEgresos });
      rows.push({ Fecha: "", Comprobante: "", Tipo: "", Entidad: "BALANCE GENERAL", Ingreso: balanceGeneral, Egreso: "" });
      rows.push({ Fecha: "", Comprobante: "", Tipo: "", Entidad: "TOTAL FACTURADO EMITIDO", Ingreso: totalFacturado, Egreso: "" });

      ws = XLSX.utils.json_to_sheet(rows);
    } else if (tipoReporte === "servicios") {
      const rows = data.map((o: any) => ({
        Fecha: new Date(o.fecha_creacion).toLocaleDateString("es-AR", { timeZone: "UTC" }),
        Orden: `#${o.id_orden}`,
        Cliente: o.cliente ? `${o.cliente.nombre} ${o.cliente.apellido}` : "",
        Servicios: o.detalle_orden_servicio?.map((d:any) => d.servicio?.nombre).join(", ") || "",
        Estado: o.estado_trabajo
      }));
      ws = XLSX.utils.json_to_sheet(rows);
    } else if (tipoReporte === "clientes") {
      const rows = data.map((c: any) => ({
        Nombre: `${c.apellido || ""}, ${c.nombre || ""}`,
        "DNI / CUIT": c.cuit || "",
        Direccion: [c.calle ? `${c.calle} ${c.num_calle || ""}`.trim() : null, c.localidad].filter(Boolean).join(", "),
        Telefono: c.telefono || "",
        Email: c.email || "",
        "Fecha Alta": c.fecha_alta ? new Date(c.fecha_alta).toLocaleDateString("es-AR", { timeZone: "UTC" }) : ""
      }));
      ws = XLSX.utils.json_to_sheet(rows);
      fileName = `Clientes_${mes}_${anio}.xlsx`;
    } else if (tipoReporte === "iva") {
      const { ventas, compras, retenciones } = data;
      const rows = [
        { Categoria: "VENTAS", Concepto: "Importe Ventas (neto)", Monto: ventas.neto },
        { Categoria: "VENTAS", Concepto: "IVA Ventas", Monto: ventas.iva },
        { Categoria: "", Concepto: "", Monto: "" },
        { Categoria: "COMPRAS", Concepto: "Importe Compras (neto)", Monto: compras.neto },
        { Categoria: "COMPRAS", Concepto: "IVA Compras", Monto: compras.iva },
        { Categoria: "", Concepto: "", Monto: "" },
        { Categoria: "RETENCIONES SUFRIDAS", Concepto: "IVA", Monto: retenciones.IVA },
        { Categoria: "RETENCIONES SUFRIDAS", Concepto: "Ganancias", Monto: retenciones.GANANCIAS },
        { Categoria: "RETENCIONES SUFRIDAS", Concepto: "Ingresos Brutos", Monto: retenciones.IIBB },
        { Categoria: "RETENCIONES SUFRIDAS", Concepto: "SUSS", Monto: retenciones.SUSS },
      ];
      ws = XLSX.utils.json_to_sheet(rows);
    } else {
      return;
    }

    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <button 
      onClick={exportar} 
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      title="Exportar información a planilla de cálculos"
    >
      <i className="fas fa-file-excel"></i> Exportar Excel
    </button>
  );
}
