"use client";

import { useMemo, useState } from "react";
import { contraste, hexToHsl, hslCss, hslToHex, type HSL } from "@/engine/color";
import {
  colorTextoAcento,
  coloresModo,
  controlesCtaModoB,
  ctaModoB,
  ctaModoBAuto,
  ctaModoBElegidoInvalido,
  colorPorContraste,
  colorValidoCercano,
  cumple,
  fallasPaleta,
  MIN_GRAFICO,
  MIN_TEXTO,
  relacionAcento,
  type CtaModoB,
  type Paleta,
  type RolPaleta,
} from "@/engine/palette";
import {
  ajustarColorMarca,
  elegirCtaModoB,
  elegirVersionFuncional,
  pendientesMarca,
  puedeElegirFuncional,
  restaurarColorMarca,
  type Marca,
} from "@/engine/diagnostico";
import { PRESETS } from "@/engine/presets";
import { escala, familiaTexto, pesoH1, PESOS } from "@/engine/typography";
import { ParTipografico } from "./ParTipografico";
import { RasgosPropios } from "./RasgosPropios";
import { fontFamily } from "@/lib/fuentes";
import { PiezaMuestra, textosPara, type TextosPieza } from "./PiezaMuestra";
import { CampoHex } from "./CampoHex";
import { FormaSvg, Icono, PatronSvg } from "./Graficos";
import { BIBLIOTECA_RUBRO, formasDelRubro, ICONOS, OPACIDAD_PATRON, PATRONES } from "@/engine/biblioteca";
import { estiloIconos } from "@/engine/pieza";
import { MATRICES_DALTONISMO, type Daltonismo } from "@/engine/laboratorio";
import { LaboratorioColor } from "./LaboratorioColor";

/** Filtros SVG para ver la identidad como la ve una persona con daltonismo (E3). Mismas matrices que el motor. */
function FiltrosDaltonismo() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      {(Object.keys(MATRICES_DALTONISMO) as Daltonismo[]).map((t) => {
        const m = MATRICES_DALTONISMO[t];
        const valores = [0, 1, 2].map((f) => `${m[f * 3]} ${m[f * 3 + 1]} ${m[f * 3 + 2]} 0 0`).join(" ") + " 0 0 0 1 0";
        return (
          <filter key={t} id={`daltonismo-${t}`} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={valores} />
          </filter>
        );
      })}
    </svg>
  );
}

function Ratio({ valor, minimo }: { valor: number; minimo: number }) {
  const ok = valor >= minimo;
  return (
    <span className={`font-mono text-xs ${ok ? "text-emerald-700" : "text-red-700"}`}>
      {valor.toFixed(1)}:1 {ok ? "✓" : `✗ (mín. ${minimo})`}
    </span>
  );
}

