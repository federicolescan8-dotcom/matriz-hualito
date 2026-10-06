"use client";

import { useMemo, useState } from "react";
import { zipSync } from "fflate";
import { Checklist } from "@/components/Checklist";
import { EditorCatalogo, EditorContacto, EditorDeco } from "@/components/EditoresPieza";
import { Pieza } from "@/components/Pieza";
import {
  agregarSlide,
  carruselNuevo,
  evaluarCarrusel,
  MAX_SLIDES,
  MIN_SLIDES,
  moverSlide,
  NOMBRE_ROL,
  PALABRAS_PORTADA,
  piezaDeSlide,
  quitarSlide,
  VARIANTES_POR_ROL,
  type Carrusel,
  type Slide,
} from "@/engine/carrusel";
import type { ResultadoChecklist } from "@/engine/checklist";
import type { Marca } from "@/engine/diagnostico";
import { FORMATOS } from "@/engine/formatos";
import { PLANTILLAS, type Pieza as TPieza } from "@/engine/pieza";
import { descargar, renderizar, slug } from "@/lib/exportar";

const F = FORMATOS["4:5"];
const ESCALA_VISTA = Math.min(460 / F.ancho, 640 / F.alto);
const ALTO_MINIATURA = 150;

/**
 * Carrusel 4:5 (v1.1): portada, slides de contenido y cierre. Se edita de a un slide; la tira muestra la serie
 * completa con el control de cada slide, y el control del carrusel revisa la estructura.
 */
