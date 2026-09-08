/**
 * sync-ligas.mjs — trae los datos de las ligas y arma datos.json para la app.
 *
 *   npm install cheerio
 *   node sync-ligas.mjs > datos.json
 *
 * Pensado para correr una vez por día (y los sábados a la tarde, después de
 * los partidos) desde un cron o desde GitHub Actions, y publicar datos.json
 * en una URL fija que la app lee al abrirse.
 */

import * as cheerio from "cheerio";
import { writeFileSync } from "node:fs";

const CONFIG = {
  club: "DEF. DE SANTOS LUGARES",
  fefi: {
    url: "https://fefi.com.ar/2026-torneo-anual-baby-futbol/h/",
    zona: "H",
    torneo: "Clausura 2026",
    categorias: ["2019", "2013", "2018", "2014", "2017", "2016", "2015"],
    bloque: 1,
  },
};

const limpiar = (s) => s.replace(/\s+/g, " ").trim();

function tablas(html) {
  const $ = cheerio.load(html);
  return $("table").toArray().map((tabla) =>
    $(tabla).find("tr").toArray().map((tr) =>
      $(tr).find("th,td").toArray().map((td) => limpiar($(td).text()))
    )
  );
}

const encabezado = (t) => (t[0] || []).join("|").toUpperCase();
const esFixture = (t) => encabezado(t).includes("LOCAL") && encabezado(t).includes("VISITANTE");
const esDirecciones = (t) => encabezado(t).includes("DIRECCI");
const esResultados = (t) => encabezado(t).includes("F.T.") || encabezado(t).includes("ESTADO");
const esTabla = (t) => /EQUIPOS/.test(encabezado(t)) && /PTS/.test(encabezado(t)) && !esResultados(t);

const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

