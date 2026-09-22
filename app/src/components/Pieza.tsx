"use client";

import { useLayoutEffect, useRef } from "react";
import { contraste, hslCss, type HSL } from "@/engine/color";
import { BIBLIOTECA_RUBRO, CONTACTO, OPACIDAD_ICONO_DECO, OPACIDAD_PATRON, OVERLAY_FOTO, type Patron } from "@/engine/biblioteca";
import { evaluarPieza, type Medicion, type ResultadoChecklist } from "@/engine/checklist";
import type { Marca } from "@/engine/diagnostico";
import { FORMATOS } from "@/engine/formatos";
import { coloresModo, estiloCta, MIN_GRAFICO, opacidadSegura } from "@/engine/palette";
import {
  decoEfectiva,
  estiloIconos,
  MAX_CONTACTO,
  maxItems,
  plantillaPara,
  type Deco,
  type Pieza as TPieza,
} from "@/engine/pieza";
import { FACTOR_STORY, pesoH1 } from "@/engine/typography";
import { fontFamily } from "@/lib/fuentes";
import { ajustarTexto, medirPieza } from "@/lib/medicion";
import { FormaSvg, FotoEnForma, Icono, PatronSvg } from "./Graficos";

/**
 * Pieza a tamaño real de lienzo (p. ej. 1080×1350). La misma pieza se usa en la vista previa (escalada con CSS) y
 * en el render a PNG, así lo que se ve es lo que se exporta. Al montarse ajusta el texto a los slots, mide el
 * resultado y corre el checklist; cuando termina marca `data-listo="true"`.
 *
 * Orden de capas fijo (cap. 6): fondo y forma de fondo → capa decorativa o foto → texto e íconos.
 */
