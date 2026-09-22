"use client";

import {
  BIBLIOTECA_RUBRO,
  CONTACTO,
  decosDisponibles,
  formasDelRubro,
  ICONOS,
  PATRONES,
  TODOS_LOS_ICONOS,
  type TipoContacto,
  type TipoDeco,
} from "@/engine/biblioteca";
import type { Marca } from "@/engine/diagnostico";
import { decoEfectiva, decoPorDefecto, MAX_CONTACTO, maxItems, estiloIconos, type Pieza } from "@/engine/pieza";
import { reducirFoto } from "@/lib/imagen";
import { FormaSvg, Icono, PatronSvg } from "./Graficos";

// Editores de los elementos gráficos de cada variante (fase 3b): capa decorativa (2B), contacto (3) y catálogo (4).

const NOMBRE_DECO: Record<TipoDeco, string> = { icono: "Ícono", forma: "Forma", patron: "Patrón", foto: "Foto" };
const CAJA = "flex h-11 w-11 items-center justify-center rounded border";

export function EditorDeco({ marca, pieza, onChange }: { marca: Marca; pieza: Pieza; onChange: (p: Partial<Pieza>) => void }) {
  const disponibles = decosDisponibles(marca.rubro, marca.fotos_habilitadas);
  const efectiva = decoEfectiva(marca, pieza);
  const elegido = pieza.deco?.tipo ?? efectiva.tipo;
  const lib = BIBLIOTECA_RUBRO[marca.rubro];
  const p = marca.paleta;
  const estilo = estiloIconos(marca);
  const set = (id: string, extra: Partial<NonNullable<Pieza["deco"]>> = {}) =>
    onChange({ deco: { tipo: elegido, id, foto: pieza.deco?.foto ?? null, ...extra } });

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">Capa decorativa</span>
      <div className="flex overflow-hidden rounded-md border border-neutral-300">
        {disponibles.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ deco: pieza.deco?.tipo === t ? pieza.deco : decoPorDefecto(marca.rubro, t) })}
            className={`flex-1 py-1.5 text-xs ${elegido === t ? "bg-neutral-900 text-white" : "bg-white"}`}
          >
            {NOMBRE_DECO[t]}
          </button>
        ))}
      </div>
      {!marca.fotos_habilitadas && (
        <p className="text-xs text-neutral-500">Foto: la marca no tiene fotos propias habilitadas (se activa en la ficha de marca).</p>
      )}

      {elegido === "icono" && (
        <div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto">
          {[...lib.iconosSugeridos.flatMap((cat) => ICONOS[cat]), ...TODOS_LOS_ICONOS.filter((n) => !lib.iconosSugeridos.some((cat) => ICONOS[cat].includes(n)))].map((n) => (
            <button key={n} type="button" title={n} onClick={() => set(n)} className={`${CAJA} ${efectiva.id === n ? "border-neutral-900" : "border-neutral-200"}`}>
              <Icono nombre={n} estilo={estilo} color={p.color_marca} tamano={22} />
            </button>
          ))}
        </div>
      )}
      {elegido === "forma" && (
        <div className="flex flex-wrap gap-1">
          {formasDelRubro(marca.rubro).map((f) => (
            <button key={f.id} type="button" title={f.nombre} onClick={() => set(f.id)} className={`${CAJA} p-1.5 ${efectiva.id === f.id ? "border-neutral-900" : "border-neutral-200"}`}>
              <FormaSvg id={f.id} color={p.tono_apoyo} grosor={8} style={{ width: "100%", height: "100%" }} />
            </button>
          ))}
        </div>
      )}
      {elegido === "patron" && (
        <div className="flex flex-wrap gap-1">
          {PATRONES.filter((pt) => lib.patrones.includes(pt.id)).map((pt) => (
            <button key={pt.id} type="button" title={pt.nombre} onClick={() => set(pt.id)} className={`${CAJA} relative overflow-hidden ${efectiva.id === pt.id ? "border-neutral-900" : "border-neutral-200"}`}>
              <PatronSvg id={pt.id} color={p.color_marca} opacidad={0.6} celda={12} />
            </button>
          ))}
        </div>
      )}
      {elegido === "foto" && (
        <div className="flex flex-col gap-2 text-xs">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) set(pieza.deco?.tipo === "foto" ? pieza.deco.id : lib.contenedores[0], { tipo: "foto", foto: await reducirFoto(file) });
            }}
          />
          <div className="flex gap-1">
            {lib.contenedores.map((id) => (
              <button key={id} type="button" title="Forma de contención" onClick={() => set(id, { tipo: "foto" })} className={`${CAJA} p-1.5 ${pieza.deco?.id === id ? "border-neutral-900" : "border-neutral-200"}`}>
                <FormaSvg id={id} color={p.tono_apoyo} style={{ width: "100%", height: "100%" }} />
              </button>
            ))}
          </div>
          {!pieza.deco?.foto && <span className="text-neutral-500">Sin foto cargada se usa la siguiente opción del rubro.</span>}
        </div>
      )}
    </div>
  );
}

