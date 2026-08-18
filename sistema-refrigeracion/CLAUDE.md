## Sistema

Sistema de gestión para un negocio de service de refrigeración (instalación/reparación de equipos). Next.js 15 (App Router) + TypeScript + Tailwind, Server Actions para toda la lógica de negocio (`src/actions/*.ts`), Prisma como ORM sobre Postgres alojado en Neon (conexión vía `@prisma/adapter-neon` en `src/lib/prisma.ts`, WebSocket driver).

### Flujo de negocio
1. **Cliente** se da de alta (`clientes`).
2. Se crea una **Orden de trabajo** (`ordenes`) para ese cliente, con estado (`Pendiente` → `En proceso` → `Finalizado`). A la orden se le agregan:
   - **Servicios** del catálogo (`servicios`) o creados al vuelo, con cantidad y precio acordado.
   - **Insumos** del stock (`insumos`), con cantidad usada. El stock NO se descuenta al agregar el insumo a la orden, solo se registra (`detalle_orden_insumo`).
3. Cuando la orden está `Finalizado`, se genera la **Factura** (`facturacion`). Al crear la factura es cuando recién se descuenta el stock de los insumos registrados en la orden (transacción en `crearFactura`, `src/actions/facturacion.ts`). La factura admite pagos parciales (`pagos_parciales`) y tiene estado de pago (Impago/Pendiente/Pagada).
4. **Reportes** (`reportes`) arma: dashboard (órdenes en curso, alertas de stock bajo, facturas por vencer), reporte mensual de ingresos (facturas pagadas) vs egresos (compras a proveedores) con balance, y reporte de servicios facturados por mes.

### Insumos: precio por unidad de medida
`insumo.precio_costo` / `insumo.precio_venta` son precio **por unidad de medida** (la unidad se anota como texto libre en `insumo.descripcion`, ej. "kg", "m", "unidad"). `insumo.stock_actual` / `stock_minimo` y `detalle_orden_insumo.cantidad_usada` son `Decimal(10,3)` para poder usar fracciones (ej. 0.5 kg de gas, 2.3 m de caño): el subtotal se calcula como `cantidad * precio_aplicado`, así que usar menos de 1 divide el precio proporcionalmente sin lógica especial. `detalle_compra.cantidad` (compras a proveedores) sigue siendo `Int` — ese flujo de compras no está en uso activo actualmente (solo se lee desde `reportes.ts` para egresos).

### Modelos clave (`prisma/schema.prisma`)
- `cliente` — datos de contacto/dirección.
- `proveedor` — de insumos.
- `insumo` — catálogo de stock, con precio costo/venta por unidad y stock actual/mínimo.
- `servicio` — catálogo de servicios ofrecidos.
- `orden_trabajo` — la orden en sí, une cliente + detalle de servicios e insumos.
- `detalle_orden_servicio` / `detalle_orden_insumo` — líneas de la orden (servicio o insumo usado, cantidad, precio aplicado).
- `factura` — 1 orden puede tener factura(s); `pagos_parciales` registra abonos.
- `compra_insumo` / `detalle_compra` — compras a proveedores (egresos), poco usado actualmente.
- `servicio_insumo` — insumos típicamente asociados a un servicio (catálogo/receta, no movimiento de stock).
- `historial_notificaciones` — log de notificaciones enviadas por factura/cliente.

### Estructura del código
- `src/app/<seccion>/page.tsx` — Server Components que leen datos vía las funciones de `src/actions/` y arman la tabla/página. Filtros por querystring (`searchParams`) resueltos en el servidor.
- `src/actions/<seccion>.ts` — `"use server"`, todo el CRUD y las reglas de negocio (transacciones, descuento de stock, cálculo de reportes). Los `Decimal` de Prisma se convierten a `Number` (o `JSON.parse(JSON.stringify(...))`) antes de devolverlos a Client Components.
- `src/components/Modal*.tsx` — modales client-side (alta/edición) por entidad, montados vía `createPortal`.
- `src/components/Boton*.tsx` / `Filtros*.tsx` — acciones puntuales (eliminar, imprimir factura) y barras de filtro.
- Migraciones en `prisma/migrations/`, pero el historial no está 100% sincronizado con la DB real — antes de una migración destructiva, correr `prisma db push` primero para ver drift real contra Neon.

## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.
