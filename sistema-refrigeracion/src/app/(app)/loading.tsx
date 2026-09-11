export default function Loading() {
    return (
        <div className="flex w-full h-full min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <i className="fas fa-spinner fa-spin text-5xl text-sky-500 mb-4"></i>
                <h2 className="text-xl font-bold text-slate-700">Cargando contenido...</h2>
                <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">Preparando la base de datos y obteniendo información para esta pantalla.</p>
            </div>
        </div>
    );
}
