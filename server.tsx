import { serve } from "bun";
import path from "path";
import fs from "fs";

const PORT = parseInt(Bun.env.PORT || "3000");
const UI_DIR = path.join(import.meta.dir, "ui-operativa-base");

serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = path.join(UI_DIR, url.pathname === "/" ? "index.html" : url.pathname);

    // Prevenir directory traversal
    if (!filePath.startsWith(UI_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      // Si es un directorio, servir index.html
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      const file = Bun.file(filePath);
      return new Response(file);
    } catch {
      // Fallback a index.html para SPA routing
      try {
        const indexFile = Bun.file(path.join(UI_DIR, "index.html"));
        return new Response(indexFile, { status: 200, headers: { "Content-Type": "text/html" } });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }
  },
});

console.log(`✅ Servidor estático escuchando en puerto ${PORT}`);
console.log(`📁 Sirviendo archivos desde: ${UI_DIR}`);

