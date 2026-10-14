// Perfilador: de una carpeta con capturas reales de una empresa a `perfil-<slug>.json`, listo para "Importar perfil"
// en /marcas. Los colores se miden (color.ts); lo interpretativo (rubro, ejes, tono, contenido, público, grado) lo lee
// Claude con visión y lo valida el motor (`validarPerfil`). Si la respuesta no pasa, se reintenta una vez con los errores.
//
//   npm run perfilar -- <carpeta> [--nombre "Barocca"] [--usuario baroccatortuguitas] [--logo logo.png]
//                                 [--salida <carpeta>] [--solo-color]

import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { FORMATO_PERFIL, validarPerfil } from "../../app/src/engine/perfil";
import { candidatosDeColor, referenciaDeArchivo } from "./color";
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
  },
});

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const carpeta = positionals[0];
  if (!carpeta) throw new Error("Falta la carpeta con las capturas: npm run perfilar -- <carpeta>");
  const dir = resolve(carpeta);
  const archivos = (await readdir(dir)).filter((f) => EXTENSIONES.includes(extname(f).toLowerCase())).sort();
  if (!archivos.length) throw new Error(`No hay imágenes (${EXTENSIONES.join(", ")}) en ${dir}`);
  const empresa = values.nombre ?? basename(dir);
  const logo = values.logo ?? archivos.find((f) => /^logo\./i.test(f)) ?? null;

  console.log(`Midiendo colores de ${archivos.length} imagen(es)…`);
  const referencias = await Promise.all(archivos.map((f) => referenciaDeArchivo(join(dir, f), f)));
  const candidatos = candidatosDeColor(referencias);
  for (const c of candidatos) console.log(`  ${c.hex}  peso ${c.peso}  ${c.fuentes.join(", ")}`);
  if (values["solo-color"]) return;

  const modelo = process.env.PERFILADOR_MODELO || "claude-opus-5-5";
  console.log(`Interpretando con ${modelo}…`);
  const imagenes: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of archivos) {
    imagenes.push({ type: "text", text: `Archivo: ${f}${f === logo ? " (logo)" : ""}` });
    imagenes.push(await imagenParaModelo(join(dir, f)));
  }

  const cliente = new Anthropic();
  const mensajes: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: [...imagenes, { type: "text", text: pedido(empresa, candidatos) }] }];
  const hexes = new Set(candidatos.map((c) => c.hex));

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
    let interpretacion: Interpretacion | null = null;
    try {
      interpretacion = JSON.parse(json) as Interpretacion;
      errores = [];
    } catch {
      errores = ["La respuesta no es JSON válido."];
    }
    if (interpretacion) {
      const perfil = armarPerfil(interpretacion, empresa, archivos, logo, referencias);
      const r = validarPerfil(perfil);
      errores = r.ok ? [] : r.errores;
      // El color previo tiene que ser uno de los medidos: "medir, no adivinar".
      if (interpretacion.color_previo_hex && !hexes.has(interpretacion.color_previo_hex.toUpperCase()))
        errores.push(`color_previo_hex: ${interpretacion.color_previo_hex} no es uno de los colores medidos (${[...hexes].join(", ")}) ni null.`);
      if (r.ok && !errores.length) {
        await escribir(r.perfil, dir, logo, r.avisos);
        return;
      }
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
function armarPerfil(i: Interpretacion, empresa: string, archivos: string[], logo: string | null, referencias: unknown[]) {
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
      color_previo_hex: i.color_previo_hex?.toUpperCase() ?? null,
      tiene_fotos_propias: i.tiene_fotos_propias,
      tipografia_previa: i.tipografia_previa,
    },
    logo: logo ? { archivo: logo } : null,
    rescate: { grado: i.grado, referencias },
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
  if (logo) await copyFile(join(dir, logo), join(salida, logo));
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