function fechaISO(texto, anio) {
  const m = texto.match(/(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
}

function parsearFefi(html, cfg, anio) {
  const ts = tablas(html);
  const fixture = ts.find(esFixture);
  const direcciones = ts.find(esDirecciones);
  const resultados = ts.filter(esResultados)[cfg.bloque];
  const tablasPos = ts.filter(esTabla)[cfg.bloque];

  const sedes = {};
  (direcciones || []).slice(1).forEach(([nombre, dir, localidad]) => {
    if (nombre) sedes[nombre] = [dir, localidad].filter(Boolean).join(", ");
  });

  const encuentros = [];
  let nro = 0, fecha = null;
  for (const fila of fixture || []) {
    const primera = fila[0] || "";
    if (/^Fecha\s+\d+/i.test(primera)) {
      nro = +primera.match(/\d+/)[0];
      fecha = fechaISO(primera, anio);
      continue;
    }
    const [local, , visitante] = fila;
    if (!local || !visitante) continue;
    if (local !== cfg.club && visitante !== cfg.club) continue;
    const esLocal = local === cfg.club;
    const rival = esLocal ? visitante : local;
    encuentros.push({
      nro, fecha, rival, local: esLocal,
      sede: esLocal ? sedes[cfg.club] || null : sedes[rival] || null,
    });
  }

  for (let i = 0; i < (resultados || []).length; i++) {
    const fila = resultados[i];
    if (!/^F\d+$/i.test(fila[0] || "")) continue;
    const visita = resultados[i + 1] || [];
    const equipos = [fila[1], visita[1]];
    if (!equipos.includes(cfg.club)) continue;
    const n = +fila[0].slice(1);
    const enc = encuentros.find((e) => e.nro === n);
    if (!enc) continue;

    const golesLocal = fila.slice(2, 9);
    const golesVisita = visita.slice(2, 9);
    if (golesLocal.every((g) => g === "")) continue;

    const nuestroEsPrimero = fila[1] === cfg.club;
    enc.marc = {};
    cfg.categorias.forEach((cat, j) => {
      const a = nuestroEsPrimero ? golesLocal[j] : golesVisita[j];
      const b = nuestroEsPrimero ? golesVisita[j] : golesLocal[j];
      enc.marc[cat] = a === "GP" ? "GP" : a === "NP" ? "NP" : [Number(a), Number(b)];
    });
    enc.pts = nuestroEsPrimero
      ? [Number(fila[10]), Number(visita[10])]
      : [Number(visita[10]), Number(fila[10])];
    enc.estado = (fila[11] || "").toLowerCase() || "previo";
  }

  const tablasSalida = {};
  let actual = "general";
  for (const fila of tablasPos || []) {
    const [equipo, pj, g, e, p, pts] = fila;
    if (!equipo || /EQUIPOS/i.test(equipo)) continue;
    if (!pj) { actual = /GENERAL/i.test(equipo) ? "general" : equipo; tablasSalida[actual] = []; continue; }
    if (equipo === "LIBRE") continue;
    (tablasSalida[actual] ||= []).push({ equipo, pj: +pj, g: +g, e: +e, p: +p, pts: +pts });
  }

  return {
    id: "fefi", nombre: "FEFI", torneo: `${cfg.torneo} · Zona ${cfg.zona}`,
    fuente: cfg.url, conectada: true, actualizado: new Date().toISOString(),
    categorias: [...cfg.categorias].sort(),
    encuentros, tablas: tablasSalida,
  };
}

const SUPERLIGA = {
  cat: "1_1",
  division: "Junior A",
  club: "Defensores Santos Lugares",
  fixture: (cat) => `https://www.futsalargentina.com.ar/fixture.php?cat=${cat}`,
  posiciones: (cat) => `https://www.futsalargentina.com.ar/posiciones.php?cat=${cat}`,
};

function parsearSuperliga(htmlFixture, htmlPos, cfg) {
  const partidos = [];
  for (const t of tablas(htmlFixture)) {
    if (!encabezado(t).includes("SEDE")) continue;
    for (const fila of t.slice(1)) {
      const [local, gl, gv, visitante, sede, fecha, horario] = fila;
      if (!local || ![local, visitante].includes(cfg.club)) continue;
      const esLocal = local === cfg.club;
      const [dd, mm, aa] = (fecha || "").split("/");
      partidos.push({
        rival: esLocal ? visitante : local,
        local: esLocal,
        sede,
        fecha: aa ? `${aa}-${mm}-${dd}` : null,
        hora: (horario || "").replace(" hs", "").trim() || null,
        gf: esLocal ? Number(gl) : Number(gv),
        gc: esLocal ? Number(gv) : Number(gl),
      });
    }
  }

  const tabla = [];
  for (const t of tablas(htmlPos)) {
    if (!/PTS/.test(encabezado(t))) continue;
    for (const [equipo, pts, pj, g, e, p] of t.slice(1)) {
      if (equipo) tabla.push({ equipo, pj: +pj, g: +g, e: +e, p: +p, pts: +pts });
    }
    break;
  }

  return {
    id: "superliga", nombre: "Superliga", disciplina: "Futsal",
    torneo: `${cfg.division} · Torneo ${new Date().getFullYear()}`,
    fuente: cfg.fixture(cfg.cat), conectada: true,
    actualizado: new Date().toISOString(),
    categorias: [cfg.division], partidos, tablas: { general: tabla },
  };
}

const ARGENLIGA = {
  equipo: 1214864,
  torneo: 34170,
  nombre: "Defensores de Santos Lugares",
  api: "https://api.sofascore.com/api/v1",
};

async function json(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (app-defe)" } });
  if (!r.ok) throw new Error(`${r.status} en ${url}`);
  return r.json();
}

function partidoSofascore(ev, idEquipo) {
  const esLocal = ev.homeTeam.id === idEquipo;
  return {
    rival: esLocal ? ev.awayTeam.name : ev.homeTeam.name,
    local: esLocal,
    fecha: new Date(ev.startTimestamp * 1000).toISOString().slice(0, 10),
    hora: new Date(ev.startTimestamp * 1000).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }),
    gf: esLocal ? ev.homeScore?.current ?? null : ev.awayScore?.current ?? null,
    gc: esLocal ? ev.awayScore?.current ?? null : ev.homeScore?.current ?? null,
    ronda: ev.roundInfo?.round ?? null,
  };
}

