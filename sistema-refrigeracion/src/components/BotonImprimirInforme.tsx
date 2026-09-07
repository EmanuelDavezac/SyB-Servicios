"use client";

interface Informe {
    id_informe: number;
    numero: string | null;
    fecha: string | Date;
    destinatario: string;
    cuit: string | null;
    calle: string | null;
    num_calle: number | null;
    localidad: string | null;
    descripcion: string;
}

interface Props {
    informe: Informe;
}

function imprimirHTML(html: string) {
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

function imprimirInforme(informe: Informe) {
    const fechaEmision = new Date(informe.fecha).toLocaleDateString("es-AR");
    const numeroInforme = informe.numero || String(informe.id_informe).padStart(4, "0");
    const direccion = informe.calle ? `${informe.calle} ${informe.num_calle || ""}`.trim() : "—";
    const localidad = informe.localidad || "—";
    const cuit = informe.cuit || "—";
    const cuerpo = informe.descripcion.replace(/\n/g, "<br>");

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>INFORME TECNICO ${numeroInforme}</title>
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
        .container {
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
        .header-row { display: flex; border-bottom: 2px solid #000; }
        .header-left { width: 58%; padding: 12px 16px; border-right: 1.5px solid #000; text-align: center; }
        .header-left .empresa-nombre { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
        .header-left .empresa-datos { font-size: 9.5px; color: #222; line-height: 1.5; }
        .header-left .empresa-tipo { font-weight: 700; font-size: 10.5px; margin-top: 4px; }
        .header-right { width: 42%; padding: 12px 16px; }
        .header-right .titulo { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
        .header-right .numero { font-size: 11px; font-weight: 700; margin: 2px 0; }
        .header-right .fecha { font-size: 11px; font-weight: 700; margin: 6px 0 2px; }
        .datos-destinatario { border-bottom: 2px solid #000; padding: 6px 16px; font-size: 10.5px; }
        .datos-destinatario p { margin: 2px 0; }
        .datos-destinatario .fila { display: flex; justify-content: space-between; gap: 20px; }
        .cuerpo { padding: 16px; font-size: 11px; min-height: 220px; white-space: pre-line; }
        .firma-section { border-top: 2px solid #000; padding: 14px 16px 40px; font-size: 10.5px; }
        .firma-section p { margin: 1px 0; }
        .footer-section { border-top: 1.5px solid #000; padding: 6px 16px; font-size: 9.5px; text-align: center; }
        @media print {
            body { padding: 5px 10px; }
            .container { border-width: 1.2px; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="original-tag">ORIGINAL</div>

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
            <div class="header-right">
                <div class="titulo">INFORME TECNICO</div>
                <div class="numero">N° ${numeroInforme}</div>
                <div class="fecha">FECHA: ${fechaEmision}</div>
            </div>
        </div>

        <div class="datos-destinatario">
            <p><strong>SR./ES.:</strong> ${informe.destinatario}</p>
            <div class="fila">
                <p><strong>DOMICILIO:</strong> ${direccion}</p>
                <p><strong>LOCALIDAD:</strong> ${localidad}</p>
            </div>
            <p><strong>CUIT N°:</strong> ${cuit}</p>
        </div>

        <div class="cuerpo">${cuerpo}</div>

        <div class="firma-section">
            <p>HERNAN BRUNAS</p>
            <p>TEC. EN REFRIGERACION</p>
            <p>S&amp;B SERVICIOS SRL</p>
        </div>

        <div class="footer-section">
            TEL.: 03496 – 15546618 / 15506054&nbsp;&nbsp;&nbsp;E-MAIL: sybservicios@hotmail.com
        </div>
    </div>
</body>
</html>`;

    imprimirHTML(html);
}

export default function BotonImprimirInforme({ informe }: Props) {
    return (
        <button
            onClick={() => imprimirInforme(informe)}
            title="Imprimir Informe"
            className="hover:text-blue-600 transition"
        >
            <i className="fas fa-print"></i>
        </button>
    );
}
