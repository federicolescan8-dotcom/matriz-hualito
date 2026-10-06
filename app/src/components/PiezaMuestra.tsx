import { hslCss } from "@/engine/color";
import { coloresModo, estiloCta, opacidadSegura, type Paleta } from "@/engine/palette";
import type { Rubro } from "@/engine/presets";
import { pesoH1, type Tipografia } from "@/engine/typography";
import type { ContenidoCliente, Diagnostico } from "@/engine/diagnostico";
import { fontFamily } from "@/lib/fuentes";

// Pieza de ejemplo, variante 1 (logo → H1 → body → CTA) en feed 4:5. Sirve para que el cliente elija viendo el
// resultado aplicado y no una muestra de color suelta (v1.1). Las medidas están en cqw sobre un lienzo de 1080 px.
const px = (v: number) => `${(v / 10.8).toFixed(3)}cqw`;

export interface TextosPieza {
  h1: string;
  body: string;
  cta: string;
}

export const TEXTOS_EJEMPLO: Record<Rubro, TextosPieza> = {
  servicios: { h1: "Tu contabilidad, en orden", body: "Asesoramiento impositivo para pymes y monotributistas.", cta: "Agendá una consulta" },
  gastronomia: { h1: "Llegó el menú de otoño", body: "Platos de estación, pan de masa madre y postres caseros.", cta: "Reservá tu mesa" },
  belleza: { h1: "Tu momento de pausa", body: "Tratamientos faciales personalizados en un espacio tranquilo.", cta: "Pedí tu turno" },
  tech: { h1: "Tu tienda online en 7 días", body: "Catálogo, pagos y envíos integrados en una sola plataforma.", cta: "Probala gratis" },
};

/** Textos para las vistas previas: el contenido real del cliente (E12) y, donde falte, el ejemplo del rubro. */
export function textosPara(rubro: Rubro, contenido?: ContenidoCliente | null): TextosPieza {
  const ej = TEXTOS_EJEMPLO[rubro];
  return {
    h1: contenido?.mensaje.trim() || ej.h1,
    body: contenido?.apoyo.trim() || ej.body,
    cta: contenido?.cta.trim() || ej.cta,
  };
}

/** Aproximación hasta que exista el ajuste de texto al slot (fase 2): H1 más chico cuanto más largo, sin bajar de 56. */
function tamanoH1(h1: string): number {
  return Math.round(Math.max(56, Math.min(96, 96 - (h1.trim().length - 22) * 1.4)));
}

export function PiezaMuestra({
  paleta,
  tipografia,
  rubro,
  modo,
  nombre,
  logo,
  textos,
  className = "",
}: {
  paleta: Paleta;
  tipografia: Tipografia;
  rubro: Rubro;
  modo: "A" | "B";
  nombre: string;
  logo?: Diagnostico["logo"];
  /** Textos de la pieza; si no se pasan, se usan los de ejemplo del rubro. */
  textos?: TextosPieza;
  className?: string;
}) {
  const c = coloresModo(paleta, modo);
  const t = textos ?? TEXTOS_EJEMPLO[rubro];
  const logoSrc = logo?.[c.logo] ?? null;
  const familia = fontFamily(tipografia.familia_variable);
  const margen = "11%";
  // CTA: con contorno o invertido cuando el acento no contrasta con su fondo (cap. 3, paso 8b).
  const cta = estiloCta(paleta, modo);

  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-md shadow-sm ${className}`}
      style={{ containerType: "inline-size", background: hslCss(c.fondo), fontFamily: familia }}
    >
      {/* Forma de contención en tono de apoyo (función estructural). */}
      <div
        className="absolute rounded-full"
        style={{
          width: "70%",
          aspectRatio: "1",
          right: "-22%",
          bottom: "-18%",
          background: hslCss(modo === "A" ? c.apoyo : paleta.fondo_neutro),
          opacity: opacidadSegura(c.fondo, modo === "A" ? c.apoyo : paleta.fondo_neutro, c.texto, modo === "A" ? 0.35 : 0.12),
        }}
      />
      <div className="absolute flex flex-col" style={{ inset: margen, gap: px(40) }}>
        <div style={{ height: px(150) }} className="flex shrink-0 items-center">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="h-full w-auto max-w-[75%] object-contain object-left" />
          ) : (
            <span style={{ color: hslCss(c.texto), fontSize: px(34), fontWeight: 600, letterSpacing: "0.02em" }}>
              {nombre || "Tu marca"}
            </span>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden" style={{ gap: px(28) }}>
          <h3
            style={{ color: hslCss(c.texto), fontSize: px(tamanoH1(t.h1)), fontWeight: pesoH1(t.h1, tipografia.familia_variable), lineHeight: 1.02 }}
            className="m-0"
          >
            {t.h1}
          </h3>
          <p
            style={{
              color: hslCss(c.texto),
              fontSize: px(34),
              fontWeight: 400,
              lineHeight: 1.35,
              fontStyle: tipografia.italic_habilitado ? "italic" : "normal",
              maxWidth: "85%",
            }}
            className="m-0"
          >
            {t.body}
          </p>
        </div>
        <div>
          <span
            className="inline-block"
            style={{
              background: hslCss(cta.fondo),
              color: hslCss(cta.texto),
              boxShadow: cta.anillo ? `0 0 0 ${px(cta.anillo.px)} ${hslCss(cta.anillo.color)}` : undefined,
              fontSize: px(32),
              fontWeight: 600,
              padding: `${px(20)} ${px(40)}`,
              borderRadius: px(999),
            }}
          >
            {t.cta}
          </span>
        </div>
      </div>
    </div>
  );
}
