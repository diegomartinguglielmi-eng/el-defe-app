import { writeFileSync } from "node:fs";

const fetchOriginal = globalThis.fetch;
globalThis.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url;
  if (url && url.includes("fefi.com.ar/2026-torneo-anual-baby-futbol/h/")) {
    const separador = url.includes("?") ? "&" : "?";
    const fresco = `${url}${separador}_defe=${Date.now()}`;
    return fetchOriginal(fresco, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.headers || {}),
        "cache-control": "no-cache, no-store, max-age=0",
        pragma: "no-cache",
      },
    });
  }
  return fetchOriginal(input, init);
};

const { sincronizar } = await import("./sync-ligas.mjs");
const salida = await sincronizar();
writeFileSync("datos.json", JSON.stringify(salida, null, 2));
console.error(`Listo: ${salida.ligas.filter((l) => l.conectada).length} liga(s) al día.`);
