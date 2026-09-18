import { serve } from "bun";
import { join } from "path";

const PORT = parseInt(process.env.PORT || "3000");
const STATIC_DIR = join(import.meta.dir, "ui-operativa-base");

const server = serve({
  port: PORT,
  fetch(req: Request) {
    const url = new URL(req.url);
    let filePath = join(STATIC_DIR, url.pathname);

    // Si es la raíz, servir index.html
    if (url.pathname === "/") {
      filePath = join(STATIC_DIR, "index.html");
    }

    return Bun.file(filePath).exists().then((exists) => {
      if (exists) {
        return new Response(Bun.file(filePath));
      }
      // Si no existe el archivo, intentar con index.html (para rutas del cliente)
      const indexPath = join(STATIC_DIR, "index.html");
      return Bun.file(indexPath).exists().then((indexExists) => {
        if (indexExists) {
          return new Response(Bun.file(indexPath));
        }
        return new Response("404 Not Found", { status: 404 });
      });
    });
  },
});

console.log(`Static server running at http://localhost:${PORT}`);
console.log(`Serving files from: ${STATIC_DIR}`);