export function Pieza({
  marca,
  pieza,
  onResultado,
}: {
  marca: Marca;
  pieza: TPieza;
  onResultado?: (r: ResultadoChecklist, m: Medicion) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const f = FORMATOS[pieza.formato];
  const plantilla = plantillaPara(pieza.variante, pieza.formato);
  const horizontal = f.columnaMensaje != null;
  const escala = f.escala === "story" ? FACTOR_STORY : 1;
  const px = (v: number) => Math.round(v * escala);
  const p = marca.paleta;
  const c = coloresModo(p, pieza.modo);
  const cta = estiloCta(p, pieza.modo);
  const estilo = estiloIconos(marca);
  const logoSrc = marca.logo[c.logo];
  const centrado = pieza.alineacion === "centrado";
  const italica = pieza.body_italica && marca.tipografia.italic_habilitado;
  const { h1, body } = pieza.contenido;
  const ctaTexto = plantilla.tieneCta ? pieza.contenido.cta?.trim() : null;
  const deco = plantilla.deco ? decoEfectiva(marca, pieza) : null;
  const contacto = plantilla.bloque === "contacto" ? (pieza.contacto ?? []).filter((d) => d.valor.trim()).slice(0, MAX_CONTACTO) : [];
  const items = plantilla.bloque === "catalogo" ? (pieza.items ?? []).slice(0, maxItems(pieza.formato)) : [];

  // Íconos informativos: color de marca en Modo A; en Modo B, acento si contrasta con la marca, si no el neutro.
  const colorInfo: HSL = pieza.modo === "A" ? c.texto : contraste(p.acento, p.color_marca) >= MIN_GRAFICO ? p.acento : c.texto;

  // La forma de fondo va solo cuando no hay capa decorativa ni ítems con su propia forma: nunca dos formas
  // protagonistas (cap. 6).
  const conFormaFondo = !plantilla.deco && plantilla.bloque !== "catalogo";
  const formaColor = pieza.modo === "A" ? c.apoyo : p.fondo_neutro;
  const formaOpacidad = opacidadSegura(c.fondo, formaColor, c.texto, pieza.modo === "A" ? 0.35 : 0.12);

  const onResultadoRef = useRef(onResultado);
  useLayoutEffect(() => {
    onResultadoRef.current = onResultado;
  });

  // Solo lo que cambia el layout: el id de la pieza no cuenta.
  const clave = JSON.stringify([{ ...pieza, id: null }, p, marca.tipografia, marca.graficos, marca.logo[c.logo]?.length]);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let vigente = true;
    root.dataset.listo = "false";
    const imagenes = [...root.querySelectorAll("image, img")].map((el) =>
      el instanceof HTMLImageElement ? el.decode().catch(() => undefined) : Promise.resolve(),
    );
    Promise.all([document.fonts.ready, ...imagenes]).then(() => {
      if (!vigente) return;
      const desborde = ajustarTexto(root, plantilla, f.alto, escala);
      const medicion = medirPieza(root, desborde);
      const resultado = evaluarPieza(marca, pieza, medicion);
      root.dataset.listo = "true";
      onResultadoRef.current?.(resultado, medicion);
    });
    return () => {
      vigente = false;
    };
    // `clave` resume todo lo que cambia el layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const justificar = centrado ? "center" : "flex-start";

  const logo = (
    <div style={{ display: "flex", flexShrink: 0, alignItems: "center", height: px(plantilla.logoPx), justifyContent: justificar }}>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-slot="logo" src={logoSrc} alt="" style={{ height: "100%", width: "auto", maxWidth: "70%", objectFit: "contain" }} />
      ) : (
        <span data-slot="logo" style={{ color: hslCss(c.texto), fontSize: px(40), fontWeight: 600 }}>
          {marca.nombre}
        </span>
      )}
    </div>
  );

  const bodyEstilo: React.CSSProperties = {
    margin: 0,
    color: hslCss(c.texto),
    fontSize: "var(--body)",
    fontWeight: 400,
    lineHeight: 1.38,
  };

  const listaContacto = contacto.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: px(18), alignItems: justificar }}>
      {contacto.map((d, i) => (
        // El ícono va siempre a la izquierda del dato, también con alineación centrada (cap. 6).
        <div key={i} data-slot="contacto-item" style={{ display: "flex", alignItems: "center", gap: px(18) }}>
          <Icono slot="contacto-icono" nombre={CONTACTO[d.tipo].icono} estilo={estilo} color={colorInfo} tamano={px(horizontal ? 36 : 44)} />
          <span data-slot="contacto-texto" style={{ ...bodyEstilo, fontSize: px(horizontal ? 26 : 30) }}>
            {d.valor}
          </span>
        </div>
      ))}
    </div>
  );

  const mensaje = (extra?: React.ReactNode, estiloZona?: React.CSSProperties) => (
    <div data-slot="mensaje" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", ...estiloZona }}>
      <div data-slot="mensaje-contenido" style={{ display: "flex", flexDirection: "column", gap: horizontal ? px(16) : px(28), alignItems: justificar }}>
        <h1
          data-slot="h1"
          style={{
            margin: 0,
            width: "100%",
            color: hslCss(c.texto),
            fontSize: "var(--h1)",
            fontWeight: pesoH1(h1, marca.tipografia.familia_variable),
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            overflowWrap: "normal",
          }}
        >
          {h1 || " "}
        </h1>
        {body?.trim() && (
          <p data-slot="body" style={{ ...bodyEstilo, maxWidth: "88%", fontStyle: italica ? "italic" : "normal" }}>
            {body}
          </p>
        )}
        {extra}
      </div>
    </div>
  );

  const botonCta = ctaTexto && (
    <div style={{ display: "flex", justifyContent: justificar, padding: cta.anillo ? cta.anillo.px : 0, flexShrink: 0 }}>
      <span
        data-slot="cta"
        style={{
          display: "inline-block",
          background: hslCss(cta.fondo),
          color: hslCss(cta.texto),
          fontSize: px(plantilla.cta),
          fontWeight: 600,
          padding: horizontal ? `${px(14)}px ${px(32)}px` : `${px(22)}px ${px(46)}px`,
          borderRadius: 999,
          boxShadow: cta.anillo ? `0 0 0 ${cta.anillo.px}px ${hslCss(cta.anillo.color)}` : undefined,
        }}
      >
        {ctaTexto}
      </span>
    </div>
  );

  const capaDeco = deco && <CapaDecorativa deco={deco} marca={marca} modo={pieza.modo} estilo={estilo} fondo={c.fondo} />;

  const catalogo = items.length > 0 && (
    <Catalogo
      items={items}
      marca={marca}
      modo={pieza.modo}
      estilo={estilo}
      colorInfo={colorInfo}
      colorTexto={c.texto}
      gap={GAP_ITEMS}
      tamano={
        horizontal
          ? Math.min((f.ancho * (1 - f.columnaMensaje!) - f.ancho * f.zona.x - 40 - GAP_ITEMS * (items.length - 1)) / items.length, f.alto * 0.42)
          : Math.min((f.ancho * (1 - 2 * f.zona.x) - GAP_ITEMS * (items.length - 1)) / items.length, f.alto * (pieza.formato === "9:16" ? 0.2 : 0.24))
      }
      textoPx={px(horizontal ? 24 : 28)}
      centrado={centrado}
    />
  );

  // ── Composición por variante ──
  const zonaBase: React.CSSProperties = {
    position: "absolute",
    left: f.ancho * f.zona.x,
    top: f.alto * f.zona.y,
    bottom: f.alto * f.zona.y,
    display: "flex",
    flexDirection: "column",
    gap: horizontal ? px(20) : px(36),
    textAlign: centrado ? "center" : "left",
  };
  // Horizontal: el mensaje ocupa la mitad izquierda; el elemento lateral (deco, contacto o ítems), la derecha.
  const lateral = horizontal && (capaDeco || listaContacto || catalogo);
  const colIzq: React.CSSProperties = { ...zonaBase, right: horizontal ? f.ancho * (1 - f.columnaMensaje!) : f.ancho * f.zona.x };
  const colDer: React.CSSProperties = {
    position: "absolute",
    left: f.ancho * f.columnaMensaje! + 40,
    right: f.ancho * f.zona.x,
    top: f.alto * f.zona.y,
    bottom: f.alto * f.zona.y,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  let contenidoPieza: React.ReactNode;
  if (horizontal) {
    contenidoPieza = (
      <>
        <div data-columna style={colIzq}>
          {(pieza.variante === "1" || pieza.variante === "4") && logo}
          {mensaje()}
          {botonCta}
          {pieza.variante !== "1" && pieza.variante !== "4" && logo}
        </div>
        {lateral && <div style={colDer}>{capaDeco || listaContacto || catalogo}</div>}
      </>
    );
  } else if (pieza.variante === "2B-L") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: px(32) }}>
          {mensaje(undefined, { flex: 1.25, alignSelf: "stretch" })}
          <div style={{ flex: 1, alignSelf: "center", aspectRatio: "1" }}>{capaDeco}</div>
        </div>
        {botonCta}
        {logo}
      </div>
    );
  } else if (pieza.variante === "2B-S") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {mensaje()}
        <div style={{ height: f.alto * (pieza.formato === "1:1" ? 0.22 : 0.26), flexShrink: 0 }}>{capaDeco}</div>
        {botonCta}
        {logo}
      </div>
    );
  } else if (pieza.variante === "3") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {mensaje(listaContacto)}
        {logo}
      </div>
    );
  } else if (pieza.variante === "4") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {logo}
        {mensaje(undefined, { flex: "0 0 auto" })}
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: justificar }}>{catalogo}</div>
        {botonCta}
      </div>
    );
  } else {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {pieza.variante === "1" && logo}
        {mensaje()}
        {pieza.variante === "1" && botonCta}
        {pieza.variante === "2" && logo}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-pieza
      style={{
        position: "relative",
        width: f.ancho,
        height: f.alto,
        overflow: "hidden",
        background: hslCss(c.fondo),
        fontFamily: fontFamily(marca.tipografia.familia_variable),
        ["--h1" as string]: `${px(plantilla.h1.max)}px`,
        ["--body" as string]: `${px(plantilla.body.max)}px`,
      }}
    >
      {conFormaFondo && (
        <div
          data-slot="forma"
          data-color={JSON.stringify(formaColor)}
          style={{
            position: "absolute",
            // Horizontal: la forma ocupa la mitad derecha, que el mensaje deja libre.
            ...(horizontal && !lateral
              ? { width: f.alto * 1.25, height: f.alto * 1.25, right: -f.alto * 0.1, top: -f.alto * 0.12 }
              : { width: f.ancho * 0.72, height: f.ancho * 0.72, right: -f.ancho * 0.24, bottom: -f.ancho * 0.2 }),
            borderRadius: "50%",
            background: hslCss(formaColor),
            opacity: horizontal && lateral ? formaOpacidad * 0.5 : formaOpacidad,
          }}
        />
      )}
      {contenidoPieza}
    </div>
  );
}

