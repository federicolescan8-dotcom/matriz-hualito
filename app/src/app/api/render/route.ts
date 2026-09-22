import { chromium, type Browser } from "playwright-core";
import { FORMATOS } from "@/engine/formatos";
import type { Marca } from "@/engine/diagnostico";
import type { Pieza } from "@/engine/pieza";
import type { Medicion, ResultadoChecklist } from "@/engine/checklist";

// Render a PNG con el navegador instalado en la máquina (Edge, o Chrome como alternativa), sin descargar uno propio.
// Abre /render con la marca y la pieza, espera a que el texto se ajuste y el checklist corra, y solo devuelve el PNG
// si la pieza aprueba: el automatizador nunca publica con una advertencia pendiente (cap. 8).

export const runtime = "nodejs";

let navegador: Promise<Browser> | null = null;

function abrirNavegador(): Promise<Browser> {
  if (!navegador) {
    navegador = chromium
      .launch({ channel: "msedge" })
      .catch(() => chromium.launch({ channel: "chrome" }))
      .catch((e) => {
        navegador = null;
        throw e;
      });
  }
  return navegador;
}

export async function POST(request: Request) {
  const { marca, pieza } = (await request.json()) as { marca: Marca; pieza: Pieza };
  const f = FORMATOS[pieza?.formato];
  if (!marca || !pieza || !f) return Response.json({ error: "Faltan la marca o la pieza" }, { status: 400 });

  let browser: Browser;
  try {
    browser = await abrirNavegador();
  } catch {
    return Response.json({ error: "No se encontró Edge ni Chrome instalados para renderizar." }, { status: 500 });
  }

  const contexto = await browser.newContext({ viewport: { width: f.ancho, height: f.alto }, deviceScaleFactor: 1 });
  try {
    const page = await contexto.newPage();
    await page.addInitScript((datos) => {
      (window as unknown as { __RENDER__: unknown }).__RENDER__ = datos;
    }, { marca, pieza });
    await page.goto(new URL("/render", request.url).toString(), { waitUntil: "networkidle" });
    await page.waitForSelector('[data-pieza][data-listo="true"]', { timeout: 20000 });
    const salida = await page.evaluate(
      () => (window as unknown as { __RESULTADO__: { resultado: ResultadoChecklist; medicion: Medicion } }).__RESULTADO__,
    );
    if (salida.resultado.estado !== "ok") {
      return Response.json(salida, { status: 422 });
    }
    // En desarrollo Next.js agrega su indicador flotante; no tiene que quedar en la pieza.
    await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
    const png = await page.locator("[data-pieza]").screenshot({ type: "png" });
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json({ error: `No se pudo renderizar: ${(e as Error).message}` }, { status: 500 });
  } finally {
    await contexto.close();
  }
}
