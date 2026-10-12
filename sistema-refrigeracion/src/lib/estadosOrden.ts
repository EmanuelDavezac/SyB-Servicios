// Estados de orden_trabajo (campo `estado_trabajo`) que cuentan como trabajo
// todavia en curso: aparecen en "Trabajos en curso" del dashboard, bloquean la
// baja de un cliente y la de un servicio cargado en la orden. Una orden con
// estado_trabajo null se trata como "Pendiente" en la UI.
export const ESTADOS_ORDEN_EN_CURSO: string[] = ["Pendiente", "En proceso"];
