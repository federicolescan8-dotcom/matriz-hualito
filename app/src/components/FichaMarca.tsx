"use client";

import { useState } from "react";
import { contraste, hexToHsl, hslCss, hslToHex, type HSL } from "@/engine/color";
import {
  colorTextoAcento,
  coloresModo,
  controlesCtaModoB,
  ctaModoB,
  ctaModoBAuto,
  ctaModoBElegidoInvalido,
  cumple,
  MIN_GRAFICO,
  MIN_TEXTO,
  relacionAcento,
  type CtaModoB,
  type RolPaleta,
} from "@/engine/palette";
import { ajustarColorMarca, elegirCtaModoB, pendientesMarca, restaurarColorMarca, type Marca } from "@/engine/diagnostico";
import { PRESETS } from "@/engine/presets";
import { escala, pesoH1, PESOS } from "@/engine/typography";
import { fontFamily } from "@/lib/fuentes";
import { PiezaMuestra, TEXTOS_EJEMPLO, type TextosPieza } from "./PiezaMuestra";
import { CampoHex } from "./CampoHex";

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
  children,
}: {
  nombre: string;
  color: HSL;
  nota: string;
  /** Si está, el color se puede modificar por HEX. */
  editar?: (color: HSL) => void;
  ajustado?: boolean;
  onRestaurar?: () => void;
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
      {ajustado && onRestaurar && (
        <button type="button" onClick={onRestaurar} className="self-start text-xs underline">
          Volver al calculado
        </button>
      )}
    </div>
  );
}

export function FichaMarca({ marca, onChange }: { marca: Marca; onChange?: (m: Marca) => void }) {
  const p = marca.paleta;
  const preset = PRESETS[marca.rubro];
  const A = coloresModo(p, "A");
  const B = coloresModo(p, "B");
  const familia = fontFamily(marca.tipografia.familia_variable);
  const pendientes = pendientesMarca(marca.logo);
  const [textos, setTextos] = useState<TextosPieza>(TEXTOS_EJEMPLO[marca.rubro]);
  const ajustes = marca.ajustes_manuales ?? [];
  const props = (rol: RolPaleta) =>
    onChange
      ? {
          editar: (c: HSL) => onChange(ajustarColorMarca(marca, rol, c)),
          ajustado: ajustes.includes(rol),
          onRestaurar: () => onChange(restaurarColorMarca(marca, rol)),
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
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr_18rem]">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Modo A · claro</h3>
          <PiezaMuestra paleta={p} tipografia={marca.tipografia} rubro={marca.rubro} modo="A" nombre={marca.nombre} logo={marca.logo} textos={textos} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Modo B · bold</h3>
          <PiezaMuestra paleta={p} tipografia={marca.tipografia} rubro={marca.rubro} modo="B" nombre={marca.nombre} logo={marca.logo} textos={textos} />
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
                  {textos.h1.trim().length} caracteres → peso {pesoH1(textos.h1, marca.tipografia.familia_variable)}
                </span>
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={() => setTextos(TEXTOS_EJEMPLO[marca.rubro])}
            className="self-start text-xs underline"
          >
            Volver al texto de ejemplo
          </button>
          <p className="text-xs text-neutral-500">
            Es solo para probar la marca con textos reales. Las publicaciones se arman en Publicar.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-semibold">Paleta</h2>
          {onChange && <span className="text-sm text-neutral-500">Podés corregir cualquier color escribiendo su HEX.</span>}
          {onChange && ajustes.length > 0 && (
            <button type="button" onClick={() => onChange(restaurarColorMarca(marca))} className="ml-auto text-sm underline">
              Volver a la paleta calculada
            </button>
          )}
        </div>
        {ajustes.length > 0 && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Los colores ajustados a mano no pasan por la fórmula. Revisá los contrastes: los que quedan en rojo no cumplen el
            mínimo del manual y van a bloquear las publicaciones hasta corregirlos.
          </p>
        )}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Muestra nombre="Color de marca" color={p.color_marca} nota={marca.color.modo === "heredado" ? "Heredado del cliente" : "Chip optimizado"} {...props("color_marca")}>
            <div className="text-xs">vs. fondo: <Ratio valor={contraste(p.color_marca, p.fondo_neutro)} minimo={p.version_funcional ? MIN_GRAFICO : MIN_TEXTO} /></div>
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
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Tipografía · {marca.tipografia.familia_variable}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {marca.tipografia.italic_habilitado ? "itálica habilitada (solo body/caption, regular)" : "sin itálica"}
          </span>
        </h2>
        <div className="flex flex-col gap-3 rounded-md border border-black/10 p-6" style={{ fontFamily: familia, color: hslCss(A.texto), background: hslCss(A.fondo) }}>
          {([
            ["H1", `${pesoH1("", marca.tipografia.familia_variable)} → 700 según largo`, "Mensaje principal", pesoH1("", marca.tipografia.familia_variable), escala("H1", "feed")],
            ["H2", String(PESOS.H2), "Dato de apoyo o subtítulo", PESOS.H2, escala("H2", "feed")],
            ["Body", String(PESOS.body), "Texto secundario que acompaña al mensaje principal.", PESOS.body, escala("body", "feed")],
            ["Caption", String(PESOS.caption), "Datos mínimos · condiciones · fechas", PESOS.caption, escala("caption", "feed")],
          ] as const).map(([nivel, peso, texto, w, [min, max]]) => (
            <div key={nivel} className="flex items-baseline gap-4">
              <span className="w-28 shrink-0 font-sans text-xs text-neutral-500" style={{ fontFamily: "system-ui" }}>
                {nivel} · {peso}<br />{min}-{max} px
              </span>
              <span style={{ fontWeight: w, fontSize: Math.round(max * 0.6) }}>{texto}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Logo</h2>
        <div className="grid grid-cols-3 gap-4">
          {([
            ["color", "Color · Modo A", p.fondo_neutro],
            ["mono_claro", "Mono claro · Modo B", p.color_marca],
            ["mono_oscuro", "Mono oscuro · fondos claros", p.tono_apoyo],
          ] as const).map(([k, etiqueta, fondo]) => (
            <div key={k} className="flex flex-col gap-2">
              <div className="flex h-40 items-center justify-center rounded-md p-6" style={{ background: hslCss(fondo) }}>
                {marca.logo[k] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marca.logo[k]!} alt={etiqueta} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-neutral-500">sin cargar</span>
                )}
              </div>
              <span className="text-xs text-neutral-600">{etiqueta}</span>
            </div>
          ))}
        </div>
        {pendientes.length > 0 && (
          <ul className="mt-4 list-disc pl-5 text-sm text-amber-800">
            {pendientes.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

const CTA_OPCIONES: { modo: CtaModoB; etiqueta: string; descripcion: string }[] = [
  { modo: "directo", etiqueta: "Directo", descripcion: "Botón en acento sobre el color de marca." },
  { modo: "contorno", etiqueta: "Con contorno", descripcion: "Botón en acento con un anillo de fondo neutro." },
  { modo: "invertido", etiqueta: "Invertido", descripcion: "Botón en fondo neutro con el texto en acento." },
];

/** Cómo va el CTA en Modo B: automático según contraste, o elegido a mano. */
function CtaModoBPanel({ marca, onChange }: { marca: Marca; onChange?: (m: Marca) => void }) {
  const p = marca.paleta;
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
