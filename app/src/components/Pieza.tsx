"use client";

import { useLayoutEffect, useRef } from "react";
import { hslCss } from "@/engine/color";
import { evaluarPieza, type Medicion, type ResultadoChecklist } from "@/engine/checklist";
import type { Marca } from "@/engine/diagnostico";
import { FORMATOS } from "@/engine/formatos";
import { coloresModo, estiloCta } from "@/engine/palette";
import { PLANTILLAS, type Pieza as TPieza } from "@/engine/pieza";
import { FACTOR_STORY, pesoH1 } from "@/engine/typography";
import { fontFamily } from "@/lib/fuentes";
import { ajustarTexto, medirPieza } from "@/lib/medicion";

/**
 * Pieza a tamaño real de lienzo (p. ej. 1080×1350). La misma pieza se usa en la vista previa (escalada con CSS) y
 * en el render a PNG, así lo que se ve es lo que se exporta. Al montarse ajusta el texto a los slots, mide el
 * resultado y corre el checklist; cuando termina marca `data-listo="true"`.
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
  const plantilla = PLANTILLAS[pieza.variante]!;
  const escala = f.escala === "story" ? FACTOR_STORY : 1;
  const p = marca.paleta;
  const c = coloresModo(p, pieza.modo);
  const cta = estiloCta(p, pieza.modo);
  const logoSrc = marca.logo[c.logo];
  const centrado = pieza.alineacion === "centrado";
  const italica = pieza.body_italica && marca.tipografia.italic_habilitado;
  const { h1, body } = pieza.contenido;
  const ctaTexto = plantilla.tieneCta ? pieza.contenido.cta?.trim() : null;
  const formaColor = pieza.modo === "A" ? c.apoyo : p.fondo_neutro;

  const onResultadoRef = useRef(onResultado);
  useLayoutEffect(() => {
    onResultadoRef.current = onResultado;
  });

  const clave = JSON.stringify([pieza, p, marca.tipografia, marca.logo[c.logo]?.length]);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let vigente = true;
    root.dataset.listo = "false";
    document.fonts.ready.then(() => {
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

  const alinear = centrado ? "center" : "left";
  const px = (v: number) => `${Math.round(v * escala)}px`;

  const logo = (
    <div className="flex shrink-0 items-center" style={{ height: f.alto * plantilla.logoAlto, justifyContent: centrado ? "center" : "flex-start" }}>
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
        ["--h1" as string]: px(plantilla.h1.max),
        ["--body" as string]: px(plantilla.body.max),
      }}
    >
      {/* Forma de contención (función estructural), siempre detrás del texto. */}
      <div
        data-slot="forma"
        data-color={JSON.stringify(formaColor)}
        style={{
          position: "absolute",
          width: f.ancho * 0.72,
          height: f.ancho * 0.72,
          right: -f.ancho * 0.24,
          bottom: -f.ancho * 0.2,
          borderRadius: "50%",
          background: hslCss(formaColor),
          opacity: pieza.modo === "A" ? 0.35 : 0.12,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: f.ancho * f.zona.x,
          right: f.ancho * f.zona.x,
          top: f.alto * f.zona.y,
          bottom: f.alto * f.zona.y,
          display: "flex",
          flexDirection: "column",
          gap: px(36),
          textAlign: alinear,
        }}
      >
        {pieza.variante === "1" && logo}
        <div data-slot="mensaje" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div data-slot="mensaje-contenido" style={{ display: "flex", flexDirection: "column", gap: px(28), alignItems: centrado ? "center" : "flex-start" }}>
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
              <p
                data-slot="body"
                style={{
                  margin: 0,
                  maxWidth: "88%",
                  color: hslCss(c.texto),
                  fontSize: "var(--body)",
                  fontWeight: 400,
                  lineHeight: 1.38,
                  fontStyle: italica ? "italic" : "normal",
                }}
              >
                {body}
              </p>
            )}
          </div>
        </div>
        {pieza.variante === "1" && ctaTexto && (
          <div style={{ display: "flex", justifyContent: centrado ? "center" : "flex-start", padding: cta.anillo ? cta.anillo.px : 0 }}>
            <span
              data-slot="cta"
              style={{
                display: "inline-block",
                background: hslCss(cta.fondo),
                color: hslCss(cta.texto),
                fontSize: px(plantilla.cta),
                fontWeight: 600,
                padding: `${px(22)} ${px(46)}`,
                borderRadius: 999,
                boxShadow: cta.anillo ? `0 0 0 ${cta.anillo.px}px ${hslCss(cta.anillo.color)}` : undefined,
              }}
            >
              {ctaTexto}
            </span>
          </div>
        )}
        {pieza.variante === "2" && logo}
      </div>
    </div>
  );
}
