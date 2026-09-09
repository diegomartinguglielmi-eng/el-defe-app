import { writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const FEFI_URL = "https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/";
const CLUB = "DEF. DE SANTOS LUGARES";
const CATEGORIAS_FEFI = ["2019", "2013", "2018", "2014", "2017", "2016", "2015"];

const fetchOriginal = globalThis.fetch;
const fetchSinCache = (url, init = {}) => {
  const separador = url.includes("?") ? "&" : "?";
  return fetchOriginal(`${url}${separador}_defe=${Date.now()}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.headers || {}),
      "cache-control": "no-cache, no-store, max-age=0",
      pragma: "no-cache",
      "user-agent": "Mozilla/5.0 (app-defe)",
    },
  });
};

globalThis.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url;
  if (url && url.includes("fefi.com.ar/2026-torneo-anual-baby-futbol/h/")) {
    return fetchSinCache(url, init);
  }
  return fetchOriginal(input, init);
};

const limpiar = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const normalizar = (s) => limpiar(s)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, "");

function filasDeTablas(html) {
  const $ = cheerio.load(html);
  return $("table").toArray().map((tabla) =>
    $(tabla).find("tr").toArray().map((tr) =>
      $(tr).find("th,td").toArray().map((td) => limpiar($(td).text()))
    )
  );
}

function valorMarcador(v) {
  const t = limpiar(v).toUpperCase();
  if (t === "GP" || t === "NP") return t;
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function completarResultadosFefi(salida) {
  const liga = salida.ligas.find((l) => l.id === "fefi");
  if (!liga) return;

  const html = await fetchSinCache(FEFI_URL).then((r) => {
    if (!r.ok) throw new Error(`FEFI respondió ${r.status}`);
    return r.text();
  });

  let completados = 0;
  for (const tabla of filasDeTablas(html)) {
    for (let i = 0; i < tabla.length - 1; i++) {
      const primera = tabla[i] || [];
      const segunda = tabla[i + 1] || [];
      if (!/^F\d+$/i.test(primera[0] || "")) continue;
      if (![primera[1], segunda[1]].includes(CLUB)) continue;

      const nro = Number((primera[0] || "").replace(/\D/g, ""));
      const enc = liga.encuentros?.find((e) => e.nro === nro);
      if (!enc) continue;

      const clubEsPrimero = primera[1] === CLUB;
      const rivalTabla = clubEsPrimero ? segunda[1] : primera[1];
      if (normalizar(rivalTabla) !== normalizar(enc.rival)) continue;

      const golesPrimero = primera.slice(2, 9);
      const golesSegundo = segunda.slice(2, 9);
      if (golesPrimero.length < 7 || golesSegundo.length < 7) continue;
      if ([...golesPrimero, ...golesSegundo].every((g) => limpiar(g) === "")) continue;

      const marc = {};
      let validos = 0;
      CATEGORIAS_FEFI.forEach((cat, j) => {
        const nuestro = valorMarcador(clubEsPrimero ? golesPrimero[j] : golesSegundo[j]);
        const rival = valorMarcador(clubEsPrimero ? golesSegundo[j] : golesPrimero[j]);
        if (nuestro === "GP" || nuestro === "NP") {
          marc[cat] = nuestro;
          validos++;
        } else if (nuestro !== null && rival !== null) {
          marc[cat] = [nuestro, rival];
          validos++;
        }
      });

      if (!validos) continue;
      enc.marc = marc;
      enc.estado = limpiar(primera[11] || segunda[11] || "verificado").toLowerCase() || "verificado";
      completados++;
    }
  }

  console.error(`FEFI: ${completados} fecha(s) con rival y marcadores validados.`);
}

const { sincronizar } = await import("./sync-ligas.mjs");
const salida = await sincronizar();
try {
  await completarResultadosFefi(salida);
} catch (err) {
  console.error("No se pudo completar FEFI con el parser reforzado:", err.message);
}
writeFileSync("datos.json", JSON.stringify(salida, null, 2));
console.error(`Listo: ${salida.ligas.filter((l) => l.conectada).length} liga(s) al día.`);
