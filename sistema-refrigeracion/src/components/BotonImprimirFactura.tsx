"use client";

import { getFacturaCompleta } from "@/actions/facturacion";

interface Props {
    idFactura: number;
}

export default function BotonImprimirFactura({ idFactura }: Props) {

    async function handleImprimir() {
        const factura = await getFacturaCompleta(idFactura);
        if (!factura) {
            alert("No se pudo obtener los datos de la factura.");
            return;
        }

        const cliente = factura.orden_trabajo?.cliente;
        const servicios = factura.orden_trabajo?.detalle_orden_servicio || [];
        const insumos = factura.orden_trabajo?.detalle_orden_insumo || [];

        const nombreCliente = cliente
            ? `${cliente.nombre} ${cliente.apellido}`
            : "Sin cliente asignado";
        const cuitCliente = cliente?.cuit || "—";
        const direccionCliente = cliente?.calle
            ? `${cliente.calle} ${cliente.num_calle || ""}`
            : "—";
        const localidadCliente = cliente?.localidad || "—";

        const fechaEmision = new Date(factura.fecha_emision).toLocaleDateString("es-AR");

        const numeroInforme = `0001 – ${String(factura.id_factura).padStart(10, "0")}`;

        const formatMoney = (n: number) =>
            new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

        // Build services rows
        let serviciosHTML = "";
        let totalServicios = 0;
        for (const ds of servicios) {
            const nombre = ds.servicio?.nombre || "Servicio";
            const cant = ds.cantidad || 1;
            const precio = parseFloat(ds.precio_acordado);
            const subtotal = cant * precio;
            totalServicios += subtotal;
            serviciosHTML += `
                <tr>
                    <td class="center" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: center;">${cant}</td>
                    <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${nombre}</td>
                    <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">${formatMoney(subtotal)}</td>
                </tr>`;
        }

        // Build insumos rows
        let insumosHTML = "";
        let totalInsumos = 0;
        for (const di of insumos) {
            const nombre = di.insumo?.nombre || "Insumo";
            const cant = di.cantidad_usada || 1;
            const precio = parseFloat(di.precio_aplicado);
            const subtotal = cant * precio;
            totalInsumos += subtotal;
            insumosHTML += `
                <tr>
                    <td class="center" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: center;">${cant}</td>
                    <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${nombre}</td>
                    <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">${formatMoney(subtotal)}</td>
                </tr>`;
        }

        const montoTotal = parseFloat(factura.monto_total);

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Técnico ${numeroInforme}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
            padding: 20px 30px;
            font-size: 11px;
            line-height: 1.4;
        }
        .factura-container {
            border: 1.5px solid #000;
            width: 100%;
            max-width: 750px;
            margin: 0 auto;
        }
        .original-tag {
            text-align: center;
            font-weight: 700;
            font-size: 12px;
            border-bottom: 1.5px solid #000;
            padding: 3px 0;
        }

        /* ===== HEADER ===== */
        .header-row {
            display: flex;
            border-bottom: 2px solid #000;
        }
        .header-left {
            width: 42%;
            padding: 12px 16px;
            border-right: 1.5px solid #000;
            text-align: center;
        }
        .header-left .empresa-nombre {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 6px;
        }
        .header-left .empresa-datos {
            font-size: 9.5px;
            color: #222;
            line-height: 1.5;
        }
        .header-left .empresa-tipo {
            font-weight: 700;
            font-size: 10.5px;
            margin-top: 4px;
        }
        .header-mid {
            width: 18%;
            border-right: 1.5px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
        }
        .letra-box {
            width: 54px;
            height: 54px;
            border: 2px solid #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .letra-box .letra {
            font-size: 28px;
            font-weight: 900;
            line-height: 1;
        }
        .letra-box .cod {
            font-size: 6px;
            font-weight: 700;
            text-align: center;
            margin-top: 2px;
            line-height: 1.1;
        }
        .header-right {
            width: 40%;
            padding: 12px 16px;
        }
        .header-right .factura-titulo {
            font-size: 15px;
            font-weight: 800;
            margin-bottom: 6px;
        }
        .header-right .factura-numero {
            font-size: 11px;
            font-weight: 700;
            margin: 2px 0;
        }
        .header-right .factura-fecha {
            font-size: 11px;
            font-weight: 700;
            margin: 6px 0 2px;
        }

        /* ===== DATOS EMISOR EXTRA ===== */
        .datos-emisor {
            border-bottom: 2px solid #000;
            font-size: 10px;
            padding: 5px 16px;
        }
        .datos-emisor p { margin: 1px 0; }
        .datos-emisor .label { display: inline-block; width: 150px; }

        /* ===== DATOS CLIENTE ===== */
        .datos-cliente {
            border-bottom: 2px solid #000;
            padding: 6px 16px;
            font-size: 10.5px;
        }
        .datos-cliente p { margin: 2px 0; }
        .datos-cliente .fila { display: flex; justify-content: space-between; gap: 20px; }

        /* ===== TABLA ITEMS ===== */
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        .items-table thead th {
            background: #f0f0f0;
            border-bottom: 2px solid #000;
            padding: 6px 10px;
            font-size: 10px;
            font-weight: 700;
            text-align: left;
        }
        .items-table thead th.right { text-align: right; }
        .items-table thead th.center { text-align: center; }
        .items-table tbody td {
            padding: 5px 10px;
            border-bottom: 1px solid #ddd;
            font-size: 10.5px;
            vertical-align: top;
        }
        .items-table tbody td.right { text-align: right; }
        .items-table tbody td.center { text-align: center; }
        .items-table tbody tr.section-separator td {
            padding: 8px 10px 3px;
            font-weight: 700;
            font-size: 10px;
            color: #444;
            border-bottom: 1px solid #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .items-body-spacer {
            height: 100px;
        }

        /* ===== TOTALS ===== */
        .totals-row {
            border-top: 2px solid #000;
            display: flex;
            justify-content: flex-end;
        }
        .totals-box {
            width: 320px;
            border-left: 1px solid #000;
        }
        .totals-box .total-line {
            display: flex;
            justify-content: space-between;
            padding: 4px 15px;
            font-size: 11px;
            border-bottom: 1px solid #ddd;
        }
        .totals-box .total-line.grand {
            font-weight: 800;
            font-size: 13px;
            border-top: 2px solid #000;
            padding: 6px 15px;
            border-bottom: none;
        }

        /* ===== FIRMA TECNICO ===== */
        .firma-section {
            border-top: 2px solid #000;
            padding: 14px 16px 40px;
            font-size: 10.5px;
        }
        .firma-section p { margin: 1px 0; }

        /* ===== FOOTER ===== */
        .footer-section {
            border-top: 1.5px solid #000;
            padding: 6px 16px;
            font-size: 9.5px;
            text-align: center;
        }

        @media print {
            body { padding: 5px 10px; }
            .factura-container { border-width: 1.2px; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="factura-container">

        <div class="original-tag">ORIGINAL</div>

        <!-- HEADER ROW -->
        <div class="header-row">
            <div class="header-left">
                <div class="empresa-nombre">S&amp;B Servicios</div>
                <div class="empresa-datos">
                    CAVOUR 1613 – ESPERANZA - SANTA FE – C.P. 3080<br>
                    TEL.: 03496 – 15546618 / 15506054<br>
                    E-MAIL: sybservicios@hotmail.com
                </div>
                <div class="empresa-tipo">I.V.A.: RESPONSABLE INSCRIPTO</div>
            </div>

            <div class="header-mid">
                <div class="letra-box">
                    <div class="letra">X</div>
                    <div class="cod">NO VALIDO<br>COMO<br>FACTURA</div>
                </div>
            </div>

            <div class="header-right">
                <div class="factura-titulo">INFORME TECNICO DE SERVICIO</div>
                <div class="factura-numero">N° ${numeroInforme}</div>
                <div class="factura-fecha">FECHA: ${fechaEmision}</div>
            </div>
        </div>

        <!-- DATOS EMISOR EXTRAS -->
        <div class="datos-emisor">
            <p><span class="label">CUIT N°:</span> 30 – 71659775 – 6</p>
            <p><span class="label">INGR. BRUTOS:</span> 051 – 720706 – 0</p>
            <p><span class="label">DER. REG. E INSP:</span> 12127</p>
            <p><span class="label">INICIO DE ACTIVIDADES:</span> 01/09/2019</p>
        </div>

        <!-- DATOS CLIENTE -->
        <div class="datos-cliente">
            <p><strong>SR./ES.:</strong> ${nombreCliente}</p>
            <div class="fila">
                <p><strong>DOMICILIO:</strong> ${direccionCliente}</p>
                <p><strong>LOCALIDAD:</strong> ${localidadCliente}</p>
            </div>
            <p><strong>CUIT N°:</strong> ${cuitCliente}</p>
        </div>

        <!-- TABLA DE ITEMS -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="center" style="width: 70px;">CANT.</th>
                    <th>DESCRIPCION</th>
                    <th class="right" style="width: 120px;">PRECIO</th>
                </tr>
            </thead>
            <tbody>
                ${servicios.length > 0 ? `
                    <tr class="section-separator"><td colspan="3">— Servicios Prestados —</td></tr>
                    ${serviciosHTML}
                ` : ''}
                ${insumos.length > 0 ? `
                    <tr class="section-separator"><td colspan="3">— Insumos Utilizados —</td></tr>
                    ${insumosHTML}
                ` : ''}
                ${servicios.length === 0 && insumos.length === 0 ? '<tr><td colspan="3" style="padding:20px; text-align:center; color:#999;">Sin detalle de items</td></tr>' : ''}
                <tr><td colspan="3" class="items-body-spacer"></td></tr>
            </tbody>
        </table>

        <!-- TOTALES -->
        <div class="totals-row">
            <div class="totals-box">
                ${servicios.length > 0 ? `<div class="total-line"><span>Subtotal Servicios: $</span><span>${formatMoney(totalServicios).replace('$', '').replace('ARS', '').trim()}</span></div>` : ''}
                ${insumos.length > 0 ? `<div class="total-line"><span>Subtotal Insumos: $</span><span>${formatMoney(totalInsumos).replace('$', '').replace('ARS', '').trim()}</span></div>` : ''}
                <div class="total-line grand"><span>Total: $</span><span>${formatMoney(montoTotal).replace('$', '').replace('ARS', '').trim()}</span></div>
            </div>
        </div>

        <!-- FIRMA TECNICO -->
        <div class="firma-section">
            <p>HERNAN BRUNAS</p>
            <p>TEC. EN REFRIGERACION</p>
            <p>S&amp;B SERVICIOS SRL</p>
        </div>

        <!-- FOOTER -->
        <div class="footer-section">
            TEL.: 03496 – 15546618 / 15506054&nbsp;&nbsp;&nbsp;E-MAIL: sybservicios@hotmail.com
        </div>

    </div>
</body>
</html>`;

        // Iframe technique — open, render, auto-print
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();

            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.print();
                    // Cleanup after dialog closes
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 1000);
                }, 300);
            };
        }
    }

    return (
        <button
            onClick={handleImprimir}
            title="Imprimir Comprobante"
            className="hover:text-blue-600 transition"
        >
            <i className="fas fa-print"></i>
        </button>
    );
}
