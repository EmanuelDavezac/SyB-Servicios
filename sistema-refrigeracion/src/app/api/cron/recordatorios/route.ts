import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { procesarRecordatorios } from "@/lib/recordatorios";

// Solo por header: un secreto en el query string queda en los logs de acceso.
function secretosIguales(a: string, b: string) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function GET(request: NextRequest) {
    const secretEsperado = process.env.CRON_SECRET;
    if (!secretEsperado) {
        return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const provisto = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!provisto || !secretosIguales(provisto, secretEsperado)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Sin requerirUsuario: el cron no tiene cookie de sesion. procesarRecordatorios
    // (src/lib/recordatorios.ts) no la exige; la unica autorizacion de esta ruta
    // es el CRON_SECRET validado arriba.
    const resultado3D = await procesarRecordatorios(3);
    const resultado0D = await procesarRecordatorios(0);
    return NextResponse.json({
        resultado3D,
        resultado0D,
    });
}
