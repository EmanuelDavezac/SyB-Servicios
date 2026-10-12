import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { procesarRecordatoriosMock } = vi.hoisted(() => ({
  procesarRecordatoriosMock: vi.fn(async (diasAnticipacion: number) => ({
    total: 0,
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
    diasAnticipacion,
  })),
}));

vi.mock("@/lib/recordatorios", () => ({
  procesarRecordatorios: procesarRecordatoriosMock,
}));

import { GET } from "@/app/api/cron/recordatorios/route";

const URL = "https://app.test/api/cron/recordatorios";

describe("GET /api/cron/recordatorios", () => {
  const envOriginal = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "el-secreto";
    procesarRecordatoriosMock.mockClear();
  });

  afterEach(() => {
    process.env.CRON_SECRET = envOriginal;
  });

  it("devuelve 401 sin secreto", async () => {
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(401);
    expect(procesarRecordatoriosMock).not.toHaveBeenCalled();
  });

  it("devuelve 401 con secreto incorrecto", async () => {
    const res = await GET(new NextRequest(`${URL}?secret=incorrecto`));
    expect(res.status).toBe(401);
    expect(procesarRecordatoriosMock).not.toHaveBeenCalled();
  });

  it("procesa (3D y 0D) con el secreto correcto por query param", async () => {
    const res = await GET(new NextRequest(`${URL}?secret=el-secreto`));
    expect(res.status).toBe(200);
    expect(procesarRecordatoriosMock).toHaveBeenCalledTimes(2);
    expect(procesarRecordatoriosMock).toHaveBeenCalledWith(3);
    expect(procesarRecordatoriosMock).toHaveBeenCalledWith(0);

    const body = await res.json();
    expect(body.resultado3D.diasAnticipacion).toBe(3);
    expect(body.resultado0D.diasAnticipacion).toBe(0);
  });

  it("procesa con el secreto correcto por header Authorization: Bearer", async () => {
    const res = await GET(
      new NextRequest(URL, { headers: { authorization: "Bearer el-secreto" } })
    );
    expect(res.status).toBe(200);
    expect(procesarRecordatoriosMock).toHaveBeenCalledTimes(2);
  });
});