export function EditorContacto({ pieza, onChange }: { pieza: Pieza; onChange: (p: Partial<Pieza>) => void }) {
  const lista = pieza.contacto ?? [];
  const set = (i: number, d: Partial<{ tipo: TipoContacto; valor: string }>) =>
    onChange({ contacto: lista.map((x, j) => (j === i ? { ...x, ...d } : x)) });
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">Datos de contacto (hasta {MAX_CONTACTO})</span>
      {lista.map((d, i) => (
        <div key={i} className="flex gap-2">
          <select value={d.tipo} onChange={(e) => set(i, { tipo: e.target.value as TipoContacto })} className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
            {(Object.keys(CONTACTO) as TipoContacto[]).map((t) => <option key={t} value={t}>{CONTACTO[t].nombre}</option>)}
          </select>
          <input value={d.valor} onChange={(e) => set(i, { valor: e.target.value })} className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5" />
          <button type="button" onClick={() => onChange({ contacto: lista.filter((_, j) => j !== i) })} className="px-1 text-neutral-400" title="Quitar">✕</button>
        </div>
      ))}
      {lista.length < MAX_CONTACTO && (
        <button type="button" onClick={() => onChange({ contacto: [...lista, { tipo: "telefono", valor: "" }] })} className="self-start text-xs underline">
          + Agregar dato
        </button>
      )}
    </div>
  );
}

export function EditorCatalogo({ marca, pieza, onChange }: { marca: Marca; pieza: Pieza; onChange: (p: Partial<Pieza>) => void }) {
  const lista = pieza.items ?? [];
  const max = maxItems(pieza.formato);
  const lib = BIBLIOTECA_RUBRO[marca.rubro];
  const iconos = [...lib.iconosSugeridos.flatMap((c) => ICONOS[c]), ...TODOS_LOS_ICONOS.filter((n) => !lib.iconosSugeridos.some((c) => ICONOS[c].includes(n)))];
  const set = (i: number, d: Partial<(typeof lista)[number]>) => onChange({ items: lista.map((x, j) => (j === i ? { ...x, ...d } : x)) });
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">Ítems del catálogo (2 a {max} en {pieza.formato})</span>
      {lista.map((it, i) => (
        <div key={i} className={`flex flex-col gap-1.5 rounded-md border p-2 ${i >= max ? "border-amber-300 bg-amber-50" : "border-neutral-200"}`}>
          <div className="flex gap-2">
            <input value={it.texto} onChange={(e) => set(i, { texto: e.target.value })} placeholder="Texto corto" className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5" />
            <button type="button" onClick={() => onChange({ items: lista.filter((_, j) => j !== i) })} className="px-1 text-neutral-400" title="Quitar">✕</button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <select value={it.icono ?? ""} onChange={(e) => set(i, { icono: e.target.value || null })} disabled={!!it.foto} className="rounded-md border border-neutral-300 px-2 py-1">
              <option value="">Sin ícono</option>
              {iconos.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {marca.fotos_habilitadas &&
              (it.foto ? (
                <button type="button" onClick={() => set(i, { foto: null })} className="underline">Quitar foto</button>
              ) : (
                <label className="cursor-pointer underline">
                  Usar foto
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set(i, { foto: await reducirFoto(f, 800) }); }} />
                </label>
              ))}
          </div>
          {i >= max && <span className="text-xs text-amber-800">No entra en {pieza.formato}: se omite.</span>}
        </div>
      ))}
      {lista.length < 4 && (
        <button type="button" onClick={() => onChange({ items: [...lista, { texto: "", icono: iconos[lista.length] ?? null, foto: null }] })} className="self-start text-xs underline">
          + Agregar ítem
        </button>
      )}
    </div>
  );
}
