import { NextRequest, NextResponse } from "next/server";
import { enviarRecordatoriosPendientes } from "@/actions/notificaciones";

export async function GET(request: NextRequest) {
    const secretEsperado = process.env.CRON_SECRET;
    if (!secretEsperado) {
        return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const secretHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const secretQuery = request.nextUrl.searchParams.get("secret");
    const provisto = secretHeader ?? secretQuery;

    if (provisto !== secretEsperado) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resultado = await enviarRecordatoriosPendientes();
    return NextResponse.json(resultado);
}
