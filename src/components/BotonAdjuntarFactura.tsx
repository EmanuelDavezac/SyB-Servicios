"use client";

import { useState, useRef } from "react";

export default function BotonAdjuntarFactura() {
    const [nombreArchivo, setNombreArchivo] = useState("");
    const [subiendo, setSubiendo] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setNombreArchivo(file.name);
        setSubiendo(true);

        try {
            // Aquí debes armar tu FormData y llamar a tu Server Action
            // const formData = new FormData();
            // formData.append("factura", file);
            // await subirFacturaGeneral(formData);

            console.log("Archivo listo para enviar:", file.name);

            // Simulación de carga
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert("Factura adjuntada correctamente.");

        } catch (error) {
            console.error("Error al subir el archivo", error);
            alert("Hubo un error al adjuntar la factura.");
        } finally {
            setSubiendo(false);
            setNombreArchivo("");
            if (inputRef.current) inputRef.current.value = ""; // Limpiar el input
        }
    }

    return (
        <div className="flex items-center gap-3">
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
            />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={subiendo}
                className="bg-slate-600 text-white px-4 py-2 rounded shadow hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-70"
            >
                {subiendo ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                    <i className="fas fa-paperclip" />
                )}
                {subiendo ? "Subiendo..." : "Adjuntar Factura"}
            </button>

            {nombreArchivo && (
                <span className="text-sm text-gray-600 truncate max-w-[200px]" title={nombreArchivo}>
                    {nombreArchivo}
                </span>
            )}
        </div>
    );
}