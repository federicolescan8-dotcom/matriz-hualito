"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pieza } from "@/components/Pieza";
import { TEXTOS_EJEMPLO } from "@/components/PiezaMuestra";
import type { Bloque, ResultadoChecklist } from "@/engine/checklist";
import type { Marca } from "@/engine/diagnostico";
import { CANALES, FORMATOS, type Canal, type Formato } from "@/engine/formatos";
import {
  alineacionesPermitidas,
  formatoDeCanal,
  piezaNueva,
  PLANTILLAS,
  secuenciaModo,
  varianteSugerida,
  VARIANTES_HABILITADAS,
  type Pieza as TPieza,
} from "@/engine/pieza";
import { PRESETS, type Variante } from "@/engine/presets";
import { pesoH1 } from "@/engine/typography";
import { useMarcas } from "@/lib/marcas";
import { zipSync } from "fflate";

const VISTA_MAX = { ancho: 460, alto: 640 };

/** Un formato por canal para la exportación en lote: 9:16 sirve para stories y estados. */
const TODOS: { formato: Formato; canal: Canal }[] = [
  { formato: "4:5", canal: "feed_ig" },
  { formato: "1:1", canal: "feed_ig" },
  { formato: "9:16", canal: "stories_ig" },
  { formato: "1200x630", canal: "feed_fb" },
];

type Render = { png: Blob } | { resultado: ResultadoChecklist } | { error: string };

async function renderizar(marca: Marca, pieza: TPieza): Promise<Render> {
  const res = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marca, pieza }),
  });
  if (res.status === 422) return { resultado: ((await res.json()) as { resultado: ResultadoChecklist }).resultado };
  if (!res.ok) return { error: ((await res.json()) as { error: string }).error };
  return { png: await res.blob() };
}

function slug(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}

function nombreArchivo(marca: Marca, p: TPieza): string {
  return `${slug(marca.nombre)}-${p.canal}-${p.formato.replace(":", "x")}-v${p.variante}-${p.modo}.png`;
}

