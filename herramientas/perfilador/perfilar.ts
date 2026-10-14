// Perfilador: de una carpeta con capturas reales de una empresa a `perfil-<slug>.json`, listo para "Importar perfil"
// en /marcas. Los colores se miden (color.ts); lo interpretativo (rubro, ejes, tono, contenido, público, grado) lo lee
// Claude con visión y lo valida el motor (`validarPerfil`). Si la respuesta no pasa, se reintenta una vez con los errores.
//
//   npm run perfilar -- <carpeta> [--nombre "Barocca"] [--usuario baroccatortuguitas] [--logo logo.png]
//                                 [--salida <carpeta>] [--solo-color] [--interpretacion <archivo.json>]
//
// La carpeta puede traer `identidad/` (logo, foto de perfil, destacados) y `feed/` (publicaciones). De `identidad/` se
// mide la esencia, que manda sobre el color en todos los perfiles (`engine/esencia.ts`). Sin subcarpetas, todo cuenta
// como feed y solo el logo como identidad. `--interpretacion` usa un JSON ya escrito en lugar de llamar a la API.

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { FORMATO_PERFIL, validarPerfil } from "../../app/src/engine/perfil";
import { hslToHex } from "../../app/src/engine/color";
import type { Esencia } from "../../app/src/engine/esencia";
import { candidatosDeColor, esenciaDeArchivos, referenciaDeArchivo } from "./color";
import { ESQUEMA, SISTEMA, pedido, type Interpretacion } from "./prompt";

const EXTENSIONES = [".png", ".jpg", ".jpeg", ".webp"];
/** Lado mayor de las imágenes que ve el modelo: más no suma detalle y encarece. */
const LADO_MODELO = 1568;

try {
  process.loadEnvFile(join(import.meta.dirname, ".env"));
} catch {
  // Sin .env: vale ANTHROPIC_API_KEY del entorno o el perfil de `ant auth login`.
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    nombre: { type: "string" },
    usuario: { type: "string" },
    logo: { type: "string" },
    salida: { type: "string" },
    "solo-color": { type: "boolean", default: false },
    interpretacion: { type: "string" },
  },
});

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const esImagen = (f: string) => EXTENSIONES.includes(extname(f).toLowerCase());
const esCarpeta = (r: string) => stat(r).then((x) => x.isDirectory(), () => false);

/** Imágenes de la carpeta con su rol: `identidad/` y `feed/` si existen; si no, todo es feed y el logo es identidad. */
async function leerCarpeta(dir: string): Promise<{ archivo: string; ruta: string; identidad: boolean }[]> {
  const conSub = (await esCarpeta(join(dir, "identidad"))) || (await esCarpeta(join(dir, "feed")));
  if (!conSub) {
    const fs = (await readdir(dir)).filter(esImagen).sort();
    return fs.map((f) => ({ archivo: f, ruta: join(dir, f), identidad: /^logo\./i.test(f) || f === values.logo }));
  }
  const de = async (sub: string, identidad: boolean) =>
    (await esCarpeta(join(dir, sub)))
      ? (await readdir(join(dir, sub))).filter(esImagen).sort().map((f) => ({ archivo: `${sub}/${f}`, ruta: join(dir, sub, f), identidad }))
      : [];
  return [...(await de("identidad", true)), ...(await de("feed", false))];
}

