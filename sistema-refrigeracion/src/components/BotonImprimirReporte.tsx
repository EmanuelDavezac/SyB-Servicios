"use client";

export default function BotonImprimirReporte() {
    return (
        <button 
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-slate-600 hover:bg-gray-50 transition print:hidden"
        >
            <i className="fas fa-print"></i> Imprimir
        </button>
    );
}