function descargar(blob: Blob, nombre: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

function piezaInicial(marca: Marca): TPieza {
  const t = TEXTOS_EJEMPLO[marca.rubro];
  return { ...piezaNueva(marca), contenido: { h1: t.h1, body: t.body, cta: t.cta } };
}

export default function PublicarPage() {
  const marcas = useMarcas();
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const marca = marcas.find((m) => m.id === marcaId) ?? marcas[0] ?? null;
  const [pieza, setPieza] = useState<TPieza | null>(null);
  // La pieza por defecto se crea una sola vez por marca: si se recreara en cada render cambiaría su id y la vista
  // previa se recalcularía sin fin.
  const inicial = useMemo(() => (marca ? piezaInicial(marca) : null), [marca]);
  const actual = pieza && marca && pieza.marca_id === marca.id ? pieza : inicial;
  const [resultado, setResultado] = useState<ResultadoChecklist | null>(null);
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  if (!marca || !actual) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Nueva publicación</h1>
        <p className="mb-6 text-neutral-600">Primero hace falta una marca guardada.</p>
        <Link href="/" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Hacer un diagnóstico</Link>
      </div>
    );
  }

  const set = (p: Partial<TPieza>) => {
    setPieza({ ...actual, ...p });
    setErrorExport(null);
  };
  const setContenido = (c: Partial<TPieza["contenido"]>) => set({ contenido: { ...actual.contenido, ...c } });
  const plantilla = PLANTILLAS[actual.variante]!;
  const piezaEn = (formato: Formato, canal: Canal): TPieza => ({ ...actual, formato, canal });
  const f = FORMATOS[actual.formato];
  const permitidas = alineacionesPermitidas(marca.rubro, actual.variante);
  const secuencia = secuenciaModo(marca);
  const escala = Math.min(VISTA_MAX.ancho / f.ancho, VISTA_MAX.alto / f.alto);

  async function exportar() {
    setExportando(true);
    setErrorExport(null);
    try {
      const r = await renderizar(marca!, actual!);
      if ("png" in r) descargar(r.png, nombreArchivo(marca!, actual!));
      else if ("resultado" in r) {
        setResultado(r.resultado);
        setErrorExport("El render final no pasó el control de calidad. Revisá los controles marcados.");
      } else setErrorExport(r.error);
    } catch (e) {
      setErrorExport(`No se pudo exportar: ${(e as Error).message}`);
    } finally {
      setExportando(false);
    }
  }

  /** Genera la misma pieza en los cuatro formatos y los descarga en un ZIP. Los que no aprueban quedan afuera. */
  async function exportarTodos() {
    setExportando(true);
    setErrorExport(null);
    try {
      const archivos: Record<string, Uint8Array> = {};
      const omitidos: string[] = [];
      for (const { formato, canal } of TODOS) {
        const p = piezaEn(formato, canal);
        const r = await renderizar(marca!, p);
        if ("png" in r) archivos[nombreArchivo(marca!, p)] = new Uint8Array(await r.png.arrayBuffer());
        else omitidos.push(`${formato} (${"resultado" in r ? "no aprobó el control" : r.error})`);
      }
      if (Object.keys(archivos).length) {
        const zip = zipSync(archivos, { level: 0 });
        descargar(new Blob([zip as BlobPart], { type: "application/zip" }), `${slug(marca!.nombre)}-todos-los-formatos.zip`);
      }
      if (omitidos.length) setErrorExport(`Quedaron afuera: ${omitidos.join(", ")}.`);
    } catch (e) {
      setErrorExport(`No se pudo exportar: ${(e as Error).message}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[20rem_auto_1fr]">
      {/* Formulario */}
      <section className="flex flex-col gap-5 text-sm">
        <h1 className="text-2xl font-semibold">Nueva publicación</h1>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Marca</span>
          <select
            value={marca.id}
            onChange={(e) => {
              setMarcaId(e.target.value);
              setPieza(null);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Canal</span>
            <select
              value={actual.canal}
              onChange={(e) => {
                const canal = e.target.value as Canal;
                set({ canal, formato: formatoDeCanal(canal, actual.formato) });
              }}
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              {(Object.keys(CANALES) as Canal[]).map((k) => {
                const disponible = CANALES[k].formatos.some((fm) => FORMATOS[fm].habilitado);
                return (
                  <option key={k} value={k} disabled={!disponible}>
                    {CANALES[k].nombre}
                    {disponible ? "" : " · fase 3"}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Formato</span>
            <select
              value={actual.formato}
              onChange={(e) => set({ formato: e.target.value as TPieza["formato"] })}
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              {CANALES[actual.canal].formatos.map((fm) => (
                <option key={fm} value={fm} disabled={!FORMATOS[fm].habilitado}>
                  {fm}
                  {FORMATOS[fm].habilitado ? "" : " · fase 3"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="-mt-3 text-xs text-neutral-500">Stories y estados de WhatsApp comparten el formato 9:16.</p>

        <div className="flex flex-col gap-2">
          <span className="font-medium">Variante</span>
          {VARIANTES_HABILITADAS.map((v: Variante) => (
            <button
              key={v}
              type="button"
              onClick={() => set({ variante: v, alineacion: alineacionesPermitidas(marca.rubro, v).includes(actual.alineacion) ? actual.alineacion : "izquierda" })}
              className={`rounded-lg border p-3 text-left ${actual.variante === v ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
            >
              <div className="font-medium">
                {PLANTILLAS[v]!.nombre}
                {varianteSugerida(marca.rubro) === v && <span className="ml-2 text-xs font-normal opacity-70">sugerida</span>}
              </div>
              <div className="mt-0.5 text-xs opacity-70">{PLANTILLAS[v]!.descripcion}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-medium">Modo</span>
            <div className="flex overflow-hidden rounded-md border border-neutral-300">
              {(["A", "B"] as const).map((m) => (
                <button key={m} type="button" onClick={() => set({ modo: m })} className={`flex-1 py-2 ${actual.modo === m ? "bg-neutral-900 text-white" : "bg-white"}`}>
                  {m === "A" ? "A · claro" : "B · bold"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Alineación</span>
            <select
              value={actual.alineacion}
              onChange={(e) => set({ alineacion: e.target.value as TPieza["alineacion"] })}
              disabled={permitidas.length < 2}
              className="rounded-md border border-neutral-300 px-3 py-2"
            >
              {permitidas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <p className="-mt-3 text-xs text-neutral-500">
          Secuencia del rubro: {secuencia.join(" → ")}. La rotación automática por canal llega en la fase 4.
        </p>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Mensaje principal (H1)</span>
          <textarea rows={2} value={actual.contenido.h1} onChange={(e) => setContenido({ h1: e.target.value })} className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
          <span className="text-xs text-neutral-500">
            {actual.contenido.h1.trim().length} caracteres → peso {pesoH1(actual.contenido.h1, marca.tipografia.familia_variable)}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Dato de apoyo</span>
          <textarea rows={3} value={actual.contenido.body ?? ""} onChange={(e) => setContenido({ body: e.target.value || null })} className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
        </label>
        {marca.tipografia.italic_habilitado && (
          <label className="-mt-3 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={actual.body_italica} onChange={(e) => set({ body_italica: e.target.checked })} />
            Dato de apoyo en itálica (tono, no jerarquía)
          </label>
        )}
        {plantilla.tieneCta && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Llamado a la acción</span>
            <input value={actual.contenido.cta ?? ""} onChange={(e) => setContenido({ cta: e.target.value || null })} className="rounded-md border border-neutral-300 px-3 py-2" />
          </label>
        )}
      </section>

      {/* Vista previa */}
      <section className="flex flex-col gap-3">
        <div className="text-xs text-neutral-500">
          {f.nombre} · {PRESETS[marca.rubro].nombre} · {marca.tipografia.familia_variable}
        </div>
        <div className="overflow-hidden rounded-md shadow-md" style={{ width: f.ancho * escala, height: f.alto * escala }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
            <Pieza marca={marca} pieza={actual} onResultado={setResultado} />
          </div>
        </div>
        <button
          type="button"
          onClick={exportar}
          disabled={exportando || resultado?.estado !== "ok"}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm text-white disabled:opacity-30"
        >
          {exportando ? "Generando PNG…" : `Descargar PNG (${f.ancho}×${f.alto})`}
        </button>
        <button
          type="button"
          onClick={exportarTodos}
          disabled={exportando}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm disabled:opacity-30"
        >
          Descargar los 4 formatos (ZIP)
        </button>
        {errorExport && <p className="max-w-[460px] text-sm text-red-700">{errorExport}</p>}
        <TodosLosFormatos marca={marca} piezaEn={piezaEn} actual={actual.formato} onElegir={(formato, canal) => set({ formato, canal })} />
      </section>

      {/* Checklist */}
      <Checklist resultado={resultado} />
    </div>
  );
}

const BLOQUES: Bloque[] = ["Color y contraste", "Tipografía", "Composición", "Zonas seguras", "Contenido"];

function Checklist({ resultado }: { resultado: ResultadoChecklist | null }) {
  const estados = useMemo(
    () => ({
      ok: { texto: "Aprobada", clase: "bg-emerald-100 text-emerald-900" },
      rechazado: { texto: "Rechazada", clase: "bg-red-100 text-red-900" },
      revision_manual: { texto: "Revisión manual", clase: "bg-amber-100 text-amber-900" },
    }),
    [],
  );
  if (!resultado) return <section className="text-sm text-neutral-500">Calculando…</section>;
  const fallidos = resultado.controles.filter((c) => !c.ok).length;
  return (
    <section className="flex flex-col gap-4 text-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Control de calidad</h2>
        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${estados[resultado.estado].clase}`}>
          {estados[resultado.estado].texto}
        </span>
      </div>
      <p className="text-neutral-600">
        {resultado.estado === "ok"
          ? `Los ${resultado.controles.length} controles del manual pasan. La pieza se puede publicar.`
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
                <li key={c.control} className={`flex gap-2 ${c.ok ? "text-neutral-700" : "text-red-800"}`}>
                  <span className="w-4 shrink-0">{c.ok ? "✓" : "✗"}</span>
                  <span>
                    {c.control}
                    {c.detalle && <span className="text-neutral-500"> · {c.detalle}</span>}
                    {!c.ok && <span className="block text-xs text-red-700">Acción: {c.accion}</span>}
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

/** Miniaturas de la misma pieza en los cuatro formatos, cada una con su propio control de calidad. */
function TodosLosFormatos({
  marca,
  piezaEn,
  actual,
  onElegir,
}: {
  marca: Marca;
  piezaEn: (formato: Formato, canal: Canal) => TPieza;
  actual: Formato;
  onElegir: (formato: Formato, canal: Canal) => void;
}) {
  const [estados, setEstados] = useState<Partial<Record<Formato, ResultadoChecklist["estado"]>>>({});
  const ALTO = 150;
  return (
    <div className="mt-2 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Todos los formatos</h3>
      <div className="flex flex-wrap items-end gap-3">
        {TODOS.map(({ formato, canal }) => {
          const f = FORMATOS[formato];
          const escala = ALTO / f.alto;
          const estado = estados[formato];
          return (
            <button key={formato} type="button" onClick={() => onElegir(formato, canal)} className="flex flex-col items-start gap-1 text-left">
              <div
                className={`overflow-hidden rounded ${formato === actual ? "ring-2 ring-neutral-900" : "ring-1 ring-neutral-200"}`}
                style={{ width: f.ancho * escala, height: ALTO }}
              >
                <div style={{ transform: `scale(${escala})`, transformOrigin: "top left", pointerEvents: "none" }}>
                  <Pieza
                    marca={marca}
                    pieza={piezaEn(formato, canal)}
                    onResultado={(r) => setEstados((e) => (e[formato] === r.estado ? e : { ...e, [formato]: r.estado }))}
                  />
                </div>
              </div>
              <span className="text-xs">
                {formato}{" "}
                <span className={estado === "ok" ? "text-emerald-700" : estado ? "text-red-700" : "text-neutral-400"}>
                  {estado === "ok" ? "✓" : estado === "revision_manual" ? "revisión" : estado ? "✗" : "…"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
