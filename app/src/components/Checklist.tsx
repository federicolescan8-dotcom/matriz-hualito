"use client";

import { useMemo } from "react";
import type { Bloque, ResultadoChecklist } from "@/engine/checklist";

const BLOQUES: Bloque[] = ["Color y contraste", "Tipografía", "Composición", "Zonas seguras", "Contenido"];

export function Checklist({ resultado, titulo = "Control de calidad" }: { resultado: ResultadoChecklist | null; titulo?: string }) {
  const estados = useMemo(
    () => ({
      ok: { texto: "Aprobada", clase: "bg-emerald-100 text-emerald-900" },
      rechazado: { texto: "Rechazada", clase: "bg-red-100 text-red-900" },
      revision_manual: { texto: "Revisión manual", clase: "bg-amber-100 text-amber-900" },
    }),
    [],
  );
  if (!resultado) return <section className="text-sm text-neutral-500">Calculando…</section>;
  const fallidos = resultado.controles.filter((c) => !c.ok && !c.aceptado).length;
  const aceptados = resultado.controles.filter((c) => c.aceptado).length;
  const sugerencias = resultado.controles.filter((c) => c.aviso).length;
  return (
    <section className="flex flex-col gap-4 text-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${estados[resultado.estado].clase}`}>
          {estados[resultado.estado].texto}
          {resultado.estado === "ok" && aceptados + sugerencias > 0 && " con avisos"}
        </span>
      </div>
      <p className="text-neutral-600">
        {resultado.estado === "ok"
          ? aceptados
            ? `${aceptados} contraste${aceptados === 1 ? "" : "s"} no llega${aceptados === 1 ? "" : "n"} al mínimo por una decisión del cliente sobre la paleta (colores ajustados a mano o color heredado sin versión funcional). Se acepta${aceptados === 1 ? "" : "n"} por decisión del cliente; la pieza se puede publicar.`
            : `Los ${resultado.controles.length} controles del manual pasan. La pieza se puede publicar${sugerencias ? `; hay ${sugerencias === 1 ? "una sugerencia" : `${sugerencias} sugerencias`} para mejorarla` : ""}.`
          : resultado.estado === "revision_manual"
            ? resultado.motivos_revision.join(" ")
            : `${fallidos} control${fallidos === 1 ? "" : "es"} sin cumplir. Una pieza rechazada no se exporta.`}
      </p>
      {BLOQUES.map((b) => {
        const lista = resultado.controles.filter((c) => c.bloque === b);
        if (!lista.length) return null;
        return (
          <div key={b}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{b}</h3>
            <ul className="flex flex-col gap-1">
              {lista.map((c) => (
                <li key={c.control} className={`flex gap-2 ${c.aviso ? "text-amber-800" : c.ok ? "text-neutral-700" : c.aceptado ? "text-amber-800" : "text-red-800"}`}>
                  <span className="w-4 shrink-0">{c.aviso ? "⚠" : c.ok ? "✓" : c.aceptado ? "⚠" : "✗"}</span>
                  <span>
                    {c.control}
                    {c.detalle && <span className="text-neutral-500"> · {c.detalle}</span>}
                    {c.aviso ? (
                      <span className="block text-xs text-amber-700">Sugerencia: {c.aviso}</span>
                    ) : c.aceptado ? (
                      <span className="block text-xs text-amber-700">Aceptado por decisión del cliente sobre la paleta (ver la ficha de la marca).</span>
                    ) : (
                      !c.ok && <span className="block text-xs text-red-700">Acción: {c.accion}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

