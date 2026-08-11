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
        const telCliente = cliente?.telefono || "—";
        const emailCliente = cliente?.email || "—";
        const direccionCliente = cliente?.calle
            ? `${cliente.calle} ${cliente.num_calle || ""}`
            : "—";

        const fechaEmision = new Date(factura.fecha_emision).toLocaleDateString("es-AR");
        const fechaVenc = factura.fecha_vencimiento
            ? new Date(factura.fecha_vencimiento).toLocaleDateString("es-AR")
            : "—";

        const formatMoney = (n: number) =>
            new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

        // Build services rows
        let serviciosHTML = "";
        let totalServicios = 0;
        for (const ds of servicios) {
            const nombre = ds.servicio?.nombre || "Servicio";
            const codigo = ds.servicio?.id_servicio || "—";
            const cant = ds.cantidad || 1;
            const precio = parseFloat(ds.precio_acordado);
            const subtotal = cant * precio;
            totalServicios += subtotal;
            serviciosHTML += `
                <tr>
                    <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${codigo}</td>
                    <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${nombre}</td>
                    <td class="center" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: center;">${cant}</td>
                    <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatMoney(precio)}</td>
                    <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">${formatMoney(subtotal)}</td>
                </tr>`;
        }

        // Build insumos rows
        let insumosHTML = "";
        let totalInsumos = 0;
        for (const di of insumos) {
            const nombre = di.insumo?.nombre || "Insumo";
            const codigo = di.insumo?.id_insumo || "—";
            const cant = di.cantidad_usada || 1;
            const precio = parseFloat(di.precio_aplicado);
            const subtotal = cant * precio;
            totalInsumos += subtotal;
            insumosHTML += `
                <tr>
                    <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${codigo}</td>
                    <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${nombre}</td>
                    <td class="center" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: center;">${cant}</td>
                    <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatMoney(precio)}</td>
                    <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">${formatMoney(subtotal)}</td>
                </tr>`;
        }

        const montoTotal = parseFloat(factura.monto_total);

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante ${factura.num_factura || factura.id_factura}</title>
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
            border: 2px solid #000;
            width: 100%;
            max-width: 750px;
            margin: 0 auto;
        }

        /* ===== HEADER ===== */
        .header-row {
            display: flex;
            border-bottom: 2px solid #000;
            position: relative;
        }
        .header-left {
            width: 50%;
            padding: 15px 20px;
            border-right: 1px solid #000;
        }
        .header-left .empresa-nombre {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .header-left .empresa-datos {
            font-size: 10px;
            color: #333;
            line-height: 1.5;
            text-align: center;
        }
        .header-left .empresa-tipo {
            font-weight: 700;
            font-size: 11px;
            margin-top: 4px;
        }
        .header-right {
            width: 50%;
            padding: 15px 20px;
            border-left: 1px solid #000;
        }
        .header-right .factura-titulo {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 2px;
        }
        .header-right .factura-numero {
            font-size: 14px;
            font-weight: 700;
            margin: 4px 0;
        }
        .header-right .factura-fecha {
            font-size: 11px;
            margin: 2px 0;
        }
        /* Letra central */
        .letra-box {
            position: absolute;
            left: 50%;
            top: 8px;
            transform: translateX(-50%);
            width: 56px;
            height: 56px;
            border: 2px solid #000;
            background: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .letra-box .letra {
            font-size: 30px;
            font-weight: 900;
            line-height: 1;
        }
        .letra-box .cod {
            font-size: 7px;
            font-weight: 700;
            margin-top: 1px;
        }
        .letra-box .original {
            font-size: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* ===== DATOS EMISOR EXTRA ===== */
        .datos-emisor {
            display: flex;
            border-bottom: 2px solid #000;
            font-size: 10px;
        }
        .datos-emisor .col {
            width: 50%;
            padding: 6px 20px;
        }
        .datos-emisor .col:first-child {
            border-right: 1px solid #000;
        }
        .datos-emisor .col:last-child {
            border-left: 1px solid #000;
        }
        .datos-emisor p { margin: 1px 0; }

        /* ===== DATOS CLIENTE ===== */
        .datos-cliente {
            border-bottom: 2px solid #000;
            padding: 8px 20px;
            font-size: 10.5px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px 20px;
        }
        .datos-cliente p { margin: 1px 0; }
        .datos-cliente .span-full { grid-column: 1 / -1; }

        /* ===== TABLA ITEMS ===== */
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        .items-table thead th {
            background: #f0f0f0;
            border-bottom: 2px solid #000;
            border-top: none;
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
            height: 120px;
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

        /* ===== FOOTER ===== */
        .footer-section {
            border-top: 2px solid #000;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .footer-disclaimer {
            font-size: 10px;
            color: #555;
            font-style: italic;
            text-align: center;
            flex: 1;
        }
        .footer-disclaimer strong {
            color: #c0392b;
            font-style: normal;
            font-size: 11px;
        }

        @media print {
            body { padding: 5px 10px; }
            .factura-container { border-width: 1.5px; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="factura-container">

        <!-- HEADER ROW -->
        <div class="header-row">
            <div class="header-left" style="text-align: center;">
                <div class="empresa-nombre">SyB Servicios</div>
                <div class="empresa-datos">
                    Servicios de Refrigeración y Climatización<br>
                    Córdoba, Argentina<br>
                    Tel: (351) XXX-XXXX<br>
                </div>
            </div>

            <!-- LETRA CENTRAL -->
            <div class="letra-box">
                <div class="letra">X</div>
                <div class="cod">DOC. INT.</div>
            </div>

            <div class="header-right">
                <div class="factura-titulo">${factura.tipo?.toUpperCase() || "COMPROBANTE"}</div>
                <div class="factura-numero">${factura.num_factura || `N° ${String(factura.id_factura).padStart(8, '0')}`}</div>
                <div class="factura-fecha"><strong>Fecha de Emisión:</strong> ${fechaEmision}</div>
                ${factura.fecha_vencimiento ? `<div class="factura-fecha"><strong>Vencimiento:</strong> ${fechaVenc}</div>` : ''}
            </div>
        </div>

        <!-- DATOS EMISOR EXTRAS -->
        <div class="datos-emisor">
            <div class="col">
                <p><strong>Orden de Trabajo:</strong> #${String(factura.orden_trabajo?.id_orden || 0).padStart(5, '0')}</p>
                <p><strong>Estado de Pago:</strong> ${factura.estado_pago}</p>
            </div>
            <div class="col">
                <p><strong>Tipo:</strong> ${factura.tipo || 'Comprobante Interno'}</p>
                ${factura.descripcion ? `<p><strong>Nota:</strong> ${factura.descripcion}</p>` : ''}
            </div>
        </div>

        <!-- DATOS CLIENTE -->
        <div class="datos-cliente">
            <p><strong>Razón Social:</strong> ${nombreCliente}</p>
            <p><strong>CUIT:</strong> ${cuitCliente}</p>
            <p><strong>Domicilio:</strong> ${direccionCliente}</p>
            <p><strong>Teléfono:</strong> ${telCliente}</p>
            <p><strong>Email:</strong> ${emailCliente}</p>
            <p>&nbsp;</p>
        </div>

        <!-- TABLA DE ITEMS -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 60px;">Código</th>
                    <th>Descripción</th>
                    <th class="center" style="width: 70px;">Cantidad</th>
                    <th class="right" style="width: 100px;">P. Unitario</th>
                    <th class="right" style="width: 110px;">Importe</th>
                </tr>
            </thead>
            <tbody>
                ${servicios.length > 0 ? `
                    <tr class="section-separator"><td colspan="5">— Servicios Prestados —</td></tr>
                    ${serviciosHTML}
                ` : ''}
                ${insumos.length > 0 ? `
                    <tr class="section-separator"><td colspan="5">— Insumos Utilizados —</td></tr>
                    ${insumosHTML}
                ` : ''}
                ${servicios.length === 0 && insumos.length === 0 ? '<tr><td colspan="5" style="padding:20px; text-align:center; color:#999;">Sin detalle de items</td></tr>' : ''}
                <tr><td colspan="5" class="items-body-spacer"></td></tr>
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

        <!-- FOOTER -->
        <div class="footer-section">
            <div class="footer-disclaimer">
                <strong>⚠ DOCUMENTO NO VÁLIDO COMO FACTURA</strong><br>
                Comprobante de uso interno — Solo para control de gestión de SyB Servicios
            </div>
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