function Muestra({
  nombre,
  color,
  nota,
  editar,
  ajustado,
  onRestaurar,
  rol,
  paleta,
  sugerir,
  children,
}: {
  nombre: string;
  color: HSL;
  nota: string;
  /** Si está, el color se puede modificar por HEX. */
  editar?: (color: HSL) => void;
  ajustado?: boolean;
  onRestaurar?: () => void;
  rol?: RolPaleta;
  paleta?: Paleta;
  /** Mostrar qué controles no cumple y el color válido más próximo. */
  sugerir?: boolean;
  children?: React.ReactNode;
}) {
  const hex = hslToHex(color);
  return (
    <div className="flex flex-col gap-2">
      <div className="h-20 rounded-md border border-black/10" style={{ background: hslCss(color) }} />
      <div className="flex items-center gap-2 text-sm font-medium">
        {nombre}
        {ajustado && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-900">ajustado a mano</span>}
      </div>
      {editar ? (
        <CampoHex valor={hex} onChange={(v) => editar(hexToHsl(v, true)!)} />
      ) : (
        <div className="font-mono text-xs text-neutral-600">{hex.toUpperCase()}</div>
      )}
      <div className="font-mono text-xs text-neutral-500">
        H{Math.round(color.H)} S{Math.round(color.S)} L{Math.round(color.L)}
      </div>
      <div className="text-xs text-neutral-500">{nota}</div>
      {children}
      {sugerir && rol && paleta && <SugerenciaColor paleta={paleta} rol={rol} onUsar={editar} />}
      {ajustado && onRestaurar && (
        <button type="button" onClick={onRestaurar} className="self-start text-xs underline">
          Volver al calculado
        </button>
      )}
    </div>
  );
}

/**
 * Color heredado que no alcanza como texto (v1.1): la versión funcional es una opción. Sin ella, el resto de la paleta
 * se genera desde el color heredado y lo que no cumpla queda como aviso.
 */
function OpcionFuncional({ marca, onChange }: { marca: Marca; onChange: (m: Marca) => void }) {
  const actual = marca.identidad.color.solo_heredado ? "solo" : "funcional";
  const elegir = (opcion: "funcional" | "solo") => {
    if (opcion === actual) return;
    if ((marca.identidad.ajustes_manuales ?? []).length > 0 && !confirm("La paleta se recalcula y se pierden los ajustes manuales. ¿Seguir?")) return;
    onChange(elegirVersionFuncional(marca, opcion === "funcional"));
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 p-4 text-sm">
      <div className="mb-1 font-medium">El color heredado no alcanza 4,5:1 como texto sobre el fondo neutro</div>
      <p className="mb-3 text-xs text-neutral-500">Elegí cómo se resuelve. Se recalcula la paleta desde el color heredado.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["funcional", "Con versión funcional", "Un tono más profundo del mismo matiz para texto e íconos. Cumple la fórmula."],
          ["solo", "Solo el color heredado", "El color del cliente también como texto. El resto de la paleta se ajusta a él; lo que no cumpla queda como aviso."],
        ] as const).map(([opcion, titulo, desc]) => (
          <button
            key={opcion}
            type="button"
            onClick={() => elegir(opcion)}
            className={`flex flex-col gap-1 rounded-md border-2 p-3 text-left ${actual === opcion ? "border-neutral-900" : "border-neutral-200"}`}
          >
            <span className="font-medium">{titulo}</span>
            <span className="text-xs text-neutral-500">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const NOMBRE_ROL: Record<RolPaleta, string> = {
  color_marca: "color de marca",
  version_funcional: "versión funcional",
  tono_apoyo: "tono de apoyo",
  fondo_neutro: "fondo neutro",
  acento: "acento",
};

/**
 * Color ajustado a mano que rompe la fórmula (v1.1): qué controles no cumple y los colores que sí los cumplen con el
 * resto de la paleta como está: el más próximo al elegido (ΔE) y el de su mismo matiz por contraste.
 */
function SugerenciaColor({ paleta, rol, onUsar }: { paleta: Paleta; rol: RolPaleta; onUsar?: (c: HSL) => void }) {
  const actual = paleta[rol];
  const clave = JSON.stringify(paleta);
  const fallas = useMemo(() => fallasPaleta(paleta, rol), [clave, rol]); // eslint-disable-line react-hooks/exhaustive-deps
  const sugerido = useMemo(
    () => (fallas.length && actual ? colorValidoCercano(paleta, rol, actual) : null),
    [clave, rol, fallas.length], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const porContraste = useMemo(
    () => (fallas.length && actual ? colorPorContraste(paleta, rol, actual) : null),
    [clave, rol, fallas.length], // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!fallas.length || !actual) return null;
  // Las dos variantes del paso 9; si coinciden se muestra una sola.
  const opciones = [
    { etiqueta: "Más próximo que cumple", color: sugerido },
    { etiqueta: "Mismo matiz, por contraste", color: porContraste },
  ].filter((o, i, todas): o is { etiqueta: string; color: HSL } =>
    o.color !== null && todas.findIndex((x) => x.color && hslToHex(x.color) === hslToHex(o.color!)) === i,
  );
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
      <span>No cumple la fórmula (se acepta con aviso):</span>
      <ul className="list-disc pl-4">
        {fallas.map((f) => (
          <li key={f.control}>
            {f.control}: {f.valor.toFixed(1)}:1 (mín. {f.minimo})
          </li>
        ))}
      </ul>
      {opciones.length ? (
        opciones.map(({ etiqueta, color }) => (
          <div key={etiqueta} className="flex items-center gap-2">
            <span className="h-6 w-6 shrink-0 rounded border border-black/10" style={{ background: hslCss(color) }} />
            <span>
              {`${etiqueta}: `}
              <span className="font-mono">{hslToHex(color).toUpperCase()}</span>
            </span>
            {onUsar && (
              <button type="button" onClick={() => onUsar(color)} className="ml-auto rounded bg-amber-900 px-2 py-1 text-white">
                Usar
              </button>
            )}
          </div>
        ))
      ) : (
        <span>
          Ningún {NOMBRE_ROL[rol]} dentro del rango de la fórmula cumple con el resto de la paleta. El aviso se mantiene; se
          puede ajustar otro de los colores.
        </span>
      )}
    </div>
  );
}

/** Secciones de la identidad, en el orden en que se presentan (replanteo, E1). */
export const SECCIONES_IDENTIDAD = [
  { id: "color", titulo: "Color" },
  { id: "tipografia", titulo: "Tipografía" },
  { id: "logo", titulo: "Logo" },
  { id: "recursos", titulo: "Recursos gráficos" },
  { id: "fotografia", titulo: "Fotografía" },
] as const;

type IdSeccion = (typeof SECCIONES_IDENTIDAD)[number]["id"];

/** Una sección de la identidad: ancla para el índice, título y, si hace falta, una bajada. */
function Seccion({ id, extra, children }: { id: IdSeccion; extra?: React.ReactNode; children: React.ReactNode }) {
  const titulo = SECCIONES_IDENTIDAD.find((s) => s.id === id)!.titulo;
  return (
    <section id={id} className="flex scroll-mt-32 flex-col gap-4 border-t border-neutral-200 pt-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

/**
 * Identidad de la marca: el sistema visual por secciones (color, tipografía, logo, recursos gráficos y fotografía),
 * con una prueba en Modo A y Modo B arriba. Edita solo `marca.identidad`; Publicaciones lee de ahí.
 */
export function IdentidadMarca({ marca, onChange }: { marca: Marca; onChange?: (m: Marca) => void }) {
  const p = marca.identidad.paleta;
  const preset = PRESETS[marca.rubro];
  const A = coloresModo(p, "A");
  const B = coloresModo(p, "B");
  const familia = fontFamily(marca.identidad.tipografia.familia_variable);
  const pendientes = pendientesMarca(marca.identidad.logo);
  const [vision, setVision] = useState<Daltonismo | null>(null);
  const [textos, setTextos] = useState<TextosPieza>(() => textosPara(marca.rubro, marca.diagnostico.contenido));
  const ajustes = marca.identidad.ajustes_manuales ?? [];
  const soloHeredado = marca.identidad.color.solo_heredado === true;
  // La sugerencia nunca va sobre el color de marca: es una elección del cliente. Sí sobre los colores ajustados a mano
  // y, con el heredado sin versión funcional, sobre el tono de apoyo, el fondo neutro y el acento aunque no se hayan tocado.
  const sugerir = (rol: RolPaleta) =>
    rol !== "color_marca" && (ajustes.includes(rol) || (soloHeredado && ["tono_apoyo", "fondo_neutro", "acento"].includes(rol)));
  const props = (rol: RolPaleta) =>
    onChange
      ? {
          editar: (c: HSL) => onChange(ajustarColorMarca(marca, rol, c)),
          ajustado: ajustes.includes(rol),
          onRestaurar: () => onChange(restaurarColorMarca(marca, rol)),
          rol,
          paleta: p,
          sugerir: sugerir(rol),
        }
      : { ajustado: ajustes.includes(rol) };
  const relacion = relacionAcento(p);
  const pedido = p.tipo_acento === "complementario" ? "complementario" : "análogo";
  const notaAcento =
    ajustes.includes("acento")
      ? `A mano · texto ${p.acento.texto.replaceAll("_", " ")}`
      : relacion === pedido
        ? `${relacion[0].toUpperCase()}${relacion.slice(1)} · texto ${p.acento.texto.replaceAll("_", " ")}`
        : `Se pidió ${pedido}; no cumplía contraste y quedó ${relacion} · texto ${p.acento.texto.replaceAll("_", " ")}`;
  const secuencia = p.invertir_modo
    ? preset.secuencia.map((m) => (m === "A" ? "B" : "A"))
    : preset.secuencia;

  return (
    <div className="flex flex-col gap-10" style={vision ? { filter: `url(#daltonismo-${vision})` } : undefined}>
      <FiltrosDaltonismo />
      <section aria-label="Prueba de la identidad" className="grid gap-6 lg:grid-cols-[1fr_1fr_18rem]">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Modo A · claro{ajustes.length > 0 && <span className="ml-2 normal-case tracking-normal text-amber-700">con ajustes manuales</span>}
          </h3>
          <PiezaMuestra paleta={p} tipografia={marca.identidad.tipografia} rubro={marca.rubro} modo="A" nombre={marca.nombre} logo={marca.identidad.logo} textos={textos} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Modo B · bold{ajustes.length > 0 && <span className="ml-2 normal-case tracking-normal text-amber-700">con ajustes manuales</span>}
          </h3>
          <PiezaMuestra paleta={p} tipografia={marca.identidad.tipografia} rubro={marca.rubro} modo="B" nombre={marca.nombre} logo={marca.identidad.logo} textos={textos} />
        </div>
        <div className="flex flex-col gap-4 text-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Texto de ejemplo</h3>
          {([
            ["h1", "Mensaje principal (H1)", 2],
            ["body", "Texto de apoyo", 3],
            ["cta", "Llamado a la acción", 1],
          ] as const).map(([k, etiqueta, filas]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="font-medium">{etiqueta}</span>
              <textarea
                rows={filas}
                value={textos[k]}
                onChange={(e) => setTextos({ ...textos, [k]: e.target.value })}
                className="resize-none rounded-md border border-neutral-300 px-3 py-2"
              />
              {k === "h1" && (
                <span className="text-xs text-neutral-500">
                  {textos.h1.trim().length} caracteres → peso {pesoH1(textos.h1, marca.identidad.tipografia.familia_variable)}
                </span>
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={() => setTextos(textosPara(marca.rubro, marca.diagnostico.contenido))}
            className="self-start text-xs underline"
          >
            Volver al texto de ejemplo
          </button>
          <p className="text-xs text-neutral-500">
            Es solo para probar la identidad con textos reales. Las publicaciones se arman en Publicaciones.
          </p>
        </div>
      </section>

      <Seccion
        id="color"
        extra={
          <>
            {onChange && (
              <span className="text-sm text-neutral-500">
                Podés corregir cualquier color escribiendo su HEX. Los ejemplos de Modo A y Modo B se actualizan al instante.
              </span>
            )}
            {onChange && ajustes.length > 0 && (
              <button type="button" onClick={() => onChange(restaurarColorMarca(marca))} className="ml-auto text-sm underline">
                Volver a la paleta calculada
              </button>
            )}
          </>
        }
      >
        {onChange && puedeElegirFuncional(marca) && <OpcionFuncional marca={marca} onChange={onChange} />}
        {onChange && <LaboratorioColor marca={marca} onChange={onChange} vision={vision} onVision={setVision} />}
        {soloHeredado && fallasPaleta(p).length > 0 && (
          <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            El color heredado se usa sin versión funcional, por decisión del cliente. Estos contrastes no llegan al mínimo del
            manual; se aceptan con aviso y no bloquean las publicaciones:
            <ul className="mt-1 list-disc pl-5">
              {fallasPaleta(p).map((f) => (
                <li key={f.control}>{f.control}: {f.valor.toFixed(1)}:1 (mín. {f.minimo})</li>
              ))}
            </ul>
            El color de marca no se modifica. Debajo del tono de apoyo, el fondo neutro y el acento se sugiere el color más
            próximo que cumple.
          </div>
        )}
        {ajustes.length > 0 && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Los colores ajustados a mano no pasan por la fórmula: se respetan por decisión del cliente. Los contrastes en rojo
            no llegan al mínimo del manual; en Publicaciones figuran como aviso y no bloquean la exportación. Debajo de cada color
            ajustado que no cumple (salvo el color de marca) se sugiere el más próximo que sí cumple.
          </p>
        )}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Muestra nombre="Color de marca" color={p.color_marca} nota={marca.identidad.color.modo === "heredado" ? "Heredado del cliente" : "Chip optimizado"} {...props("color_marca")}>
            {p.version_funcional ? (
              <div className="text-xs">con la funcional encima: <Ratio valor={contraste(p.color_marca, p.version_funcional)} minimo={MIN_GRAFICO} /></div>
            ) : (
              <div className="text-xs">vs. fondo: <Ratio valor={contraste(p.color_marca, p.fondo_neutro)} minimo={MIN_TEXTO} /></div>
            )}
          </Muestra>
          {p.version_funcional && (
            <Muestra nombre="Versión funcional" color={p.version_funcional} nota="Texto, íconos y elementos finos" {...props("version_funcional")}>
              <div className="text-xs">vs. fondo: <Ratio valor={contraste(p.version_funcional, p.fondo_neutro)} minimo={MIN_TEXTO} /></div>
            </Muestra>
          )}
          <Muestra nombre="Tono de apoyo" color={p.tono_apoyo} nota="Masas de forma. Nunca texto ni íconos." {...props("tono_apoyo")} />
          <Muestra nombre="Fondo neutro" color={p.fondo_neutro} nota="Base y espacio negativo" {...props("fondo_neutro")} />
          <Muestra nombre="Acento" color={p.acento} nota={notaAcento} {...props("acento")}>
            <div className="text-xs">con su texto: <Ratio valor={contraste(p.acento, colorTextoAcento(p))} minimo={MIN_TEXTO} /></div>
            {ctaModoB(p) === "directo" ? (
              <div className="text-xs">sobre marca: <Ratio valor={contraste(p.acento, p.color_marca)} minimo={MIN_GRAFICO} /></div>
            ) : (
              <div className="text-xs text-neutral-600">
                sobre marca: {contraste(p.acento, p.color_marca).toFixed(1)}:1 → CTA de Modo B {ctaModoB(p)} (ver abajo)
              </div>
            )}
          </Muestra>
        </div>
        <CtaModoBPanel marca={marca} onChange={onChange} />
        <p className="mt-4 text-sm text-neutral-600">
          Secuencia de modo por canal: <strong>{secuencia.join(" → ")}</strong>
          {p.invertir_modo && " (invertida: el color heredado es claro y rinde mejor como fondo)"}.
          Texto en Modo B: <Ratio valor={contraste(B.fondo, B.texto)} minimo={MIN_TEXTO} />. Texto en Modo A: <Ratio valor={contraste(A.fondo, A.texto)} minimo={MIN_TEXTO} />.
        </p>
      </Seccion>

      <Seccion
        id="tipografia"
        extra={
          <span className="text-sm text-neutral-500">
            {marca.identidad.tipografia.familia_variable}
            {marca.identidad.tipografia.familia_texto && ` + ${marca.identidad.tipografia.familia_texto}`} ·{" "}
            {marca.identidad.tipografia.italic_habilitado ? "itálica habilitada (solo body/caption, regular)" : "sin itálica"}
          </span>
        }
      >
        {onChange && <ParTipografico marca={marca} onChange={onChange} />}
        <div className="flex flex-col gap-3 rounded-md border border-black/10 p-6" style={{ fontFamily: familia, color: hslCss(A.texto), background: hslCss(A.fondo) }}>
          {([
            ["H1", `${pesoH1("", marca.identidad.tipografia.familia_variable)} → 700 según largo`, "Mensaje principal", pesoH1("", marca.identidad.tipografia.familia_variable), escala("H1", "feed")],
            ["H2", String(PESOS.H2), "Dato de apoyo o subtítulo", PESOS.H2, escala("H2", "feed")],
            ["Body", String(PESOS.body), "Texto secundario que acompaña al mensaje principal.", PESOS.body, escala("body", "feed")],
            ["Caption", String(PESOS.caption), "Datos mínimos · condiciones · fechas", PESOS.caption, escala("caption", "feed")],
          ] as const).map(([nivel, peso, texto, w, [min, max]]) => (
            <div key={nivel} className="flex items-baseline gap-4">
              <span className="w-28 shrink-0 font-sans text-xs text-neutral-500" style={{ fontFamily: "system-ui" }}>
                {nivel} · {peso}<br />{min}-{max} px
              </span>
              <span style={{ fontWeight: w, fontSize: Math.round(max * 0.6), fontFamily: nivel === "Body" || nivel === "Caption" ? fontFamily(familiaTexto(marca.identidad.tipografia)) : undefined }}>{texto}</span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion id="logo">
        <div className="grid grid-cols-3 gap-4">
          {([
            ["color", "Color · Modo A", p.fondo_neutro],
            ["mono_claro", "Mono claro · Modo B", p.color_marca],
            ["mono_oscuro", "Mono oscuro · fondos claros", p.tono_apoyo],
          ] as const).map(([k, etiqueta, fondo]) => (
            <div key={k} className="flex flex-col gap-2">
              <div className="flex h-40 items-center justify-center rounded-md p-6" style={{ background: hslCss(fondo) }}>
                {marca.identidad.logo[k] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marca.identidad.logo[k]!} alt={etiqueta} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-neutral-500">sin cargar</span>
                )}
              </div>
              <span className="text-xs text-neutral-600">{etiqueta}</span>
            </div>
          ))}
        </div>
        {pendientes.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-amber-800">
            {pendientes.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
      </Seccion>

      <BibliotecaMarca marca={marca} onChange={onChange} />

      <Seccion id="fotografia">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={marca.identidad.fotos_habilitadas}
            disabled={!onChange}
            onChange={(e) => onChange?.({ ...marca, identidad: { ...marca.identidad, fotos_habilitadas: e.target.checked } })}
          />
          La marca tiene fotos propias
        </label>
        <p className="text-xs text-neutral-500">
          Habilita la foto como capa decorativa y en el catálogo. Sin fotos propias, las piezas usan formas, patrones e
          íconos (cap. 5): toda pieza tiene que funcionar completa sin foto.
        </p>
      </Seccion>
    </div>
  );
}

/** Recursos gráficos de la marca (cap. 5): la biblioteca que habilita el rubro, en los colores de la marca. */
function BibliotecaMarca({ marca, onChange }: { marca: Marca; onChange?: (m: Marca) => void }) {
  const p = marca.identidad.paleta;
  const lib = BIBLIOTECA_RUBRO[marca.rubro];
  const estilo = estiloIconos(marca);
  return (
    <Seccion id="recursos">
      {onChange && <RasgosPropios marca={marca} onChange={onChange} />}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Íconos</span>
          <div className="flex overflow-hidden rounded-md border border-neutral-300">
            {(["lineal", "solido"] as const).map((e) => (
              <button
                key={e}
                type="button"
                disabled={!onChange}
                onClick={() => onChange?.({ ...marca, identidad: { ...marca.identidad, graficos: { ...marca.identidad.graficos, estilo_iconos: e } } })}
                className={`px-3 py-1.5 text-xs ${estilo === e ? "bg-neutral-900 text-white" : "bg-white"}`}
              >
                {e === "lineal" ? "Lineal" : "Sólido"}
              </button>
            ))}
          </div>
          <span className="text-xs text-neutral-500">un solo estilo por marca</span>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Formas del rubro</h3>
        <div className="flex flex-wrap gap-3">
          {formasDelRubro(marca.rubro).map((f) => (
            <div key={f.id} title={f.nombre} className="flex h-16 w-16 items-center justify-center rounded-md p-2" style={{ background: hslCss(p.fondo_neutro) }}>
              <FormaSvg id={f.id} color={f.trazo ? p.color_marca : p.tono_apoyo} grosor={8} style={{ width: "100%", height: "100%" }} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Patrones del rubro (10-20% de opacidad)</h3>
        <div className="flex flex-wrap gap-3">
          {PATRONES.filter((pt) => lib.patrones.includes(pt.id)).map((pt) => (
            <div key={pt.id} className="flex flex-col gap-1 text-xs text-neutral-600">
              <div className="relative h-20 w-32 overflow-hidden rounded-md" style={{ background: hslCss(p.fondo_neutro) }}>
                <PatronSvg id={pt.id} color={p.color_marca} opacidad={OPACIDAD_PATRON.uso} celda={20} />
              </div>
              {pt.nombre}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Íconos sugeridos</h3>
        <div className="flex flex-wrap gap-2">
          {lib.iconosSugeridos.flatMap((cat) => ICONOS[cat]).map((n) => (
            <div key={n} title={n} className="flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 bg-white">
              <Icono nombre={n} estilo={estilo} color={p.color_marca} tamano={24} />
            </div>
          ))}
        </div>
      </div>
    </Seccion>
  );
}

const CTA_OPCIONES: { modo: CtaModoB; etiqueta: string; descripcion: string }[] = [
  { modo: "directo", etiqueta: "Directo", descripcion: "Botón en acento sobre el color de marca." },
  { modo: "contorno", etiqueta: "Con contorno", descripcion: "Botón en acento con un anillo de fondo neutro." },
  { modo: "invertido", etiqueta: "Invertido", descripcion: "Botón en fondo neutro con el texto en acento." },
];

/** Cómo va el CTA en Modo B: automático según contraste, o elegido a mano. */
function CtaModoBPanel({ marca, onChange }: { marca: Marca; onChange?: (m: Marca) => void }) {
  const p = marca.identidad.paleta;
  const actual = ctaModoB(p);
  const auto = ctaModoBAuto(p);
  return (
    <div className="mt-6 rounded-md border border-neutral-200 p-4">
      <div className="mb-1 text-sm font-medium">CTA en Modo B (fondo color de marca)</div>
      <p className="mb-3 text-xs text-neutral-500">
        {p.cta_modo_b && !ctaModoBElegidoInvalido(p)
          ? "Elegido a mano."
          : `Automático: ${auto === "directo" ? "el acento contrasta con la marca" : "el acento no contrasta lo suficiente con la marca, se separa con fondo neutro"}.`}
        {" "}Las opciones que no cumplen los contrastes no se pueden elegir.
      </p>
      {ctaModoBElegidoInvalido(p) && (
        <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-900">
          La opción elegida a mano ({p.cta_modo_b}) ya no cumple con los colores actuales: se usa la automática.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {CTA_OPCIONES.map(({ modo, etiqueta, descripcion }) => {
          const controles = controlesCtaModoB(p, modo);
          const valido = cumple(controles);
          const activo = actual === modo;
          const fondo = modo === "invertido" ? p.fondo_neutro : p.acento;
          const texto = modo === "invertido" ? p.acento : colorTextoAcento(p);
          return (
            <button
              key={modo}
              type="button"
              disabled={!onChange || !valido}
              title={valido ? undefined : "No cumple los contrastes mínimos con esta paleta"}
              onClick={() => onChange?.(elegirCtaModoB(marca, modo === auto ? null : modo))}
              className={`flex flex-col gap-2 rounded-md border-2 p-3 text-left ${activo ? "border-neutral-900" : "border-transparent bg-white"} disabled:cursor-default ${valido ? "" : "opacity-50"}`}
            >
              <div className="flex h-16 items-center justify-center rounded" style={{ background: hslCss(p.color_marca) }}>
                <span
                  className="rounded-full px-4 py-1.5 text-xs font-semibold"
                  style={{
                    background: hslCss(fondo),
                    color: hslCss(texto),
                    boxShadow: modo === "contorno" ? `0 0 0 4px ${hslCss(p.fondo_neutro)}` : undefined,
                  }}
                >
                  Llamado a la acción
                </span>
              </div>
              <span className="text-sm font-medium">
                {etiqueta}
                {modo === auto && <span className="ml-1 text-xs font-normal text-neutral-500">(auto)</span>}
              </span>
              <span className="text-xs text-neutral-500">{descripcion}</span>
              {controles.map((c) => (
                <span key={c.control} className="text-xs">
                  {c.control}: <Ratio valor={c.valor} minimo={c.minimo} />
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