/** Capa decorativa de las variantes 2B: una sola opción por pieza (ícono, forma, patrón o foto con overlay). */
function CapaDecorativa({
  deco,
  marca,
  modo,
  estilo,
  fondo,
}: {
  deco: Deco;
  marca: Marca;
  modo: "A" | "B";
  estilo: "lineal" | "solido";
  fondo: HSL;
}) {
  const p = marca.paleta;
  const caja: React.CSSProperties = { position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" };
  let opacidad = 1;
  let color: HSL = p.tono_apoyo;
  let contenido: React.ReactNode = null;

  if (deco.tipo === "icono") {
    // Ícono decorativo: grande, 15-25% de opacidad, en tono de apoyo o fondo neutro. Nunca marca ni acento.
    color = modo === "A" ? p.tono_apoyo : p.fondo_neutro;
    opacidad = OPACIDAD_ICONO_DECO.uso;
    contenido = <Icono nombre={deco.id} estilo={estilo} color={color} tamano="100%" />;
  } else if (deco.tipo === "forma") {
    color = p.tono_apoyo;
    opacidad = modo === "A" ? 1 : 0.85;
    contenido = <FormaSvg id={deco.id} color={color} grosor={5} style={{ width: "100%", height: "100%" }} />;
  } else if (deco.tipo === "patron") {
    // Patrón: 10-20% de opacidad, en color de marca o tono de apoyo. Nunca acento.
    color = modo === "A" ? p.color_marca : p.tono_apoyo;
    opacidad = OPACIDAD_PATRON.uso;
    contenido = (
      <div style={{ position: "absolute", inset: 0, borderRadius: 32, overflow: "hidden" }}>
        <PatronSvg id={deco.id as Patron} color={color} opacidad={1} celda={56} />
      </div>
    );
  } else if (deco.tipo === "foto" && deco.foto) {
    opacidad = 1;
    contenido = (
      <FotoEnForma
        foto={deco.foto}
        formaId={deco.id || BIBLIOTECA_RUBRO[marca.rubro].contenedores[0]}
        overlay={{ color: p.color_marca, opacidad: OVERLAY_FOTO.uso }}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  return (
    <div
      data-slot="deco"
      data-deco-tipo={deco.tipo}
      data-deco-id={deco.id}
      data-opacidad={opacidad}
      data-overlay={deco.tipo === "foto" ? OVERLAY_FOTO.uso : undefined}
      data-color={JSON.stringify(color)}
      data-fondo={JSON.stringify(fondo)}
      style={{ ...caja, opacity: opacidad }}
    >
      {contenido}
    </div>
  );
}

/** Separación entre ítems del catálogo, en px. El tamaño de cada ítem se calcula con este mismo valor. */
const GAP_ITEMS = 28;

/** Ítems del catálogo (variante 4): foto dentro de forma de contención o ícono, más un texto corto. */
function Catalogo({
  items,
  marca,
  modo,
  estilo,
  colorInfo,
  colorTexto,
  tamano,
  gap,
  textoPx,
  centrado,
}: {
  items: NonNullable<TPieza["items"]>;
  marca: Marca;
  modo: "A" | "B";
  estilo: "lineal" | "solido";
  colorInfo: HSL;
  colorTexto: HSL;
  tamano: number;
  gap: number;
  textoPx: number;
  centrado: boolean;
}) {
  const p = marca.paleta;
  const contenedor = BIBLIOTECA_RUBRO[marca.rubro].contenedores[0];
  const lado = Math.floor(tamano);
  return (
    <div style={{ display: "flex", gap, justifyContent: centrado ? "center" : "flex-start", alignItems: "flex-start" }}>
      {items.map((it, i) => (
        <div key={i} data-slot="item" style={{ width: lado, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div data-slot="item-visual" style={{ width: lado, height: lado, position: "relative" }}>
            {it.foto ? (
              <FotoEnForma foto={it.foto} formaId={contenedor} style={{ width: "100%", height: "100%" }} />
            ) : (
              <>
                <FormaSvg id={contenedor} color={modo === "A" ? p.tono_apoyo : p.fondo_neutro} opacidad={modo === "A" ? 0.35 : 0.15} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                {it.icono && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icono nombre={it.icono} estilo={estilo} color={colorInfo} tamano={Math.round(lado * 0.46)} />
                  </div>
                )}
              </>
            )}
          </div>
          <span data-slot="item-texto" style={{ color: hslCss(colorTexto), fontSize: textoPx, fontWeight: 400, lineHeight: 1.25, textAlign: "center" }}>
            {it.texto}
          </span>
        </div>
      ))}
    </div>
  );
}
