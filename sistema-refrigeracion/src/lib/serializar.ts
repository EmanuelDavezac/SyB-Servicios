import type { Prisma } from "@prisma/client";

// Tipo que resulta de pasar un valor por JSON.stringify/JSON.parse: los Date y
// los Decimal de Prisma quedan como string (Decimal.toJSON devuelve string).
export type Serializado<T> =
    T extends Date ? string :
    T extends Prisma.Decimal ? string :
    T extends (infer U)[] ? Serializado<U>[] :
    T extends object ? { [K in keyof T]: Serializado<T[K]> } :
    T;

// Equivalente tipado de JSON.parse(JSON.stringify(valor)), para devolver datos
// de Prisma a Client Components sin perder el tipo (el cast a mano daba `any`).
export function serializar<T>(valor: T): Serializado<T> {
    return JSON.parse(JSON.stringify(valor));
}
