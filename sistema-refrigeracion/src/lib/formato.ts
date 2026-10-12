// Util de formato de texto compartida por las validaciones de baja (servicios,
// insumos, proveedores): cuando una baja se bloquea por varios registros, el
// mensaje de error los lista con un límite para no explotar en pantalla.
export function formatearListaConLimite(items: string[], limite = 5): string {
    if (items.length <= limite) return items.join(", ");
    const visibles = items.slice(0, limite);
    const resto = items.length - limite;
    return `${visibles.join(", ")} y ${resto} más`;
}
