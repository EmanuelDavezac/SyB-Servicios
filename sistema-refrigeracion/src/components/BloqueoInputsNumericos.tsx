"use client";

import { useEffect } from "react";

const TECLAS_BLOQUEADAS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown"]);

function esInputNumerico(target: EventTarget | null): target is HTMLInputElement {
    return target instanceof HTMLInputElement && target.type === "number";
}

/**
 * Los montos y cantidades se cargan solo tipeando: en los <input type="number">
 * de todo el sistema se bloquea que la rueda del mouse o las flechas del
 * teclado cambien el valor (las flechitas visuales se ocultan en globals.css).
 * Se escucha a nivel document, así cubre también los modales montados con
 * createPortal.
 */
export default function BloqueoInputsNumericos() {
    useEffect(() => {
        function onWheel(e: WheelEvent) {
            // El navegador solo cambia el valor con la rueda si el campo tiene foco
            if (esInputNumerico(e.target) && e.target === document.activeElement) {
                e.preventDefault();
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (esInputNumerico(e.target) && TECLAS_BLOQUEADAS.has(e.key)) {
                e.preventDefault();
            }
        }

        // passive: false para poder cancelar el wheel
        document.addEventListener("wheel", onWheel, { passive: false, capture: true });
        document.addEventListener("keydown", onKeyDown, { capture: true });
        return () => {
            document.removeEventListener("wheel", onWheel, { capture: true });
            document.removeEventListener("keydown", onKeyDown, { capture: true });
        };
    }, []);

    return null;
}
