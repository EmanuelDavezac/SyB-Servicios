-- Verificacion de las 4 filas heredadas con tipo Presupuesto/Recibo dentro de factura.
-- Correr en el Editor SQL de Neon. Son solo SELECT, no hace falta transaccion.
--
-- Conclusion del analisis: las 4 filas ya estan en el estado final deseado
-- (estado_pago = NO_APLICA, saldo_pendiente = 0.00). No hay ningun UPDATE ni
-- DELETE que aplicar: alguien ya corrio esa limpieza contra produccion en
-- algun momento (no quedo en un .sql versionado). Este archivo deja
-- documentado el chequeo, no modifica nada.

-- 1. Valores exactos que hay hoy en el campo tipo.
SELECT tipo, COUNT(*), SUM(monto_total)
FROM factura
GROUP BY tipo;

-- 2. Las 4 filas heredadas, con lo que tienen colgando.
-- Esperado: las 4 con estado_pago = NO_APLICA y saldo_pendiente = 0.00.
SELECT f.id_factura, f.tipo, f.num_factura, f.fecha_emision,
       f.monto_total, f.saldo_pendiente, f.estado_pago, f.id_orden,
       COUNT(p.id_pago)                  AS imputaciones,
       COALESCE(SUM(p.monto_pagado), 0)  AS cobrado
FROM factura f
LEFT JOIN pagos_parciales p ON p.id_factura = f.id_factura
WHERE f.tipo ILIKE '%presupuesto%' OR f.tipo ILIKE '%recibo%'
GROUP BY f.id_factura
ORDER BY f.id_factura;

-- 3. Recibos que se verian tocados si en algun momento se quisiera borrar
-- alguna de esas filas (para referencia futura, no se borra nada aca).
SELECT r.id_recibo, r.fecha_pago, r.monto_total, r.forma_pago,
       p.id_factura, p.monto_pagado
FROM recibo r
JOIN pagos_parciales p ON p.id_recibo = r.id_recibo
JOIN factura f         ON f.id_factura = p.id_factura
WHERE f.tipo ILIKE '%presupuesto%' OR f.tipo ILIKE '%recibo%';

-- 4. CHECK de estado_pago: confirmar que acepta NO_APLICA antes de asumir nada.
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'factura'::regclass AND contype = 'c';

-- 5. Cuadratura: cada recibo tiene que sumar lo mismo que sus imputaciones.
-- Esperado: 0 filas. Si aparece alguna, no tocar nada de esta migracion
-- hasta entender por que (podria ser un recibo con pagos parciales a mas
-- de una factura, o un problema de datos anterior a esto).
SELECT r.id_recibo, r.monto_total, COALESCE(SUM(p.monto_pagado), 0) AS suma_imputaciones
FROM recibo r
LEFT JOIN pagos_parciales p ON p.id_recibo = r.id_recibo
GROUP BY r.id_recibo, r.monto_total
HAVING r.monto_total <> COALESCE(SUM(p.monto_pagado), 0);