async function parsearArgenliga(cfg) {
  const [pasados, proximos, temporadas] = await Promise.all([
    json(`${cfg.api}/team/${cfg.equipo}/events/last/0`),
    json(`${cfg.api}/team/${cfg.equipo}/events/next/0`),
    json(`${cfg.api}/unique-tournament/${cfg.torneo}/seasons`),
  ]);

  const temporada = temporadas.seasons[0]?.id;
  let tabla = [];
  if (temporada) {
    const st = await json(`${cfg.api}/unique-tournament/${cfg.torneo}/season/${temporada}/standings/total`);
    const grupo = st.standings.find((g) => g.rows.some((r) => r.team.id === cfg.equipo)) || st.standings[0];
    tabla = (grupo?.rows || []).map((r) => ({
      equipo: r.team.name, pj: r.matches, g: r.wins, e: r.draws, p: r.losses, pts: r.points,
    }));
  }

  return {
    id: "argenliga", nombre: "Argenliga", disciplina: "Futsal",
    torneo: "Argenliga A · Zona 1", fuente: `https://www.sofascore.com/es-la/futsal/team/defensores-de-santos-lugares/${cfg.equipo}`,
    conectada: true, actualizado: new Date().toISOString(), categorias: ["Primera"],
    partidos: [
      ...(pasados.events || []).slice(-6).map((e) => partidoSofascore(e, cfg.equipo)),
      ...(proximos.events || []).slice(0, 4).map((e) => partidoSofascore(e, cfg.equipo)),
    ],
    tablas: { general: tabla },
  };
}

const LAAMBA = {
  club: /santos\s*lugares|defensores\s*de\s*sl/i,
  base: "https://www.laamba.ar/torneoslaamba",
  anio: 2026,
  frentes: [
    { etiqueta: "1RA", rama: "masculino", torneo: "m-elite-i", division: "1ra", slug: "m-eliteiclausura" },
    { etiqueta: "3RA", rama: "masculino", torneo: "m-elite-i", division: "3ra", slug: "m-eliteiclausura" },
    { etiqueta: "4TA", rama: "masculino", torneo: "m-elite-i", division: "4ta", slug: "m-eliteiclausura" },
    { etiqueta: "5TA", rama: "masculino", torneo: "m-elite-i", division: "5ta", slug: "m-eliteiclausura" },
    { etiqueta: "6TA", rama: "masculino", torneo: "m-elite-i", division: "6ta", slug: "m-eliteiclausura" },
    { etiqueta: "7MA", rama: "masculino", torneo: "m-elite-i", division: "7ma", slug: "m-eliteiclausura" },
    { etiqueta: "8VA", rama: "masculino", torneo: "m-elite-i", division: "8va", slug: "m-eliteiclausura" },
    { etiqueta: "FEM 1RA", rama: "femenino", torneo: "f-ascenso-i-zona-b", division: "1ra", slug: "f-ascensoi-zonab" },
  ],
};

const urlLaamba = (f, anio) =>
  `${LAAMBA.base}/${f.rama}/${f.torneo}/${f.division}/torneo/${f.slug}/?db=${anio}`;

function tablaLaamba(html) {
  for (const t of tablas(html)) {
    const cab = (t[0] || []).map((c) => c.toUpperCase());
    if (!cab.includes("PTS") || !cab.some((c) => c === "J" || c === "PJ")) continue;
    const col = (nombres) => cab.findIndex((c) => nombres.includes(c));
    const iEq = col(["EQUIPO", "EQUIPOS"]), iPts = col(["PTS"]), iJ = col(["J", "PJ"]);
    const iG = col(["G"]), iE = col(["E"]), iP = col(["P"]), iDG = col(["DG"]);
    return t.slice(1)
      .filter((f) => f[iEq])
      .map((f) => ({
        equipo: f[iEq], pts: +f[iPts], pj: +f[iJ],
        g: +f[iG] || 0, e: +f[iE] || 0, p: +f[iP] || 0, dg: iDG >= 0 ? +f[iDG] : null,
      }));
  }
  return [];
}

