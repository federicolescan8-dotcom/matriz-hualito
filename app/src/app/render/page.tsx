"use client";

import { useSyncExternalStore } from "react";
import { Pieza } from "@/components/Pieza";
import type { Marca } from "@/engine/diagnostico";
import type { Pieza as TPieza } from "@/engine/pieza";
import type { Medicion, ResultadoChecklist } from "@/engine/checklist";

// Página que abre el navegador sin ventana para exportar la pieza a PNG. Recibe marca y pieza en
// window.__RENDER__ (inyectado antes de cargar) y deja el resultado del checklist en window.__RESULTADO__.
declare global {
  interface Window {
    __RENDER__?: { marca: Marca; pieza: TPieza };
    __RESULTADO__?: { resultado: ResultadoChecklist; medicion: Medicion };
  }
}

const sinSuscripcion = () => () => {};

export default function RenderPage() {
  const datos = useSyncExternalStore(sinSuscripcion, () => window.__RENDER__ ?? null, () => null);
  if (!datos) return null;
  return (
    <div style={{ position: "fixed", left: 0, top: 0 }}>
      <Pieza
        marca={datos.marca}
        pieza={datos.pieza}
        onResultado={(resultado, medicion) => {
          window.__RESULTADO__ = { resultado, medicion };
        }}
      />
    </div>
  );
}
