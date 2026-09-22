"use client";

import { useId } from "react";
import {
  Barbell, BowlFood, Briefcase, Cake, Calculator, Calendar, ChartLine, CheckCircle, Clock, Cloud, Code, Coffee, Cookie,
  Cpu, CreditCard, DeviceMobile, Drop, Envelope, FacebookLogo, FileText, Fire, Flower, ForkKnife, Gear, Gift, Globe,
  Hamburger, HandHeart, Handshake, Heart, House, InstagramLogo, Laptop, Leaf, Lightbulb, Lightning, MapPin, Medal, Moon,
  Percent, Phone, Pizza, Robot, Rocket, Scales, Scissors, ShieldCheck, ShoppingBag, ShoppingCart, Sparkle, Star,
  Storefront, Sun, Tag, Trophy, Truck, TShirt, Users, WhatsappLogo, Wine,
  type Icon,
} from "@phosphor-icons/react";
import { hslCss, type HSL } from "@/engine/color";
import { formaPorId, type EstiloIconos, type Patron } from "@/engine/biblioteca";

// Componentes de la biblioteca gráfica (cap. 5). Todos reciben el color desde afuera: ninguno tiene color propio.

const ICONOS: Record<string, Icon> = {
  Barbell, BowlFood, Briefcase, Cake, Calculator, Calendar, ChartLine, CheckCircle, Clock, Cloud, Code, Coffee, Cookie,
  Cpu, CreditCard, DeviceMobile, Drop, Envelope, FacebookLogo, FileText, Fire, Flower, ForkKnife, Gear, Gift, Globe,
  Hamburger, HandHeart, Handshake, Heart, House, InstagramLogo, Laptop, Leaf, Lightbulb, Lightning, MapPin, Medal, Moon,
  Percent, Phone, Pizza, Robot, Rocket, Scales, Scissors, ShieldCheck, ShoppingBag, ShoppingCart, Sparkle, Star,
  Storefront, Sun, Tag, Trophy, Truck, TShirt, Users, WhatsappLogo, Wine,
};

export function Icono({
  nombre,
  estilo,
  color,
  tamano,
  opacidad = 1,
  slot,
}: {
  nombre: string;
  estilo: EstiloIconos;
  color: HSL;
  /** Px, o "100%" para llenar el contenedor. */
  tamano: number | string;
  opacidad?: number;
  slot?: string;
}) {
  const C = ICONOS[nombre] ?? Star;
  const llena = typeof tamano === "string";
  return (
    <span
      data-slot={slot}
      data-icono={nombre}
      style={{ display: "inline-flex", opacity: opacidad, lineHeight: 0, ...(llena ? { width: tamano, height: tamano } : {}) }}
    >
      <C size={tamano} weight={estilo === "solido" ? "fill" : "regular"} color={hslCss(color)} />
    </span>
  );
}

export function FormaSvg({
  id,
  color,
  opacidad = 1,
  style,
  slot,
  grosor = 6,
}: {
  id: string;
  color: HSL;
  opacidad?: number;
  style?: React.CSSProperties;
  slot?: string;
  /** Grosor del trazo de las formas lineales, en unidades del viewBox (0-100). */
  grosor?: number;
}) {
  const f = formaPorId(id);
  if (!f) return null;
  return (
    <svg data-slot={slot} data-forma={id} viewBox="-2 -2 104 104" style={{ display: "block", opacity: opacidad, overflow: "visible", ...style }}>
      <path
        d={f.d}
        fill={f.trazo ? "none" : hslCss(color)}
        fillRule={f.evenodd ? "evenodd" : undefined}
        stroke={f.trazo ? hslCss(color) : undefined}
        strokeWidth={f.trazo ? grosor : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Patrón repetible generado por código, llena su contenedor. `celda` es el tamaño de la repetición en px. */
export function PatronSvg({
  id,
  color,
  opacidad,
  celda = 48,
  slot,
}: {
  id: Patron;
  color: HSL;
  opacidad: number;
  celda?: number;
  slot?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const c = hslCss(color);
  const s = celda;
  const dibujo: Record<Patron, React.ReactNode> = {
    puntos: <circle cx={s / 2} cy={s / 2} r={s * 0.12} fill={c} />,
    diagonales: <path d={`M0 ${s}L${s} 0M${-s / 2} ${s / 2}L${s / 2} ${-s / 2}M${s / 2} ${s * 1.5}L${s * 1.5} ${s / 2}`} stroke={c} strokeWidth={s * 0.08} />,
    ondas: <path d={`M0 ${s / 2}Q${s / 4} ${s * 0.2} ${s / 2} ${s / 2}T${s} ${s / 2}`} fill="none" stroke={c} strokeWidth={s * 0.07} />,
    grilla: <path d={`M${s} 0V${s}M0 ${s}H${s}`} stroke={c} strokeWidth={s * 0.05} />,
    cruces: <path d={`M${s / 2} ${s * 0.3}V${s * 0.7}M${s * 0.3} ${s / 2}H${s * 0.7}`} stroke={c} strokeWidth={s * 0.07} strokeLinecap="round" />,
    ruido: null,
  };
  return (
    <svg data-slot={slot} data-patron={id} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: opacidad }}>
      <defs>
        {id === "ruido" ? (
          // El ruido solo define la transparencia; el color es el que recibe el patrón.
          <filter id={`r${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="ruido" />
            <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.2 1.2 1.2 0 -1.6" result="alfa" />
            <feComposite in="SourceGraphic" in2="alfa" operator="in" />
          </filter>
        ) : (
          <pattern id={`p${uid}`} width={s} height={s} patternUnits="userSpaceOnUse">
            {dibujo[id]}
          </pattern>
        )}
      </defs>
      {id === "ruido" ? (
        <g filter={`url(#r${uid})`}>
          <rect width="100%" height="100%" fill={c} />
        </g>
      ) : (
        <rect width="100%" height="100%" fill={`url(#p${uid})`} />
      )}
    </svg>
  );
}

/**
 * Foto siempre dentro de una forma de contención (cap. 5). En uso decorativo lleva overlay de color de marca;
 * en uso informativo (ítems de catálogo) va sin overlay.
 */
export function FotoEnForma({
  foto,
  formaId,
  overlay,
  style,
  slot,
}: {
  foto: string;
  formaId: string;
  overlay?: { color: HSL; opacidad: number } | null;
  style?: React.CSSProperties;
  slot?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const f = formaPorId(formaId) ?? formaPorId("circulo")!;
  return (
    <svg data-slot={slot} data-foto data-overlay={overlay?.opacidad ?? 0} viewBox="0 0 100 100" style={{ display: "block", ...style }}>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={f.d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <image href={foto} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
        {overlay && <rect x="0" y="0" width="100" height="100" fill={hslCss(overlay.color)} opacity={overlay.opacidad} />}
      </g>
    </svg>
  );
}
