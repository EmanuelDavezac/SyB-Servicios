"use client";

import { useTransition } from "react";
import { eliminarInsumo } from "@/actions/insumos";

export default function BotonEliminarInsumo({ idInsumo }: { idInsumo: number }) {
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        if (confirm("¿Estás seguro de que deseas eliminar este insumo?")) {
            startTransition(async () => {
                const res = await eliminarInsumo(idInsumo);
                // Si la acción tiene error
                if (res?.success === false) {
                    alert(res.error || "Hubo un error al eliminar el insumo.");
                }
            });
        }
    }

    return (
        <button 
            onClick={handleDelete} 
            disabled={isPending}
            className="text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400" 
            title="Eliminar insumo"
        >
            <i className="fas fa-trash"></i>
        </button>
    );
}
