"use client";

import {
  BIBLIOTECA_RUBRO,
  CONTACTO,
  ICONOS,
  PATRONES,
  rellenosDisponibles,
  TODOS_LOS_ICONOS,
  type RellenoDeco,
  type TipoContacto,
} from "@/engine/biblioteca";
import { decoracionesPara, trazadoDecoracion } from "@/engine/decoraciones";
import type { Marca } from "@/engine/diagnostico";
import { FORMATOS } from "@/engine/formatos";
import { hslCss } from "@/engine/color";
import { decoEfectiva, formasDeco, MAX_CONTACTO, maxItems, estiloIconos, modoDeco, type Deco, type Pieza } from "@/engine/pieza";
import { FOCO_CENTRO, PROTECCIONES, type Foco } from "@/engine/fotografia";
import { reducirFoto } from "@/lib/imagen";
import { FormaSvg, Icono, PatronSvg } from "./Graficos";

// Editores de los elementos gráficos de cada variante (fase 3b): capa decorativa (2B), contacto (3) y catálogo (4).

const NOMBRE_RELLENO: Record<RellenoDeco, string> = { foto: "Foto", patron: "Patrón", icono: "Ícono" };
const CAJA = "flex h-11 w-11 items-center justify-center rounded border";

/**
 * Capa decorativa 2B (v1.1), dos opciones:
 *   - Imagen o ícono: un círculo con una foto (con overlay de marca) o un ícono grande adentro.
 *   - Figura y patrón: una forma geométrica de la biblioteca rellena con un patrón.
 */
