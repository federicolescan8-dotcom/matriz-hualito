import { chromium, type Browser } from "playwright-core";

// Navegador sin ventana compartido por las rutas que fotografían páginas de la app (/api/render y /api/manual): el
// que está instalado en la máquina (Edge o Chrome) o, donde no hay ninguno (Linux, nube), el Chromium de Playwright:
// `npx playwright-core install chromium`.

let navegador: Promise<Browser> | null = null;

export function abrirNavegador(): Promise<Browser> {
  if (!navegador) {
    navegador = chromium
      .launch({ channel: "msedge" })
      .catch(() => chromium.launch({ channel: "chrome" }))
      .catch(() => chromium.launch())
      .catch((e) => {
        navegador = null;
        throw e;
      });
  }
  return navegador;
}
