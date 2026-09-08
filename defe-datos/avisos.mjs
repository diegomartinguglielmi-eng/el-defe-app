/**
 * avisos.mjs — compara dos sincronizaciones y arma avisos.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [anterior, nuevo] = process.argv.slice(2);
const leer = (r) => (r && existsSync(r) ? JSON.parse(readFileSync(r, "utf8")) : null);
const antes = leer(anterior);
const ahora = leer(nuevo || "datos.json");
if (!ahora) {
  console.error("No encontré el datos.json nuevo.");
  process.exit(1);
}

const partidosDe = (liga) => liga.encuentros || liga.partidos || [];
const idPartido = (p) => `${p.nro ?? p.fecha}-${p.rival}`;
const avisos = [];

for (const liga of ahora.ligas) {
  if (!liga.conectada) continue;
  const previa = antes?.ligas?.find((l) => l.id === liga.id);
  const anteriores = new Map(partidosDe(previa || {}).map((p) => [idPartido(p), p]));

  for (const p of partidosDe(liga)) {
    const viejo = anteriores.get(idPartido(p));
    const jugado = p.marc || p.gf != null;
    const eraJugado = viejo && (viejo.marc || viejo.gf != null);

    if (jugado && !eraJugado) {
      avisos.push({
        tipo: "resultados",
        titulo: resumen(liga, p),
        cuerpo: detalle(liga, p),
        url: "/partidos",
        categorias: p.marc ? Object.keys(p.marc) : p.categoria ? [p.categoria] : [],
        clave: `${liga.id}-${idPartido(p)}-resultado`,
      });
      continue;
    }

    if (viejo && !jugado) {
      const cambios = [];
      if (viejo.fecha !== p.fecha && p.fecha) cambios.push(`ahora es el ${p.fecha.split("-").reverse().slice(0, 2).join("/")}`);
      if (viejo.hora !== p.hora && p.hora) cambios.push(`a las ${p.hora}`);
      if (viejo.sede !== p.sede && p.sede) cambios.push(`en ${p.sede}`);
      if (cambios.length) {
        avisos.push({
          tipo: "cambios",
          titulo: `Cambió el partido con ${p.rival}`,
          cuerpo: `${liga.nombre}: ${cambios.join(", ")}.`,
          url: "/partidos",
          categorias: p.categoria ? [p.categoria] : [],
          clave: `${liga.id}-${idPartido(p)}-${p.fecha}-${p.hora ?? ""}-${p.sede ?? ""}`,
        });
      }
    }
  }
}

function resumen(liga, p) {
  if (p.pts) {
    const [a, b] = p.pts;
    const signo = a > b ? "ganó" : a === b ? "empató" : "perdió";
    return `El Defe ${signo} la fecha ${p.nro}: ${a} a ${b}`;
  }
  return `${liga.nombre}: Defe ${p.gf} - ${p.gc} ${p.rival}`;
}

function detalle(liga, p) {
  if (!p.marc) return `Contra ${p.rival}.`;
  const porCategoria = Object.entries(p.marc)
    .map(([cat, m]) => (m === "GP" ? `${cat} G.P.` : `${cat} ${m[0]}-${m[1]}`))
    .join(" · ");
  return `Contra ${p.rival}. ${porCategoria}`;
}

writeFileSync("avisos.json", JSON.stringify(avisos, null, 2));
console.error(`${avisos.length} aviso(s) para enviar.`);

const URL_FUNCION = process.env.AVISOS_URL;
const CLAVE = process.env.CLAVE_AVISOS;
if (!URL_FUNCION || !CLAVE) {
  console.error("Sin AVISOS_URL o CLAVE_AVISOS: no se envía nada, solo se listan.");
  avisos.forEach((a) => console.error(`  · [${a.tipo}] ${a.titulo}`));
  process.exit(0);
}

for (const aviso of avisos) {
  try {
    const r = await fetch(URL_FUNCION, {
      method: "POST",
      headers: { "content-type": "application/json", "x-clave": CLAVE },
      body: JSON.stringify(aviso),
    });
    const resultado = await r.json();
    console.error(`  ${resultado.repetido ? "repetido" : `${resultado.enviados} enviados`} · ${aviso.titulo}`);
  } catch (err) {
    console.error(`  falló · ${aviso.titulo}: ${err.message}`);
  }
}
