import type { Browser } from "playwright-core";
import type { Marca } from "@/engine/diagnostico";
import { migrarMarca, type MarcaV1 } from "@/engine/identidad";
import { abrirNavegador } from "@/lib/navegador";

// Manual de marca en PDF (E8), con el mismo motor que el PNG: abre /manual con la marca inyectada en window.__MANUAL__,
// espera a que las piezas se midan y las fuentes carguen, e imprime la página con el navegador. Lo que se ve en
// /manual es lo que sale en el PDF.

export const runtime = "nodejs";

export async function POST(request: Request) {
  const datos = (await request.json()) as { marca: Marca | MarcaV1 };
  if (!datos.marca) return Response.json({ error: "Falta la marca" }, { status: 400 });
  const marca = migrarMarca(datos.marca);

  let browser: Browser;
  try {
    browser = await abrirNavegador();
  } catch {
    return Response.json({ error: "No se encontró Edge ni Chrome instalados para generar el PDF." }, { status: 500 });
  }

  const contexto = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
  try {
    const page = await contexto.newPage();
    await page.addInitScript((marca) => {
      (window as unknown as { __MANUAL__: unknown }).__MANUAL__ = marca;
    }, marca);
    await page.goto(new URL("/manual/x", request.url).toString(), { waitUntil: "networkidle" });
    await page.waitForSelector('[data-manual-listo="true"]', { timeout: 60000 });
    // En desarrollo Next.js agrega su indicador flotante; no tiene que quedar en el PDF.
    await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json({ error: `No se pudo generar el PDF: ${(e as Error).message}` }, { status: 500 });
  } finally {
    await contexto.close();
  }
}
