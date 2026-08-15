"use client";

import { obtenerReciboCompleto } from "@/actions/cobros";
import { montoALetras } from "@/lib/numeroALetras";

interface Props {
    idRecibo: number;
}

const TOLERANCIA = 0.001;

export async function imprimirRecibo(idRecibo: number) {
    const recibo = await obtenerReciboCompleto(idRecibo);
    if (!recibo) {
        alert("No se pudo obtener los datos del recibo.");
        return;
    }

    const cliente = recibo.cliente;

    const nombreCliente = cliente
        ? `${cliente.nombre} ${cliente.apellido}`
        : "Sin cliente asignado";
    const cuitCliente = cliente?.cuit || "—";
    const direccionCliente = cliente?.calle
        ? `${cliente.calle} ${cliente.num_calle || ""}`
        : "—";
    const localidadCliente = cliente?.localidad || "—";

    const fechaPago = new Date(recibo.fecha_pago).toLocaleDateString("es-AR");
    const numeroRecibo = `0001 – ${String(recibo.id_recibo).padStart(10, "0")}`;

    const formatMoney = (n: number) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
    const soloNumero = (n: number) => formatMoney(n).replace("$", "").replace("ARS", "").trim();

    const montoTotal = Number(recibo.monto_total);
    const montoEnLetras = montoALetras(montoTotal);
    const formaPago = recibo.forma_pago || "No especificada";
    const concepto = recibo.observacion
        ? `Pago a cuenta de facturas pendientes – ${recibo.observacion}`
        : "Pago a cuenta de facturas pendientes";

    let imputacionesHTML = "";
    for (const p of recibo.pagos_parciales) {
        const factura = p.factura;
        const saldo = Number(p.saldo_restante);
        const saldoTexto = saldo <= TOLERANCIA ? "CANCELADA" : soloNumero(saldo);
        imputacionesHTML += `
            <tr>
                <td style="padding: 5px 10px; border-bottom: 1px solid #ddd;">${factura?.num_factura || `Factura #${p.id_factura}`}</td>
                <td class="center" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: center;">${factura ? new Date(factura.fecha_emision).toLocaleDateString("es-AR") : "-"}</td>
                <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right;">${factura ? soloNumero(Number(factura.monto_total)) : "-"}</td>
                <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">${soloNumero(Number(p.monto_pagado))}</td>
                <td class="right" style="padding: 5px 10px; border-bottom: 1px solid #ddd; text-align: right; ${saldo <= TOLERANCIA ? "font-weight: 700; color: #0a7a2f;" : ""}">${saldoTexto}</td>
            </tr>`;
    }

    const deudaRestante = Number(recibo.deudaRestanteCliente);

    const cuerpoRecibo = (copia: string) => `
    <div class="factura-container">

        <div class="original-tag">${copia}</div>

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
                <div class="factura-titulo">RECIBO DE COBRO</div>
                <div class="factura-numero">N° ${numeroRecibo}</div>
                <div class="factura-fecha">FECHA: ${fechaPago}</div>
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
            <p><strong>RECIBÍ DE:</strong> ${nombreCliente}</p>
            <div class="fila">
                <p><strong>DOMICILIO:</strong> ${direccionCliente}</p>
                <p><strong>LOCALIDAD:</strong> ${localidadCliente}</p>
            </div>
            <p><strong>CUIT N°:</strong> ${cuitCliente}</p>
        </div>

        <!-- MONTO EN LETRAS -->
        <div class="letras-box">
            <p class="letras-monto">${montoEnLetras}</p>
            <p class="letras-concepto"><strong>Concepto:</strong> ${concepto} — <strong>Forma de pago:</strong> ${formaPago}</p>
        </div>

        <!-- TABLA DE IMPUTACIONES -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>COMPROBANTE</th>
                    <th class="center" style="width: 90px;">FECHA</th>
                    <th class="right" style="width: 100px;">IMPORTE</th>
                    <th class="right" style="width: 100px;">ABONA AHORA</th>
                    <th class="right" style="width: 100px;">SALDO</th>
                </tr>
            </thead>
            <tbody>
                ${imputacionesHTML || '<tr><td colspan="5" style="padding:20px; text-align:center; color:#999;">Sin imputaciones</td></tr>'}
                <tr><td colspan="5" class="items-body-spacer"></td></tr>
            </tbody>
        </table>

        <!-- TOTALES -->
        <div class="totals-row">
            <div class="totals-box">
                <div class="total-line grand"><span>Total Recibido: $</span><span>${soloNumero(montoTotal)}</span></div>
                <div class="total-line"><span>Saldo pendiente del cliente: $</span><span>${soloNumero(deudaRestante)}</span></div>
            </div>
        </div>

        <!-- FIRMAS -->
        <div class="firma-section firmas-dobles">
            <div class="firma-col">
                <div class="firma-linea"></div>
                <p>FIRMA DEL CLIENTE</p>
                <p>${nombreCliente}</p>
            </div>
            <div class="firma-col">
                <div class="firma-linea"></div>
                <p>POR S&amp;B SERVICIOS</p>
                <p>S&amp;B SERVICIOS SRL</p>
            </div>
        </div>

        <!-- FOOTER -->
        <div class="footer-section">
            TEL.: 03496 – 15546618 / 15506054&nbsp;&nbsp;&nbsp;E-MAIL: sybservicios@hotmail.com
        </div>

    </div>`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Recibo de Cobro ${numeroRecibo}</title>
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

        /* ===== MONTO EN LETRAS ===== */
        .letras-box {
            border-bottom: 2px solid #000;
            padding: 8px 16px;
            background: #f7f7f7;
        }
        .letras-box .letras-monto {
            font-weight: 800;
            font-size: 11.5px;
            letter-spacing: 0.3px;
        }
        .letras-box .letras-concepto {
            font-size: 10px;
            margin-top: 4px;
            color: #222;
        }

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
        .items-body-spacer {
            height: 50px;
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
            border-bottom: 1px solid #ddd;
        }

        /* ===== FIRMAS ===== */
        .firma-section {
            border-top: 2px solid #000;
            padding: 14px 16px 20px;
            font-size: 10.5px;
        }
        .firma-section p { margin: 1px 0; }
        .firmas-dobles {
            display: flex;
            justify-content: space-around;
            gap: 20px;
            padding-top: 34px;
        }
        .firma-col {
            text-align: center;
            width: 45%;
        }
        .firma-linea {
            border-top: 1px solid #000;
            margin-bottom: 6px;
        }

        /* ===== FOOTER ===== */
        .footer-section {
            border-top: 1.5px solid #000;
            padding: 6px 16px;
            font-size: 9.5px;
            text-align: center;
        }

        /* ===== CORTE ENTRE COPIAS ===== */
        .linea-corte {
            border-top: 1.5px dashed #000;
            margin: 14px auto;
            max-width: 750px;
            text-align: center;
            position: relative;
        }
        .linea-corte span {
            position: relative;
            top: -8px;
            background: #fff;
            padding: 0 10px;
            font-size: 9px;
            color: #666;
        }

        @media print {
            body { padding: 5px 10px; }
            .factura-container { border-width: 1.2px; max-width: 100%; }
        }
    </style>
</head>
<body>
    ${cuerpoRecibo("ORIGINAL")}
    <div class="linea-corte"><span>&#9986; CORTAR AQUÍ</span></div>
    ${cuerpoRecibo("DUPLICADO")}
</body>
</html>`;

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
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 300);
        };
    }
}

export default function BotonImprimirRecibo({ idRecibo }: Props) {
    return (
        <button
            onClick={() => imprimirRecibo(idRecibo)}
            title="Imprimir Recibo"
            className="hover:text-blue-600 transition"
        >
            <i className="fas fa-print"></i>
        </button>
    );
}
