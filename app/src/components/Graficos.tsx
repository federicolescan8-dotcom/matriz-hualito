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
import { encuadre, valoresSvg, type FiltroFoto, type Foco } from "@/engine/fotografia";
import { dimensionesCacheadas } from "@/lib/imagen";
import { resolverForma, type EstiloIconos, type Forma, type Patron } from "@/engine/biblioteca";

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
  formas,
}: {
  id: string;
  /** Formas propias de la marca (E2), para resolver su id. */
  formas?: Forma[];
  color: HSL;
  opacidad?: number;
  style?: React.CSSProperties;
  slot?: string;
  /** Grosor del trazo de las formas lineales, en unidades del viewBox (0-100). */
  grosor?: number;
}) {
  const f = resolverForma(id, formas);
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

/** Dibujo de una celda de patrón de lado `s`, en el color `c`. El ruido no tiene celda: usa un filtro. */
function celdaPatron(id: Patron, s: number, c: string, forma?: Forma): React.ReactNode {
  const dibujo: Record<Patron, React.ReactNode> = {
    puntos: <circle cx={s / 2} cy={s / 2} r={s * 0.12} fill={c} />,
    diagonales: <path d={`M0 ${s}L${s} 0M${-s / 2} ${s / 2}L${s / 2} ${-s / 2}M${s / 2} ${s * 1.5}L${s * 1.5} ${s / 2}`} stroke={c} strokeWidth={s * 0.08} />,
    ondas: <path d={`M0 ${s / 2}Q${s / 4} ${s * 0.2} ${s / 2} ${s / 2}T${s} ${s / 2}`} fill="none" stroke={c} strokeWidth={s * 0.07} />,
    grilla: <path d={`M${s} 0V${s}M0 ${s}H${s}`} stroke={c} strokeWidth={s * 0.05} />,
    cruces: <path d={`M${s / 2} ${s * 0.3}V${s * 0.7}M${s * 0.3} ${s / 2}H${s * 0.7}`} stroke={c} strokeWidth={s * 0.07} strokeLinecap="round" />,
    ruido: null,
    // Patrón propio (E2): la forma propia de la marca, al 60% de la celda.
    propio: forma ? <path d={forma.d} transform={`translate(${s * 0.2} ${s * 0.2}) scale(${(s * 0.6) / 100})`} fill={c} /> : null,
  };
  return dibujo[id];
}

/** Defs de un patrón (o del filtro de ruido) y el relleno que hay que usar para pintarlo. */
function defsPatron(id: Patron, uid: string, s: number, c: string, frecuenciaRuido = 0.8, forma?: Forma) {
  if (id === "ruido") {
    // El ruido solo define la transparencia; el color es el que recibe el patrón.
    return {
      defs: (
        <filter id={`r${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency={frecuenciaRuido} numOctaves="2" seed="7" result="ruido" />
          <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.2 1.2 1.2 0 -1.6" result="alfa" />
          <feComposite in="SourceGraphic" in2="alfa" operator="in" />
        </filter>
      ),
      pintar: (props: React.SVGProps<SVGRectElement>) => (
        <g filter={`url(#r${uid})`}>
          <rect {...props} fill={c} />
        </g>
      ),
    };
  }
  return {
    defs: (
      <pattern id={`p${uid}`} width={s} height={s} patternUnits="userSpaceOnUse">
        {celdaPatron(id, s, c, forma)}
      </pattern>
    ),
    pintar: (props: React.SVGProps<SVGRectElement>) => <rect {...props} fill={`url(#p${uid})`} />,
  };
}

/** Patrón repetible generado por código, llena su contenedor. `celda` es el tamaño de la repetición en px. */
export function PatronSvg({
  id,
  color,
  opacidad,
  celda = 48,
  slot,
  forma,
}: {
  id: Patron;
  /** Forma que repite el patrón propio (E2). */
  forma?: Forma;
  color: HSL;
  opacidad: number;
  celda?: number;
  slot?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const { defs, pintar } = defsPatron(id, uid, celda, hslCss(color), 0.8, forma);
  return (
    <svg data-slot={slot} data-patron={id} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: opacidad }}>
      <defs>{defs}</defs>
      {pintar({ width: "100%", height: "100%" })}
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
  formas,
  filtro,
  foco,
}: {
  foto: string;
  formaId: string;
  formas?: Forma[];
  overlay?: { color: HSL; opacidad: number } | null;
  style?: React.CSSProperties;
  slot?: string;
  /** Tratamiento de la marca (E6) y punto focal del encuadre. */
  filtro?: FiltroFoto | null;
  foco?: Foco;
}) {
  const uid = useId().replace(/:/g, "");
  const f = resolverForma(formaId, formas) ?? resolverForma("circulo")!;
  return (
    <svg data-slot={slot} data-foto data-overlay={overlay?.opacidad ?? 0} viewBox="0 0 100 100" style={{ display: "block", ...style }}>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={f.d} />
        </clipPath>
        <FiltroSvg id={`f${uid}`} filtro={filtro} />
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <ImagenFoco src={foto} foco={foco} x={0} y={0} w={100} h={100} filtroId={filtro ? `f${uid}` : undefined} />
        {overlay && <rect x="0" y="0" width="100" height="100" fill={hslCss(overlay.color)} opacity={overlay.opacidad} />}
      </g>
    </svg>
  );
}

/**
 * Forma rellena de la capa decorativa 2B (v1.1): la silueta de una forma de la biblioteca, rellena con una foto (con
 * overlay de marca) o, sin foto, con el tono de apoyo más un patrón o un ícono grande adentro. Se dibuja en un
 * viewBox de 100×100; `tamanoPx` es el lado real, para que las celdas del patrón tengan un tamaño parejo.
 */
export function FormaRellena({
  formaId,
  relleno,
  fondo,
  foto,
  overlay,
  patron,
  colorPatron,
  opacidadPatron,
  icono,
  estiloIcono,
  colorIcono,
  opacidadIcono,
  visible = { x: 0, y: 0, w: 100, h: 100 },
  zonaIcono,
  tamanoPx,
  formas,
  filtro,
  foco,
}: {
  /** Tratamiento de la marca (E6) y punto focal del encuadre de la foto. */
  filtro?: FiltroFoto | null;
  foco?: Foco;
  formaId: string;
  /** Formas propias de la marca (E2): resuelven el id y la primera es la del patrón propio. */
  formas?: Forma[];
  relleno: "foto" | "patron" | "icono";
  fondo: HSL;
  foto?: string | null;
  overlay?: { color: HSL; opacidad: number };
  patron?: Patron;
  colorPatron?: HSL;
  opacidadPatron?: number;
  icono?: string;
  estiloIcono?: EstiloIconos;
  colorIcono?: HSL;
  opacidadIcono?: number;
  /**
   * Parte de la forma que queda dentro de la pieza, en unidades del viewBox (una forma sangrada se ve a medias). La
   * foto se encuadra en esa parte y el ícono se centra en ella.
   */
  visible?: { x: number; y: number; w: number; h: number };
  /** Dónde va el ícono dentro de la parte visible (por defecto, centrado en ella). */
  zonaIcono?: { x: number; y: number; w: number; h: number };
  tamanoPx: number;
}) {
  const uid = useId().replace(/:/g, "");
  const f = resolverForma(formaId, formas) ?? resolverForma("circulo")!;
  const celda = (100 * 44) / Math.max(tamanoPx, 1);
  const pat = patron && colorPatron ? defsPatron(patron, uid, celda, hslCss(colorPatron), (0.33 * tamanoPx) / 100, formas?.[0]) : null;
  const IconoC = icono ? (ICONOS[icono] ?? Star) : null;
  const zi = zonaIcono ?? visible;
  const ladoIcono = Math.min(42, zi.w * 0.84, zi.h * 0.84);
  const centroIcono = { x: zi.x + zi.w / 2, y: zi.y + zi.h / 2 };
  return (
    <svg viewBox="0 0 100 100" style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <clipPath id={`c${uid}`}>
          <path d={f.d} />
        </clipPath>
        {pat?.defs}
        <FiltroSvg id={`f${uid}`} filtro={filtro} />
      </defs>
      <g clipPath={`url(#c${uid})`}>
        {relleno === "foto" && foto ? (
          <>
            <ImagenFoco src={foto} foco={foco} x={visible.x} y={visible.y} w={visible.w} h={visible.h} filtroId={filtro ? `f${uid}` : undefined} />
            {overlay && <rect width="100" height="100" fill={hslCss(overlay.color)} opacity={overlay.opacidad} />}
          </>
        ) : (
          <>
            <rect width="100" height="100" fill={hslCss(fondo)} />
            {relleno === "patron" && pat && <g opacity={opacidadPatron}>{pat.pintar({ width: 100, height: 100 })}</g>}
            {relleno === "icono" && IconoC && colorIcono && (
              <g opacity={opacidadIcono} transform={`translate(${centroIcono.x - ladoIcono / 2} ${centroIcono.y - ladoIcono / 2})`}>
                <IconoC size={ladoIcono} weight={estiloIcono === "solido" ? "fill" : "regular"} color={hslCss(colorIcono)} />
              </g>
            )}
          </>
        )}
      </g>
    </svg>
  );
}

/** Filtro de color del tratamiento de la marca (E6): la misma matriz que se aplica al medir el contraste. */
export function FiltroSvg({ id, filtro }: { id: string; filtro?: FiltroFoto | null }) {
  if (!filtro) return null;
  // sRGB: el mismo espacio en el que se calcula la matriz (el predeterminado, linearRGB, daría otro resultado).
  return (
    <filter id={id} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
      <feColorMatrix type="matrix" values={valoresSvg(filtro)} />
    </filter>
  );
}

/**
 * Foto que llena una caja del SVG. Sin punto focal (o mientras no se conoce el tamaño de la foto) se centra, como
 * `slice`; con foco, el encuadre lo deja cerca del centro de la caja (`encuadre`, E6).
 */
export function ImagenFoco({
  src,
  foco,
  x,
  y,
  w,
  h,
  filtroId,
  fondo,
}: {
  src: string;
  foco?: Foco;
  x: number;
  y: number;
  w: number;
  h: number;
  filtroId?: string;
  fondo?: boolean;
}) {
  const dim = foco ? dimensionesCacheadas(src) : undefined;
  const filtro = filtroId ? `url(#${filtroId})` : undefined;
  if (!foco || !dim) {
    return <image data-foto-fondo={fondo ? "" : undefined} href={src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" filter={filtro} />;
  }
  const r = encuadre(foco, dim, { w, h });
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="hidden">
      <image data-foto-fondo={fondo ? "" : undefined} href={src} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" filter={filtro} />
    </svg>
  );
}