export function EditorDeco({ marca, pieza, onChange }: { marca: Marca; pieza: Pieza; onChange: (p: Partial<Pieza>) => void }) {
  const disponibles = rellenosDisponibles(marca.rubro, marca.identidad.fotos_habilitadas);
  const efectiva = decoEfectiva(marca, pieza);
  const lib = BIBLIOTECA_RUBRO[marca.rubro];
  const p = marca.identidad.paleta;
  const estilo = estiloIconos(marca);
  const set = (d: Partial<Deco>) => onChange({ deco: { ...efectiva, ...pieza.deco, ...d } });
  // El relleno pedido (puede ser foto aunque todavía no haya foto cargada).
  const pedido = pieza.deco?.relleno ?? efectiva.relleno;
  const modo = modoDeco(pedido);
  const imagenes = disponibles.filter((t) => t !== "patron");
  // En el 2B-L con imagen o ícono la forma es siempre el círculo; en el 2B-S se sigue eligiendo.
  const eligeForma = modo === "figura" || pieza.variante !== "2B-L";

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">Capa decorativa</span>
      <div className="flex overflow-hidden rounded-md border border-neutral-300">
        {([
          ["imagen", "Imagen o ícono"],
          ["figura", "Figura y patrón"],
        ] as const).map(([m, etiqueta]) => {
          const posible = m === "figura" ? disponibles.includes("patron") : imagenes.length > 0 || lib.rellenos.includes("foto");
          return (
            <button
              key={m}
              type="button"
              disabled={!posible}
              onClick={() => set({ relleno: m === "figura" ? "patron" : (imagenes[0] ?? "foto") })}
              className={`flex-1 py-1.5 text-xs ${modo === m ? "bg-neutral-900 text-white" : "bg-white"} disabled:opacity-40`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>
      {eligeForma && (
        <div className="flex flex-wrap gap-1">
          {formasDeco(marca.rubro, marca.identidad.recursos).map((id) => (
            <button key={id} type="button" title="Forma" onClick={() => set({ forma: id })} className={`${CAJA} overflow-hidden ${efectiva.forma === id ? "border-neutral-900" : "border-neutral-200"}`}>
              {/* Vista de la forma sangrada: solo la mitad visible, como en la pieza. */}
              <div style={{ width: 36, height: 36, transform: "translateX(18px)" }}>
                <FormaSvg id={id} formas={marca.identidad.recursos?.formas} color={p.tono_apoyo} style={{ width: "100%", height: "100%" }} />
              </div>
            </button>
          ))}
        </div>
      )}
      {modo === "imagen" && (
        <>
          {pieza.variante === "2B-L" && <p className="text-xs text-neutral-500">Círculo del 80% del ancho, desde el centro hacia la derecha.</p>}
          <div className="flex overflow-hidden rounded-md border border-neutral-300">
            {(["foto", "icono"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={t === "icono" ? !disponibles.includes("icono") : !lib.rellenos.includes("foto")}
                onClick={() => set({ relleno: t })}
                className={`flex-1 py-1.5 text-xs ${pedido === t ? "bg-neutral-900 text-white" : "bg-white"} disabled:opacity-40`}
              >
                {NOMBRE_RELLENO[t]}
              </button>
            ))}
          </div>
        </>
      )}
      {modo === "imagen" && !marca.identidad.fotos_habilitadas && (
        <p className="text-xs text-neutral-500">Foto: la marca no tiene fotos propias habilitadas (se activa en la ficha de marca).</p>
      )}

      {pedido === "patron" && (
        <div className="flex flex-wrap gap-1">
          {[
            ...(marca.identidad.recursos?.patron_propio && marca.identidad.recursos.formas.length ? [{ id: "propio" as const, nombre: "Patrón propio" }] : []),
            ...PATRONES.filter((pt) => lib.patrones.includes(pt.id)),
          ].map((pt) => (
            <button key={pt.id} type="button" title={pt.nombre} onClick={() => set({ patron: pt.id })} className={`${CAJA} relative overflow-hidden ${efectiva.patron === pt.id ? "border-neutral-900" : "border-neutral-200"}`}>
              <PatronSvg id={pt.id} color={p.color_marca} opacidad={0.6} celda={12} forma={marca.identidad.recursos?.formas[0]} />
            </button>
          ))}
        </div>
      )}
      {pedido === "icono" && (
        <div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto">
          {[...lib.iconosSugeridos.flatMap((cat) => ICONOS[cat]), ...TODOS_LOS_ICONOS.filter((n) => !lib.iconosSugeridos.some((cat) => ICONOS[cat].includes(n)))].map((n) => (
            <button key={n} type="button" title={n} onClick={() => set({ icono: n })} className={`${CAJA} ${efectiva.icono === n ? "border-neutral-900" : "border-neutral-200"}`}>
              <Icono nombre={n} estilo={estilo} color={p.color_marca} tamano={22} />
            </button>
          ))}
        </div>
      )}
      {pedido === "foto" && (
        <div className="flex flex-col gap-1 text-xs">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) set({ relleno: "foto", foto: await reducirFoto(file) });
            }}
          />
          {!pieza.deco?.foto && <span className="text-neutral-500">Sin foto cargada, la forma se rellena con {NOMBRE_RELLENO[efectiva.relleno].toLowerCase()}.</span>}
          {pieza.deco?.foto && <MiniaturaFoco src={pieza.deco.foto} foco={pieza.foto_foco} onChange={(foto_foco) => onChange({ foto_foco })} />}
        </div>
      )}
    </div>
  );
}

/**
 * Decoración de plantilla (v1.1): figuras propias del diseño, opcionales. "Automática" deja la forma de fondo de
 * siempre; elegir una decoración la reemplaza.
 */
export function EditorDecoracion({ marca, pieza, onChange }: { marca: Marca; pieza: Pieza; onChange: (p: Partial<Pieza>) => void }) {
  const opciones = decoracionesPara(pieza.variante);
  if (!opciones.length) return null;
  const f = FORMATOS["4:5"];
  const p = marca.identidad.paleta;
  const elegida = opciones.find((d) => d.id === pieza.decoracion)?.id ?? null;
  const miniatura = (id: string | null) => {
    const d = opciones.find((o) => o.id === id);
    const t = d ? trazadoDecoracion(d.geometria("4:5"), f.ancho, f.alto) : null;
    return (
      <svg viewBox={`0 0 ${f.ancho} ${f.alto}`} className="h-12 w-[38px] rounded-sm" style={{ background: hslCss(p.color_marca) }}>
        {t ? (
          <path d={t.d} fill={hslCss(p.tono_apoyo)} />
        ) : (
          <circle cx={f.ancho * 0.9} cy={f.alto * 0.95} r={f.ancho * 0.36} fill={hslCss(p.fondo_neutro)} opacity={0.2} />
        )}
      </svg>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">Decoración</span>
      <div className="flex flex-wrap gap-2">
        {[{ id: null, nombre: "Automática", descripcion: "Forma de fondo automática." }, ...opciones].map((o) => (
          <button
            key={o.id ?? "auto"}
            type="button"
            title={o.descripcion}
            onClick={() => onChange({ decoracion: o.id })}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${elegida === o.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white"}`}
          >
            {miniatura(o.id)}
            {o.nombre}
          </button>
        ))}
      </div>
      {elegida && (marca.identidad.paleta_extendida?.secundarios.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span>Color</span>
          {[null, ...marca.identidad.paleta_extendida!.secundarios.map((_, i) => i)].map((i) => {
            const color = i == null ? p.tono_apoyo : marca.identidad.paleta_extendida!.secundarios[i].color;
            const activo = (pieza.color_decoracion ?? null) === i;
            return (
              <button
                key={i ?? "apoyo"}
                type="button"
                title={i == null ? "Tono de apoyo" : `Secundario ${i + 1}`}
                onClick={() => onChange({ color_decoracion: i })}
                className={`h-6 w-6 rounded-full border-2 ${activo ? "border-neutral-900" : "border-white shadow"}`}
                style={{ background: hslCss(color) }}
              />
            );
          })}
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
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!pieza.soporte_iconos} onChange={(e) => onChange({ soporte_iconos: e.target.checked })} />
        Íconos sobre un soporte (cuadrado redondeado)
      </label>
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
            {marca.identidad.fotos_habilitadas &&
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

/**
 * Miniatura de una foto con su punto focal (E6): un clic sobre la foto fija el foco y el encuadre de la pieza lo deja
 * cerca del centro de su caja.
 */
export function MiniaturaFoco({ src, foco, onChange }: { src: string; foco?: Foco; onChange: (f: Foco | undefined) => void }) {
  const f = foco ?? FOCO_CENTRO;
  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative inline-block max-w-full cursor-crosshair self-start"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onChange({ x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-slot="miniatura-foco" src={src} alt="Foto cargada" className="block max-h-44 max-w-full rounded border border-neutral-300" draggable={false} />
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.7)]"
          style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
        />
      </div>
      <span className="text-neutral-500">
        Hacé clic en lo que tiene que quedar a la vista: ese es el punto focal del encuadre.
        {foco && (
          <>
            {" "}
            <button type="button" onClick={() => onChange(undefined)} className="underline">Centrar</button>
          </>
        )}
      </span>
    </div>
  );
}

/**
 * Variante F, texto sobre foto (E6): la foto de fondo con su punto focal, la protección de contraste y de qué lado va
 * el bloque de texto. El checklist mide el contraste sobre la imagen real.
 */
export function EditorFotoFondo({ pieza, onChange }: { pieza: Pieza; onChange: (p: Partial<Pieza>) => void }) {
  const proteccion = pieza.proteccion ?? "degradado";
  const lado = pieza.foto_texto ?? "abajo";
  const horizontal = FORMATOS[pieza.formato].columnaMensaje != null;
  return (
    <div className="flex flex-col gap-2 text-xs">
      <span className="text-sm font-medium">Foto de fondo</span>
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ foto_fondo: await reducirFoto(file), foto_foco: undefined });
        }}
      />
      {pieza.foto_fondo ? (
        <>
          <MiniaturaFoco src={pieza.foto_fondo} foco={pieza.foto_foco} onChange={(foto_foco) => onChange({ foto_foco })} />
          <button type="button" onClick={() => onChange({ foto_fondo: null, foto_foco: undefined })} className="self-start underline">Quitar foto</button>
        </>
      ) : (
        <span className="text-neutral-500">Sin foto cargada, la pieza usa el fondo del modo.</span>
      )}
      <span className="text-sm font-medium">Protección del texto</span>
      <div className="flex overflow-hidden rounded-md border border-neutral-300">
        {PROTECCIONES.map((pr) => (
          <button
            key={pr.id}
            type="button"
            title={pr.descripcion}
            onClick={() => onChange({ proteccion: pr.id })}
            className={`flex-1 py-1.5 ${proteccion === pr.id ? "bg-neutral-900 text-white" : "bg-white"}`}
          >
            {pr.nombre}
          </button>
        ))}
      </div>
      <p className="text-neutral-500">{PROTECCIONES.find((x) => x.id === proteccion)!.descripcion}</p>
      {!horizontal && (
        <div className="flex overflow-hidden rounded-md border border-neutral-300">
          {(["arriba", "abajo"] as const).map((l) => (
            <button key={l} type="button" onClick={() => onChange({ foto_texto: l })} className={`flex-1 py-1.5 ${lado === l ? "bg-neutral-900 text-white" : "bg-white"}`}>
              Texto {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
