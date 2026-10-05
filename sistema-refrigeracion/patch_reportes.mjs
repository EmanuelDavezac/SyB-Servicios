import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src', 'actions', 'reportes.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /export async function obtenerReporteServicios\(mes: number, anio: number\) \{[\s\S]*?catch \(error\) \{/m;

const replacement = `export async function obtenerReporteServicios(mes: number, anio: number) {
    try {
        await requerirUsuario();
        const fechaInicio = new Date(anio, mes - 1, 1);
        const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

        const facturas = await prisma.factura.findMany({
            where: {
                fecha_emision: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
                estado_pago: { notIn: [ESTADOS_FACTURA.ANULADA, ESTADOS_FACTURA.NO_APLICA] },
                orden_trabajo: {
                    estado_trabajo: "Finalizado"
                }
            },
            include: {
                orden_trabajo: {
                    include: {
                        cliente: true,
                        detalle_orden_servicio: {
                            include: {
                                servicio: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                fecha_emision: "asc"
            }
        });

        const ordenes = facturas
            .filter((f) => f.orden_trabajo !== null)
            .map((f) => {
                const orden = f.orden_trabajo!;
                return {
                    ...orden,
                    fecha_facturacion: f.fecha_emision,
                };
            });

        return JSON.parse(JSON.stringify(ordenes));
    } catch (error) {`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Updated reportes.ts");
