"use client";

import { useState } from "react";
import type { Bloque, Control, NivelRegla, ResultadoChecklist } from "@/engine/checklist";

const BLOQUES: Bloque[] = ["Color y contraste", "Tipografía", "Composición", "Zonas seguras", "Contenido"];

const ESTADOS = {
  ok: { texto: "Aprobada", clase: "bg-emerald-100 text-emerald-900" },
  rechazado: { texto: "Rechazada", clase: "bg-red-100 text-red-900" },
  revision_manual: { texto: "Revisión manual", clase: "bg-amber-100 text-amber-900" },
};

/** Niveles de regla (E9): cómo se muestra cada uno cuando el control no se cumple. */
const NIVELES: Record<NivelRegla, { etiqueta: string; clase: string }> = {
  bloqueante: { etiqueta: "bloqueante", clase: "bg-red-100 text-red-900" },
  aviso: { etiqueta: "aviso", clase: "bg-amber-100 text-amber-900" },
  sugerencia: { etiqueta: "sugerencia", clase: "bg-sky-100 text-sky-900" },
};

/** Una sugerencia que no se cumple no frena: se muestra como sugerencia, igual que las mejoras de oficio. */
const esSugerencia = (c: Control) => !!c.aviso || (!c.ok && c.nivel === "sugerencia");

export function Checklist({
  resultado,
  titulo = "Control de calidad",
  onAceptar,
  onQuitar,
}: {
  resultado: ResultadoChecklist | null;
  titulo?: string;
  /** Si está, los avisos que fallan se pueden aceptar con una justificación (E9). */
  onAceptar?: (control: string, motivo: string) => void;
  onQuitar?: (control: string) => void;
}) {
  if (!resultado) return <section className="text-sm text-neutral-500">Calculando…</section>;
  const fallidos = resultado.controles.filter((c) => !c.ok && !c.aceptado && c.nivel !== "sugerencia");
  const bloqueantes = fallidos.filter((c) => c.nivel === "bloqueante").length;
  const aceptados = resultado.controles.filter((c) => c.aceptado).length;
  const sugerencias = resultado.controles.filter(esSugerencia).length;
  return (
    <section className="flex flex-col gap-4 text-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${ESTADOS[resultado.estado].clase}`}>
          {ESTADOS[resultado.estado].texto}
          {resultado.estado === "ok" && aceptados + sugerencias > 0 && " con avisos"}
        </span>
      </div>
      <p className="text-neutral-600">
        {resultado.estado === "ok"
          ? aceptados
            ? `${aceptados} aviso${aceptados === 1 ? "" : "s"} aceptado${aceptados === 1 ? "" : "s"} por decisión del cliente. La pieza se puede publicar.`
            : `Los ${resultado.controles.length} controles del manual pasan. La pieza se puede publicar${sugerencias ? `; hay ${sugerencias === 1 ? "una sugerencia" : `${sugerencias} sugerencias`} para mejorarla` : ""}.`
          : resultado.estado === "revision_manual"
            ? resultado.motivos_revision.join(" ")
            : `${fallidos.length} control${fallidos.length === 1 ? "" : "es"} sin cumplir${bloqueantes ? `, ${bloqueantes} bloqueante${bloqueantes === 1 ? "" : "s"}` : ""}. Una pieza rechazada no se exporta${onAceptar && bloqueantes < fallidos.length ? "; los avisos se pueden aceptar con una justificación" : ""}.`}
      </p>
      {BLOQUES.map((b) => {
        const lista = resultado.controles.filter((c) => c.bloque === b);
        if (!lista.length) return null;
        return (
          <div key={b}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{b}</h3>
            <ul className="flex flex-col gap-1">
              {lista.map((c) => (
                <ItemControl key={c.control} c={c} onAceptar={onAceptar} onQuitar={onQuitar} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function ItemControl({ c, onAceptar, onQuitar }: { c: Control; onAceptar?: (control: string, motivo: string) => void; onQuitar?: (control: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const sugerencia = esSugerencia(c);
  const falla = !c.ok && !c.aceptado && !sugerencia;
  const color = sugerencia || c.aceptado ? "text-amber-800" : c.ok ? "text-neutral-700" : "text-red-800";
  return (
    <li className={`flex gap-2 ${color}`}>
      <span className="w-4 shrink-0">{sugerencia || c.aceptado ? "⚠" : c.ok ? "✓" : "✗"}</span>
      <span className="flex flex-col gap-1">
        <span>
          {c.control}
          {c.detalle && <span className="text-neutral-500"> · {c.detalle}</span>}
          {!c.ok && <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${NIVELES[c.nivel].clase}`}>{NIVELES[c.nivel].etiqueta}</span>}
        </span>
        {c.aviso ? (
          <span className="text-xs text-amber-700">Sugerencia: {c.aviso}</span>
        ) : sugerencia ? (
          <span className="text-xs text-amber-700">Sugerencia del rubro: {c.accion}. No frena la publicación.</span>
        ) : c.justificacion ? (
          <span className="text-xs text-amber-700">
            Aceptado por {c.justificacion.autor} el {new Date(c.justificacion.fecha).toLocaleDateString("es-AR")}: «{c.justificacion.motivo}».
            {onQuitar && (
              <button type="button" onClick={() => onQuitar(c.control)} className="ml-2 underline">
                Quitar
              </button>
            )}
          </span>
        ) : c.aceptado ? (
          <span className="text-xs text-amber-700">Aceptado por decisión del cliente sobre la paleta (ver la identidad de la marca).</span>
        ) : (
          falla && (
            <>
              <span className="text-xs text-red-700">
                Acción: {c.accion}
                {c.nivel === "bloqueante" && " · Es legibilidad crítica: no se puede aceptar."}
              </span>
              {c.nivel === "aviso" && onAceptar && !abierto && (
                <button type="button" onClick={() => setAbierto(true)} className="self-start text-xs underline">
                  Aceptar con justificación
                </button>
              )}
              {abierto && onAceptar && (
                <form
                  className="flex flex-col gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!motivo.trim()) return;
                    onAceptar(c.control, motivo);
                    setAbierto(false);
                    setMotivo("");
                  }}
                >
                  <textarea
                    autoFocus
                    rows={2}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="¿Por qué se rompe la regla a propósito?"
                    className="resize-none rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900"
                  />
                  <span className="flex gap-2 text-xs">
                    <button type="submit" disabled={!motivo.trim()} className="rounded bg-neutral-900 px-2 py-1 text-white disabled:opacity-40">
                      Aceptar
                    </button>
                    <button type="button" onClick={() => setAbierto(false)} className="underline">
                      Cancelar
                    </button>
                  </span>
                </form>
              )}
            </>
          )
        )}
      </span>
    </li>
  );
}
