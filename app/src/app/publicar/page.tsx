"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Guias } from "@/components/Guias";
import { Pieza } from "@/components/Pieza";
import { PiezaEscalada } from "@/components/PiezaEscalada";
import { textosPara } from "@/components/PiezaMuestra";
import type { Medicion, ResultadoChecklist } from "@/engine/checklist";
import { Checklist } from "@/components/Checklist";
import { PublicarCarrusel } from "@/components/PublicarCarrusel";
import { descargar, renderizar, slug } from "@/lib/exportar";
import { armarPieza, ORDEN_TIPOS, textoSugerido, TIPOS_CONTENIDO, type CamposContenido, type TipoContenido } from "@/engine/contenidos";
import { registrarEnHistorial, type Marca } from "@/engine/diagnostico";
import { marcaParaPublicar, versionAprobada } from "@/engine/versiones";
import { CANALES, FORMATOS, type Canal, type Formato } from "@/engine/formatos";
import {
  aceptarControl,
  admiteCta,
  alineacionesPermitidas,
  formatoDeCanal,
  piezaNueva,
  piezasDeGrilla,
  PLANTILLAS,
  quitarAceptacion,
  secuenciaModo,
  varianteSugerida,
  variantesDisponibles,
  type Pieza as TPieza,
} from "@/engine/pieza";
import { PRESETS, type Variante } from "@/engine/presets";
import { pesoH1 } from "@/engine/typography";
import { elegirMarcaActiva, guardarMarca, useMarcaActiva, useMarcas } from "@/lib/marcas";
import { useSesion } from "@/lib/sesion";
import { EditorCatalogo, EditorContacto, EditorDeco, EditorDecoracion, EditorFotoFondo } from "@/components/EditoresPieza";
import { zipSync } from "fflate";

const VISTA_MAX = { ancho: 460, alto: 640 };

/** Un formato por canal para la exportación en lote: 9:16 sirve para stories y estados. */
const TODOS: { formato: Formato; canal: Canal }[] = [
  { formato: "4:5", canal: "feed_ig" },
  { formato: "1:1", canal: "feed_ig" },
  { formato: "9:16", canal: "stories_ig" },
  { formato: "1200x630", canal: "link" },
];

function nombreArchivo(marca: Marca, p: TPieza): string {
  return `${slug(marca.nombre)}-${p.canal}-${p.formato.replace(":", "x")}-v${p.variante}-${p.modo}.png`;
}

function piezaInicial(marca: Marca): TPieza {
  const t = textosPara(marca.rubro, marca.diagnostico.contenido);
  return { ...piezaNueva(marca), contenido: { h1: t.h1, body: t.body, cta: t.cta } };
}