export function PublicarCarrusel({ marca }: { marca: Marca }) {
  const inicial = useMemo(() => carruselNuevo(marca), [marca]);
  const [estado, setEstado] = useState<Carrusel | null>(null);
  const c = estado && estado.marca_id === marca.id ? estado : inicial;
  const [elegido, setElegido] = useState(0);
  const [resultados, setResultados] = useState<Record<string, ResultadoChecklist>>({});
  const [exportando, setExportando] = useState(false);
  const [mensajeExport, setMensajeExport] = useState<string | null>(null);

  const i = Math.min(elegido, c.slides.length - 1);
  const s = c.slides[i];
  const pieza = piezaDeSlide(marca, c, i);
  const plantilla = PLANTILLAS[s.variante]!;
  const deLaSerie = c.slides.map((x) => resultados[x.id]);
  const control = evaluarCarrusel(marca, c, deLaSerie);

  const guardarResultado = (id: string, r: ResultadoChecklist) =>
    setResultados((prev) => (prev[id] === r ? prev : { ...prev, [id]: r }));
  const cambiar = (nuevo: Carrusel) => {
    setEstado(nuevo);
    setMensajeExport(null);
  };
  const setSlide = (d: Partial<Slide>) => cambiar({ ...c, slides: c.slides.map((x, j) => (j === i ? { ...x, ...d } : x)) });
  const setContenido = (d: Partial<Slide["contenido"]>) => setSlide({ contenido: { ...s.contenido, ...d } });
  // Los editores de la pieza simple devuelven cambios de pieza: se guardan los que corresponden al slide.
  const desdePieza = (p: Partial<TPieza>) =>
    setSlide({
      ...(p.deco !== undefined ? { deco: p.deco } : {}),
      ...(p.contacto !== undefined ? { contacto: p.contacto } : {}),
      ...(p.items !== undefined ? { items: p.items } : {}),
    });
  const palabrasPortada = c.slides[0].contenido.h1.trim().split(/\s+/).filter(Boolean).length;

  async function exportar() {
    setExportando(true);
    setMensajeExport(null);
    try {
      const archivos: Record<string, Uint8Array> = {};
      const fallidos: number[] = [];
      for (let j = 0; j < c.slides.length; j++) {
        const r = await renderizar(marca, piezaDeSlide(marca, c, j));
        if ("png" in r) archivos[`${slug(marca.nombre)}-carrusel-${String(j + 1).padStart(2, "0")}.png`] = new Uint8Array(await r.png.arrayBuffer());
        else fallidos.push(j + 1);
      }
      if (fallidos.length) {
        setMensajeExport(`No se exportó: los slides ${fallidos.join(", ")} no pasaron el control final.`);
        return;
      }
      const zip = zipSync(archivos, { level: 0 });
      descargar(new Blob([zip as BlobPart], { type: "application/zip" }), `${slug(marca.nombre)}-carrusel.zip`);
    } catch (e) {
      setMensajeExport(`No se pudo exportar: ${(e as Error).message}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_auto_1fr]">
      {/* Editor del slide elegido */}
      <section className="flex flex-col gap-5 text-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            Slide {i + 1} de {c.slides.length} · {NOMBRE_ROL[s.rol]}
          </h2>
        </div>
        <p className="-mt-3 text-xs text-neutral-500">
          {s.rol === "portada"
            ? `Gancho corto (hasta ${PALABRAS_PORTADA} palabras), sin CTA. Abajo a la derecha va la señal para deslizar.`
            : s.rol === "contenido"
              ? "Un punto por slide, sin logo ni CTA: en su lugar va la posición en la serie."
              : "Cierre: resumen, logo y el único llamado a la acción del carrusel."}
        </p>

        {VARIANTES_POR_ROL[s.rol].length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="font-medium">Variante</span>
            <div className="grid grid-cols-2 gap-2">
              {VARIANTES_POR_ROL[s.rol].map((v) => (
                <button
                  key={v}
                  type="button"
                  title={PLANTILLAS[v]!.descripcion}
                  onClick={() => setSlide({ variante: v })}
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${s.variante === v ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
                >
                  {PLANTILLAS[v]!.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-medium">Mensaje principal (H1)</span>
          <textarea rows={2} value={s.contenido.h1} onChange={(e) => setContenido({ h1: e.target.value })} className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
          {s.rol === "portada" && (
            <span className={`text-xs ${palabrasPortada > PALABRAS_PORTADA ? "text-amber-800" : "text-neutral-500"}`}>
              {palabrasPortada} de {PALABRAS_PORTADA} palabras como máximo
            </span>
          )}
        </label>
        {s.variante !== "4" && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Dato de apoyo</span>
            <textarea rows={3} value={s.contenido.body ?? ""} onChange={(e) => setContenido({ body: e.target.value || null })} className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
          </label>
        )}
        {s.rol === "cierre" && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Llamado a la acción</span>
            <input value={s.contenido.cta ?? ""} onChange={(e) => setContenido({ cta: e.target.value || null })} className="rounded-md border border-neutral-300 px-3 py-2" />
          </label>
        )}
        {plantilla.deco && <EditorDeco marca={marca} pieza={pieza} onChange={desdePieza} />}
        {plantilla.bloque === "contacto" && <EditorContacto pieza={pieza} onChange={desdePieza} />}
        {plantilla.bloque === "catalogo" && <EditorCatalogo marca={marca} pieza={pieza} onChange={desdePieza} />}

        <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
          <button type="button" disabled={c.slides[i - 1]?.rol !== "contenido" || s.rol !== "contenido"} onClick={() => { cambiar(moverSlide(c, i, -1)); setElegido(i - 1); }} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-30">
            ← Antes
          </button>
          <button type="button" disabled={c.slides[i + 1]?.rol !== "contenido" || s.rol !== "contenido"} onClick={() => { cambiar(moverSlide(c, i, 1)); setElegido(i + 1); }} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-30">
            Después →
          </button>
          <button type="button" disabled={s.rol !== "contenido" || c.slides.length <= MIN_SLIDES} onClick={() => { cambiar(quitarSlide(c, i)); setElegido(Math.max(0, i - 1)); }} className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-30">
            Quitar slide
          </button>
          <button type="button" disabled={c.slides.length >= MAX_SLIDES} onClick={() => { cambiar(agregarSlide(c)); setElegido(c.slides.length - 1); }} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-30">
            + Agregar punto
          </button>
        </div>
        <p className="-mt-3 text-xs text-neutral-500">
          Portada y cierre van en el modo predominante de la marca; los puntos, en el opuesto. Hasta {MAX_SLIDES} slides.
        </p>
      </section>

      {/* Vista previa y tira de la serie */}
      <section className="flex flex-col gap-3">
        <div className="text-xs text-neutral-500">{F.nombre} · carrusel · modo {pieza.modo}</div>
        <div className="relative overflow-hidden rounded-md shadow-md" style={{ width: F.ancho * ESCALA_VISTA, height: F.alto * ESCALA_VISTA }}>
          <div style={{ transform: `scale(${ESCALA_VISTA})`, transformOrigin: "top left" }}>
            <Pieza marca={marca} pieza={pieza} onResultado={(r) => guardarResultado(s.id, r)} />
          </div>
        </div>
        <button
          type="button"
          onClick={exportar}
          disabled={exportando || control.estado !== "ok"}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm text-white disabled:opacity-30"
        >
          {exportando ? "Generando slides…" : `Descargar el carrusel (${c.slides.length} PNG en un ZIP)`}
        </button>
        {mensajeExport && <p className="max-w-[460px] text-sm text-red-700">{mensajeExport}</p>}

        <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">La serie</h3>
        <div className="flex max-w-[640px] gap-2 overflow-x-auto pb-2">
          {c.slides.map((x, j) => {
            const r = resultados[x.id];
            return (
              <button key={x.id} type="button" onClick={() => setElegido(j)} className="flex shrink-0 flex-col items-start gap-1 text-left">
                <div
                  className={`overflow-hidden rounded ${j === i ? "ring-2 ring-neutral-900" : "ring-1 ring-neutral-200"}`}
                  style={{ width: (F.ancho * ALTO_MINIATURA) / F.alto, height: ALTO_MINIATURA }}
                >
                  <div style={{ transform: `scale(${ALTO_MINIATURA / F.alto})`, transformOrigin: "top left", pointerEvents: "none" }}>
                    <Pieza marca={marca} pieza={piezaDeSlide(marca, c, j)} onResultado={(res) => guardarResultado(x.id, res)} />
                  </div>
                </div>
                <span className="text-xs">
                  {j + 1} · {NOMBRE_ROL[x.rol]}{" "}
                  <span className={r?.estado === "ok" ? "text-emerald-700" : r ? "text-red-700" : "text-neutral-400"}>
                    {r ? (r.estado === "ok" ? "✓" : r.estado === "revision_manual" ? "revisión" : "✗") : "…"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Controles */}
      <div className="flex flex-col gap-8">
        <Checklist resultado={control} titulo="Control del carrusel" />
        <Checklist resultado={resultados[s.id] ?? null} titulo={`Control del slide ${i + 1}`} />
      </div>
    </div>
  );
}