async function parsearLaamba(cfg) {
  const tablasSalida = {};
  for (const frente of cfg.frentes) {
    const url = urlLaamba(frente, cfg.anio);
    try {
      const html = await fetch(url).then((r) => r.text());
      const filas = tablaLaamba(html);
      if (filas.length) tablasSalida[frente.etiqueta] = filas;
    } catch (err) {
      console.error(`  LAAMBA ${frente.etiqueta}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return {
    id: "lamba", nombre: "LAAMBA", disciplina: "Futsal",
    torneo: "M - Elite I · F - Ascenso I Zona B",
    fuente: urlLaamba(cfg.frentes[0], cfg.anio),
    conectada: Object.keys(tablasSalida).length > 0,
    actualizado: new Date().toISOString(),
    categorias: cfg.frentes.map((f) => f.etiqueta),
    partidos: [], tablas: tablasSalida,
  };
}

async function descubrirLaamba(club = "SANTOS LUGARES", anio = 2026) {
  const home = await fetch("https://www.laamba.ar/index.php").then((r) => r.text());
  const $ = cheerio.load(home);
  const urls = [...new Set(
    $("a[href*='/torneoslaamba/']").toArray()
      .map((a) => $(a).attr("href"))
      .filter((h) => h && h.includes(`db=${anio}`))
  )];

  const encontradas = [];
  for (const url of urls) {
    try {
      const html = await fetch(url).then((r) => r.text());
      if (new RegExp(club, "i").test(html)) {
        const partes = url.split("/torneoslaamba/")[1].split("/");
        encontradas.push({ url, rama: partes[0], torneo: partes[1], division: partes[2] });
        console.error(`  ✓ ${partes[0]} / ${partes[1]} / ${partes[2]}`);
      }
    } catch (err) {
      console.error(`  ✗ ${url}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return encontradas;
}

const sinConectar = (id, nombre) => ({
  id, nombre, torneo: "Torneo 2026", fuente: null, conectada: false,
  actualizado: null, categorias: [], encuentros: [], tablas: {},
});

export async function sincronizar() {
  const anio = new Date().getFullYear();
  const ligas = [];

  try {
    const html = await fetch(CONFIG.fefi.url, {
      headers: { "user-agent": "app-defe/1.0 (club Defensores de Santos Lugares)" },
    }).then((r) => r.text());
    ligas.push(parsearFefi(html, { ...CONFIG.fefi, club: CONFIG.club }, anio));
  } catch (err) {
    console.error("FEFI no respondió:", err.message);
    ligas.push({ ...sinConectar("fefi", "FEFI"), error: err.message });
  }

  try {
    const [f, p] = await Promise.all([
      fetch(SUPERLIGA.fixture(SUPERLIGA.cat)).then((r) => r.text()),
      fetch(SUPERLIGA.posiciones(SUPERLIGA.cat)).then((r) => r.text()),
    ]);
    ligas.push(parsearSuperliga(f, p, SUPERLIGA));
  } catch (err) {
    console.error("Superliga no respondió:", err.message);
    ligas.push({ ...sinConectar("superliga", "Superliga"), error: err.message });
  }

  try {
    ligas.push(await parsearArgenliga(ARGENLIGA));
  } catch (err) {
    console.error("Argenliga (Sofascore) no respondió:", err.message);
    ligas.push({ ...sinConectar("argenliga", "Argenliga"), error: err.message });
  }

  try {
    ligas.push(await parsearLaamba(LAAMBA));
  } catch (err) {
    console.error("LAAMBA no respondió:", err.message);
    ligas.push({ ...sinConectar("lamba", "LAAMBA"), error: err.message });
  }

  return { club: CONFIG.club, actualizado: new Date().toISOString(), ligas };
}

if (process.argv.includes("--buscar-laamba")) {
  console.error("Buscando al Defe en las divisiones de LAAMBA…");
  const encontradas = await descubrirLaamba();
  writeFileSync("laamba-divisiones.json", JSON.stringify(encontradas, null, 2));
  console.error(`\n${encontradas.length} división(es) encontradas. Guardadas en laamba-divisiones.json`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const salida = await sincronizar();
  writeFileSync("datos.json", JSON.stringify(salida, null, 2));
  console.error(`Listo: ${salida.ligas.filter((l) => l.conectada).length} liga(s) al día.`);
}