export default function PublicarPage() {
  const marcas = useMarcas();
  // La marca activa es compartida con Marca e Identidad: la última abierta o elegida. Todo lo visual sale de
  // `marca.identidad` (E1).
  const marcaId = useMarcaActiva();
  const guardada = marcas.find((m) => m.id === marcaId) ?? marcas[0] ?? null;
  // Publicaciones usa la versión aprobada de la identidad, si hay una (E13). Memorizada: una referencia nueva en cada
  // render recrearía la pieza inicial sin fin.
  const marca = useMemo(() => (guardada ? marcaParaPublicar(guardada) : null), [guardada]);
  const [pieza, setPieza] = useState<TPieza | null>(null);
  // La pieza por defecto se crea una sola vez por marca: si se recreara en cada render cambiaría su id y la vista
  // previa se recalcularía sin fin.
  const inicial = useMemo(() => (marca ? piezaInicial(marca) : null), [marca]);
  const actual = pieza && marca && pieza.marca_id === marca.id ? pieza : inicial;
  const [resultado, setResultado] = useState<ResultadoChecklist | null>(null);
  const [medicion, setMedicion] = useState<Medicion | null>(null);
  const [guias, setGuias] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"simple" | "carrusel">("simple");
  // Tipo de contenido (E7): null es el modo libre de siempre. Los campos son los del tipo elegido.
  const [contenidoTipo, setContenidoTipo] = useState<TipoContenido | null>(null);
  const [campos, setCampos] = useState<CamposContenido>({});
  const [vista, setVista] = useState<"pieza" | "grilla">("pieza");
  const sesion = useSesion();

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
  const plantillaTipo = contenidoTipo ? TIPOS_CONTENIDO[contenidoTipo] : null;
  const escala = Math.min(VISTA_MAX.ancho / f.ancho, VISTA_MAX.alto / f.alto);

  /** Elegir un tipo arma la pieza con su variante, su formato y los textos sugeridos; después todo sigue editable. */
  function elegirTipo(t: TipoContenido | null) {
    setContenidoTipo(t);
    setResultado(null);
    if (!t) return;
    const sugeridos = textoSugerido(t, marca!);
    setCampos(sugeridos);
    const armada = armarPieza(t, sugeridos, marca!);
    setPieza({ ...armada, modo: actual!.modo });
    setErrorExport(null);
  }

  /** Editar un campo del tipo reescribe solo el contenido de la pieza: la variante y el resto quedan como están. */
  function editarCampo(id: string, valor: string) {
    const nuevos = { ...campos, [id]: valor };
    setCampos(nuevos);
    const armada = armarPieza(contenidoTipo!, nuevos, marca!);
    // Si lo que se edita es el CTA del tipo (promoción y evento, cap. 7b), vale lo que dice el campo, también vacío.
    const ctaArmado = id === "cta" ? armada.contenido.cta : armada.contenido.cta ?? actual!.contenido.cta;
    const conCta = { ...armada.contenido, cta: admiteCta(actual!.variante) ? ctaArmado : null };
    set({ contenido: conCta, contacto: armada.contacto ?? actual!.contacto, items: armada.items ?? actual!.items });
  }

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

  const barra = (
    <div className="flex flex-wrap items-end gap-4">
      <div className="mr-auto flex flex-col">
        <h1 className="text-2xl font-semibold">Nueva publicación</h1>
        <span className="text-xs text-neutral-500">
          {guardada && versionAprobada(guardada) ? `Usa la versión aprobada "${versionAprobada(guardada)!.nombre}" de ${marca.nombre}` : `Usa la identidad confirmada de ${marca.nombre}`} ·{" "}
          <Link href={`/identidad/${marca.id}`} className="underline">ajustar la identidad</Link>
        </span>
      </div>
      <div className="flex overflow-hidden rounded-md border border-neutral-300 text-sm">
        {([
          ["simple", "Publicación simple"],
          ["carrusel", "Carrusel 4:5"],
        ] as const).map(([t, etiqueta]) => (
          <button key={t} type="button" onClick={() => setTipo(t)} className={`px-4 py-2 ${tipo === t ? "bg-neutral-900 text-white" : "bg-white"}`}>
            {etiqueta}
          </button>
        ))}
      </div>
    </div>
  );

  if (tipo === "carrusel") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        {barra}
        <label className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-medium">Marca</span>
          <select value={marca.id} onChange={(e) => elegirMarcaActiva(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2">
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <PublicarCarrusel key={marca.id} marca={marca} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
    {barra}
    <div className="grid w-full gap-8 lg:grid-cols-[20rem_auto_1fr]">
      {/* Formulario */}
      <section className="flex flex-col gap-5 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Marca</span>
          <select
            value={marca.id}
            onChange={(e) => {
              elegirMarcaActiva(e.target.value);
              setPieza(null);
              setContenidoTipo(null);
              setResultado(null);
            }}
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-2">
          <span className="font-medium">¿Qué querés publicar?</span>
          <div className="grid grid-cols-2 gap-2">
            {ORDEN_TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                title={TIPOS_CONTENIDO[t].descripcion}
                onClick={() => elegirTipo(t)}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${contenidoTipo === t ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
              >
                <span className="font-medium">{TIPOS_CONTENIDO[t].nombre}</span>
              </button>
            ))}
            <button type="button" onClick={() => elegirTipo(null)} className={`rounded-lg border px-3 py-2 text-left text-xs ${contenidoTipo === null ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}>
              <span className="font-medium">Sin tipo</span>
            </button>
          </div>
          {plantillaTipo && (
            <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-600">{plantillaTipo.descripcion}</p>
              {plantillaTipo.campos.map((c) => (
                <label key={c.id} className="flex flex-col gap-1">
                  <span className="text-xs font-medium">{c.etiqueta}</span>
                  {c.multilinea ? (
                    <textarea rows={2} maxLength={c.max} placeholder={c.ejemplo} value={campos[c.id] ?? ""} onChange={(e) => editarCampo(c.id, e.target.value)} className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
                  ) : (
                    <input maxLength={c.max} placeholder={c.ejemplo} value={campos[c.id] ?? ""} onChange={(e) => editarCampo(c.id, e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2" />
                  )}
                  <span className="text-right text-[11px] text-neutral-500">{(campos[c.id] ?? "").length}/{c.max}</span>
                </label>
              ))}
              {plantillaTipo.carrusel && (
                <button type="button" onClick={() => setTipo("carrusel")} className="self-start text-xs underline underline-offset-2">
                  Contarlo en varios slides: ir al carrusel
                </button>
              )}
              <p className="text-xs text-neutral-500">Todo sigue editable más abajo: variante, formato y textos.</p>
            </div>
          )}
        </div>
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
          <div className="grid grid-cols-2 gap-2">
            {variantesDisponibles(marca).map((v: Variante) => (
              <button
                key={v}
                type="button"
                title={PLANTILLAS[v]!.descripcion}
                onClick={() => set({ variante: v, alineacion: alineacionesPermitidas(marca.rubro, v).includes(actual.alineacion) ? actual.alineacion : "izquierda" })}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${actual.variante === v ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
              >
                <span className="font-medium">{PLANTILLAS[v]!.nombre}</span>
                {varianteSugerida(marca.rubro) === v && <span className="ml-1 opacity-70">· sugerida</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">{plantilla.descripcion}</p>
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
            {actual.contenido.h1.trim().length} caracteres → peso {pesoH1(actual.contenido.h1, marca.identidad.tipografia.familia_variable)}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Dato de apoyo</span>
          <textarea rows={3} value={actual.contenido.body ?? ""} onChange={(e) => setContenido({ body: e.target.value || null })} className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
        </label>
        {marca.identidad.tipografia.italic_habilitado && (
          <label className="-mt-3 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={actual.body_italica} onChange={(e) => set({ body_italica: e.target.checked })} />
            Dato de apoyo en itálica (tono, no jerarquía)
          </label>
        )}
        {plantilla.politicaCta !== "no" && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Llamado a la acción</span>
            <input value={actual.contenido.cta ?? ""} onChange={(e) => setContenido({ cta: e.target.value || null })} className="rounded-md border border-neutral-300 px-3 py-2" />
          </label>
        )}
        {actual.variante === "F" && <EditorFotoFondo pieza={actual} onChange={set} />}
        {plantilla.deco && <EditorDeco marca={marca} pieza={actual} onChange={set} />}
        {actual.variante !== "F" && <EditorDecoracion marca={marca} pieza={actual} onChange={set} />}
        {plantilla.bloque === "contacto" && <EditorContacto pieza={actual} onChange={set} />}
        {plantilla.bloque === "catalogo" && <EditorCatalogo marca={marca} pieza={actual} onChange={set} />}
      </section>

      {/* Vista previa */}
      <section className="flex flex-col gap-3">
        <div className="flex self-start overflow-hidden rounded-md border border-neutral-300 text-sm">
          {([["pieza", "Pieza"], ["grilla", "Grilla del feed"]] as const).map(([v, etiqueta]) => (
            <button key={v} type="button" onClick={() => setVista(v)} className={`px-4 py-1.5 ${vista === v ? "bg-neutral-900 text-white" : "bg-white"}`}>
              {etiqueta}
            </button>
          ))}
        </div>
        {vista === "grilla" && (
          <div className="flex flex-col gap-2">
            <div className="grid w-fit grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-md">
              {[{ ...actual, canal: "feed_ig" as Canal, formato: "4:5" as Formato }, ...piezasDeGrilla(marca, actual.contenido, 9).slice(1)].map((pz, i) => (
                <div key={pz.id} className={i === 0 ? "outline outline-2 outline-offset-[-2px] outline-neutral-900" : ""}>
                  <PiezaEscalada marca={marca} pieza={pz} ancho={150} />
                </div>
              ))}
            </div>
            <p className="max-w-[460px] text-xs text-neutral-500">La pieza actual (marcada) en la primera celda y las 8 siguientes con el ritmo de variantes y modos de la marca.</p>
          </div>
        )}
        <div className={vista === "grilla" ? "h-0 overflow-hidden" : "flex flex-col gap-3"}>
        <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
          <span>
            {f.nombre} · {PRESETS[marca.rubro].nombre} · {marca.identidad.tipografia.familia_variable}
          </span>
          <label className="flex shrink-0 items-center gap-1.5 text-neutral-700">
            <input type="checkbox" checked={guias} onChange={(e) => setGuias(e.target.checked)} />
            Guías
          </label>
        </div>
        <div className="relative overflow-hidden rounded-md shadow-md" style={{ width: f.ancho * escala, height: f.alto * escala }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
            <Pieza
              marca={marca}
              pieza={actual}
              onResultado={(r, m) => {
                setResultado(r);
                setMedicion(m);
              }}
            />
            {guias && <Guias formato={actual.formato} medicion={medicion} escala={escala} />}
          </div>
        </div>
        {guias && <LeyendaGuias />}
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
        <button type="button" onClick={() => setHoja(!hoja)} className="self-start text-xs underline underline-offset-2">
          {hoja ? "Cerrar la hoja de contactos" : "Ver hoja de contactos (los 4 formatos grandes, con guías)"}
        </button>
        </div>
      </section>

      {/* Checklist */}
      <Checklist
        resultado={resultado}
        onAceptar={(control, motivo) => {
          // Un aviso aceptado queda en la pieza (el render lo vuelve a evaluar) y en el historial de la marca (E9).
          const autor = sesion.estado === "conectado" ? sesion.email : "estudio (modo local)";
          const aceptada = aceptarControl(actual, control, motivo, autor);
          const a = aceptada.aceptaciones!.at(-1)!;
          set({ aceptaciones: aceptada.aceptaciones });
          void guardarMarca(
            registrarEnHistorial(guardada!, {
              tipo: "aceptacion",
              ...a,
              pieza: `${CANALES[actual.canal].nombre} · ${actual.formato} · variante ${actual.variante} · modo ${actual.modo}`,
            }),
          );
        }}
        onQuitar={(control) => set({ aceptaciones: quitarAceptacion(actual, control).aceptaciones })}
      />

      {hoja && (
        <HojaContactos
          marca={marca}
          piezaEn={piezaEn}
          onElegir={(formato, canal) => {
            set({ formato, canal });
            setHoja(false);
          }}
        />
      )}
    </div>
    </div>
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

function LeyendaGuias() {
  const item = (estilo: React.CSSProperties, texto: string) => (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-4" style={estilo} />
      {texto}
    </span>
  );
  return (
    <div className="flex max-w-[460px] flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
      {item({ border: "1.5px dashed #0891b2" }, "margen de diseño")}
      {item({ border: "1.5px dotted #0891b2" }, "margen mínimo")}
      {item({ border: "1.5px solid #c026d3" }, "cajas medidas")}
      {item({ border: "1.5px dashed #64748b" }, "capa decorativa")}
      {item({ background: "#dc262666", outline: "1.5px solid #dc2626" }, "elementos que se pisan")}
      {item({ background: "repeating-linear-gradient(45deg, #f59e0b88 0 3px, transparent 3px 7px)" }, "tapado por la plataforma")}
    </div>
  );
}

/** Dónde cae el logo en la pieza: sirve para ver si la serie mantiene su ancla en todos los formatos. */
function anclaLogo(m: Medicion, formato: Formato): string | null {
  if (!m.logo) return null;
  const f = FORMATOS[formato];
  const cx = (m.logo.x + m.logo.w / 2) / f.ancho;
  const cy = (m.logo.y + m.logo.h / 2) / f.alto;
  const v = cy < 1 / 3 ? "arriba" : cy > 2 / 3 ? "abajo" : "al medio";
  const h = cx < 1 / 3 ? "a la izquierda" : cx > 2 / 3 ? "a la derecha" : "centrado";
  return `${v} ${h}`;
}

/**
 * Hoja de contactos: la misma pieza en los cuatro formatos, grandes y con guías, para revisar la serie como un todo
 * antes de exportar (que el logo mantenga su lugar, que la escala del H1 sea pareja, que nada se pise).
 */
function HojaContactos({
  marca,
  piezaEn,
  onElegir,
}: {
  marca: Marca;
  piezaEn: (formato: Formato, canal: Canal) => TPieza;
  onElegir: (formato: Formato, canal: Canal) => void;
}) {
  const [datos, setDatos] = useState<Partial<Record<Formato, { r: ResultadoChecklist; m: Medicion }>>>({});
  const [conGuias, setConGuias] = useState(true);
  const ALTO = 380;
  const anclas = TODOS.map(({ formato }) => (datos[formato] ? anclaLogo(datos[formato]!.m, formato) : null));
  const completa = TODOS.every(({ formato }) => datos[formato]);
  const distintas = new Set(anclas.filter(Boolean)).size;
  return (
    <section className="flex flex-col gap-4 border-t border-neutral-200 pt-6 lg:col-span-3">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold">Hoja de contactos</h2>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={conGuias} onChange={(e) => setConGuias(e.target.checked)} />
          Guías
        </label>
        {completa && (
          <span className={`text-xs ${distintas > 1 ? "text-amber-800" : "text-neutral-600"}`}>
            {distintas > 1
              ? "⚠ El logo cambia de lugar entre formatos: revisá que la serie se siga reconociendo como una sola campaña."
              : "El logo mantiene su lugar en los cuatro formatos."}
          </span>
        )}
      </div>
      {conGuias && <LeyendaGuias />}
      <div className="flex flex-wrap items-start gap-6">
        {TODOS.map(({ formato, canal }, i) => {
          const f = FORMATOS[formato];
          const escala = ALTO / f.alto;
          const d = datos[formato];
          const pendientes = d ? d.r.controles.filter((c) => c.aviso || (!c.ok && !c.aceptado)) : [];
          return (
            <div key={formato} className="flex flex-col gap-2" style={{ width: f.ancho * escala }}>
              <button
                type="button"
                onClick={() => onElegir(formato, canal)}
                title="Editar este formato"
                className="relative overflow-hidden rounded text-left shadow-md"
                style={{ width: f.ancho * escala, height: ALTO }}
              >
                <div style={{ transform: `scale(${escala})`, transformOrigin: "top left", pointerEvents: "none" }}>
                  <Pieza marca={marca} pieza={piezaEn(formato, canal)} onResultado={(r, m) => setDatos((prev) => ({ ...prev, [formato]: { r, m } }))} />
                  {conGuias && <Guias formato={formato} medicion={d?.m ?? null} escala={escala} />}
                </div>
              </button>
              <div className="text-xs">
                <div className="flex gap-2">
                  <span className="font-medium">{f.nombre}</span>
                  <span className={d?.r.estado === "ok" ? "text-emerald-700" : d ? "text-red-700" : "text-neutral-400"}>
                    {d ? (d.r.estado === "ok" ? "✓" : d.r.estado === "revision_manual" ? "revisión" : "✗") : "…"}
                  </span>
                </div>
                {d && (
                  <div className="text-neutral-500">
                    H1 {d.m.h1.px} px · {d.m.h1.lineas.length} {d.m.h1.lineas.length === 1 ? "línea" : "líneas"}
                    {anclas[i] ? ` · logo ${anclas[i]}` : ""}
                  </div>
                )}
                <ul className="mt-1 flex flex-col gap-0.5">
                  {pendientes.map((c) => (
                    <li key={c.control} className={c.aviso ? "text-amber-800" : "text-red-800"}>
                      {c.aviso ? "⚠" : "✗"} {c.control}
                      {c.detalle && <span className="text-neutral-500"> · {c.detalle}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
