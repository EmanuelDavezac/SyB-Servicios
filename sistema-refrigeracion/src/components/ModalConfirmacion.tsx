"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface ModalConfirmacionProps {
    isOpen: boolean;
    titulo?: string;
    mensaje: string;
    labelConfirmar?: string;
    onConfirmar: () => void;
    onCancelar: () => void;
    /** Muestra un spinner en el botón de confirmar mientras se procesa */
    procesando?: boolean;
}

export default function ModalConfirmacion({
    isOpen,
    titulo = "Confirmar acción",
    mensaje,
    labelConfirmar = "Eliminar",
    onConfirmar,
    onCancelar,
    procesando = false,
}: ModalConfirmacionProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancelar();
            }}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
                style={{
                    animation: "confirmModal 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
                }}
            >
                {/* ── Ícono de advertencia ── */}
                <div className="flex flex-col items-center pt-7 pb-4 px-6 text-center">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: "#fef2f2" }}
                    >
                        <i className="fas fa-exclamation-triangle text-red-500 text-2xl" />
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-2">{titulo}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{mensaje}</p>
                </div>

                {/* ── Botones ── */}
                <div className="flex gap-3 px-6 pb-6 pt-2">
                    <button
                        type="button"
                        onClick={onCancelar}
                        disabled={procesando}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={procesando}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {procesando ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-trash text-xs" />
                                {labelConfirmar}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes confirmModal {
                    from { opacity: 0; transform: scale(0.85) translateY(12px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );

    return createPortal(modal, document.body);
}
