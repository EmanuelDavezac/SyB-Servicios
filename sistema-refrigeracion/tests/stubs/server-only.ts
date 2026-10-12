// Stub de "server-only" para que los tests (Vitest/Node, sin el bundler de
// Next) puedan importar modulos que lo usan como marcador. Next resuelve ese
// paquete via su condicion de export "react-server" al compilar; fuera de ese
// build (node_modules/server-only/index.js) tira throw incondicional. Ver
// alias en vitest.config.ts.
export {};