async function main() {
  const carpeta = positionals[0];
  if (!carpeta) throw new Error("Falta la carpeta con las capturas: npm run perfilar -- <carpeta>");
  const dir = resolve(carpeta);
  const imagenes = await leerCarpeta(dir);
  if (!imagenes.length) throw new Error(`No hay imágenes (${EXTENSIONES.join(", ")}) en ${dir}`);
  const archivos = imagenes.map((i) => i.archivo);
  const empresa = values.nombre ?? basename(dir);
  const logo = values.logo ?? archivos.find((f) => /(^|\/)logo\./i.test(f)) ?? null;

  console.log(`Midiendo colores de ${archivos.length} imagen(es)…`);
  const referencias = await Promise.all(imagenes.map((i) => referenciaDeArchivo(i.ruta, i.archivo)));
  const esencia = await esenciaDeArchivos(imagenes.filter((i) => i.identidad).map((i) => ({ ruta: i.ruta, nombre: i.archivo })));
  const candidatos = candidatosDeColor(referencias);
  for (const c of candidatos) console.log(`  ${c.hex}  peso ${c.peso}  ${c.fuentes.join(", ")}`);
  const hex = (c: Esencia["superficie"] | null) => (c ? hslToHex(c).toUpperCase() : "—");
  if (esencia) console.log(`Esencia: superficie ${hex(esencia.superficie)} · figura ${hex(esencia.figura)} · detalle ${hex(esencia.detalle)}`);
  else console.log("Sin esencia: no hay piezas de identidad o ninguna figura se lee sobre su fondo.");
  if (values["solo-color"]) return;

  // Con esencia, el color previo es el de la identidad: el modelo no lo elige.
  const hexes = new Set(candidatos.map((c) => c.hex));
  const validar = (i: Interpretacion) => {
    const r = validarPerfil(armarPerfil(i, empresa, archivos, logo, referencias, esencia));
    const errores = r.ok ? [] : [...r.errores];
    if (!esencia && i.color_previo_hex && !hexes.has(i.color_previo_hex.toUpperCase()))
      errores.push(`color_previo_hex: ${i.color_previo_hex} no es uno de los colores medidos (${[...hexes].join(", ")}) ni null.`);
    return { r, errores };
  };

  if (values.interpretacion) {
    // Prueba sin API: la interpretación ya está escrita (a mano o en una conversación) con el mismo esquema.
    const { r, errores } = validar(JSON.parse(await readFile(resolve(values.interpretacion), "utf8")) as Interpretacion);
    if (!r.ok || errores.length) throw new Error(`La interpretación no pasó la validación:\n  - ${errores.join("\n  - ")}`);
    await escribir(r.perfil, dir, logo, r.avisos);
    return;
  }

  const modelo = process.env.PERFILADOR_MODELO || "claude-opus-5-5";
  console.log(`Interpretando con ${modelo}…`);
  const bloques: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const i of imagenes) {
    bloques.push({ type: "text", text: `Archivo: ${i.archivo}${i.archivo === logo ? " (logo)" : i.identidad ? " (identidad)" : ""}` });
    bloques.push(await imagenParaModelo(i.ruta));
  }

  const cliente = new Anthropic();
  const mensajes: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: [...bloques, { type: "text", text: pedido(empresa, candidatos, esencia) }] },
  ];

  for (let intento = 1; intento <= 2; intento++) {
    const respuesta = await cliente.beta.messages.create({
      model: modelo,
      max_tokens: 16000,
      system: SISTEMA,
      messages: mensajes,
      output_config: { effort: "high", format: { type: "json_schema", schema: ESQUEMA } },
      // Si el modelo declina por política, el servidor reintenta con el modelo de respaldo recomendado.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (respuesta.stop_reason === "refusal") throw new Error(`El modelo declinó el pedido (${respuesta.stop_details?.category ?? "sin categoría"}).`);
    if (respuesta.stop_reason === "max_tokens") throw new Error("La respuesta se cortó por max_tokens.");
    const json = respuesta.content.find((b) => b.type === "text")?.text ?? "";

    let errores: string[];
    try {
      const v = validar(JSON.parse(json) as Interpretacion);
      if (v.r.ok && !v.errores.length) {
        await escribir(v.r.perfil, dir, logo, v.r.avisos);
        return;
      }
      errores = v.errores;
    } catch {
      errores = ["La respuesta no es JSON válido."];
    }
    console.warn(`Intento ${intento}: la respuesta no pasó la validación.\n  - ${errores.join("\n  - ")}`);
    mensajes.push({ role: "assistant", content: respuesta.content });
    mensajes.push({ role: "user", content: `Corregí estos errores y devolvé el JSON completo de nuevo:\n- ${errores.join("\n- ")}` });
  }
  throw new Error("El perfil no pasó la validación después del reintento.");
}

/** Imagen redimensionada para el modelo: PNG si tiene transparencia (un logo), JPEG si no. */
async function imagenParaModelo(ruta: string): Promise<Anthropic.Beta.BetaImageBlockParam> {
  const img = sharp(ruta).resize(LADO_MODELO, LADO_MODELO, { fit: "inside", withoutEnlargement: true });
  const { hasAlpha } = await sharp(ruta).metadata();
  const buffer = hasAlpha ? await img.png().toBuffer() : await img.jpeg({ quality: 85 }).toBuffer();
  return { type: "image", source: { type: "base64", media_type: hasAlpha ? "image/png" : "image/jpeg", data: buffer.toString("base64") } };
}

/** El JSON del perfil: lo interpretado por el modelo más lo medido y los datos de la fuente. */
function armarPerfil(i: Interpretacion, empresa: string, archivos: string[], logo: string | null, referencias: unknown[], esencia: Esencia | null) {
  return {
    formato: FORMATO_PERFIL,
    fuente: { empresa, usuario_red: values.usuario ?? null, fecha: new Date().toISOString(), archivos },
    diagnostico: {
      nombre: i.nombre || empresa,
      rubro: i.rubro,
      rubro_secundario: i.rubro_secundario,
      rubro_libre: i.rubro_libre,
      ejes: i.ejes,
      personalidad: { tono: i.tono, valor: null },
      contenido: i.contenido,
      publico: i.publico,
      color_previo_hex: esencia ? null : (i.color_previo_hex?.toUpperCase() ?? null),
      tiene_fotos_propias: i.tiene_fotos_propias,
      tipografia_previa: i.tipografia_previa,
    },
    logo: logo ? { archivo: basename(logo) } : null,
    rescate: { grado: i.grado, referencias },
    esencia,
    evidencia: i.evidencia,
    confianza: i.confianza,
  };
}

async function escribir(perfil: unknown, dir: string, logo: string | null, avisos: string[]) {
  const p = perfil as { fuente: { empresa: string } };
  const salida = resolve(values.salida ?? join(dir, "salida"));
  await mkdir(salida, { recursive: true });
  const archivo = join(salida, `perfil-${slug(p.fuente.empresa) || "marca"}.json`);
  await writeFile(archivo, JSON.stringify(perfil, null, 2) + "\n", "utf8");
  // El logo viaja al lado del JSON: la app lo pide al importar.
  if (logo) await copyFile(join(dir, logo), join(salida, basename(logo)));
  for (const a of avisos) console.warn(`Aviso: ${a}`);
  console.log(`Listo: ${archivo}`);
}

main().catch((e: unknown) => {
  if (e instanceof Anthropic.AuthenticationError) console.error("Falta la clave: ANTHROPIC_API_KEY en herramientas/perfilador/.env o `ant auth login`.");
  else if (e instanceof Anthropic.RateLimitError) console.error("Límite de uso de la API: probá de nuevo en unos minutos.");
  else if (e instanceof Anthropic.APIError) console.error(`Error de la API (${e.status}): ${e.message}`);
  else console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
