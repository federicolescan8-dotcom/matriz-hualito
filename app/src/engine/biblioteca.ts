// Biblioteca de elementos gráficos (manual cap. 5 / A.5). Datos puros: ningún elemento tiene color propio, el color se
// inyecta al componer la pieza según su función. Es un set cerrado y chico, compartido por todos los clientes.

import type { Rubro } from "./presets";

// ── Formas (17, en viewBox 0 0 100 100) ──

export type CategoriaForma = "geometricas" | "organicas" | "lineales" | "contenedores";

export interface Forma {
  id: string;
  nombre: string;
  categoria: CategoriaForma;
  d: string;
  /** Las lineales se dibujan con trazo; el resto, con relleno. */
  trazo?: boolean;
  /** Formas con agujero (anillo). */
  evenodd?: boolean;
  /** Sirve como contenedor de foto (recorte). */
  contiene?: boolean;
}

function estrella(puntas: number, rExt: number, rInt: number): string {
  const pts: string[] = [];
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 === 0 ? rExt : rInt;
    const a = (Math.PI * i) / puntas - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export const FORMAS: Forma[] = [
  { id: "circulo", nombre: "Círculo", categoria: "geometricas", d: "M50 0A50 50 0 1 1 49.99 0Z", contiene: true },
  { id: "cuadrado", nombre: "Cuadrado redondeado", categoria: "geometricas", d: "M20 0H80A20 20 0 0 1 100 20V80A20 20 0 0 1 80 100H20A20 20 0 0 1 0 80V20A20 20 0 0 1 20 0Z", contiene: true },
  { id: "arco", nombre: "Arco", categoria: "geometricas", d: "M0 100V50A50 50 0 0 1 100 50V100Z", contiene: true },
  { id: "triangulo", nombre: "Triángulo", categoria: "geometricas", d: "M50 4L97 92H3Z" },
  { id: "anillo", nombre: "Anillo", categoria: "geometricas", d: "M50 0A50 50 0 1 1 49.99 0ZM50 24A26 26 0 1 0 50.01 24Z", evenodd: true },
  { id: "blob-1", nombre: "Orgánica 1", categoria: "organicas", d: "M73 9C88 18 98 37 95 56C92 76 76 93 55 96C34 99 12 88 5 68C-2 48 6 25 22 13C38 1 58 0 73 9Z", contiene: true },
  { id: "blob-2", nombre: "Orgánica 2", categoria: "organicas", d: "M68 6C84 11 97 28 96 47C95 66 83 86 63 94C43 102 20 95 9 78C-2 61 1 36 14 21C27 6 52 1 68 6Z", contiene: true },
  { id: "blob-3", nombre: "Orgánica 3", categoria: "organicas", d: "M80 18C94 33 99 55 90 73C81 91 58 100 38 96C18 92 3 75 1 55C-1 35 12 15 31 7C50 -1 66 3 80 18Z", contiene: true },
  { id: "blob-4", nombre: "Orgánica 4", categoria: "organicas", d: "M58 3C77 5 94 20 98 40C102 60 90 82 70 92C50 102 26 97 12 82C-2 67 -3 43 8 26C19 9 39 1 58 3Z", contiene: true },
  { id: "subrayado", nombre: "Subrayado ondulado", categoria: "lineales", d: "M2 50Q14 30 26 50T50 50T74 50T98 50", trazo: true },
  { id: "flecha", nombre: "Flecha", categoria: "lineales", d: "M5 50H88M66 28L90 50L66 72", trazo: true },
  { id: "separador", nombre: "Separador", categoria: "lineales", d: "M5 50H95", trazo: true },
  { id: "trazo-curvo", nombre: "Trazo curvo", categoria: "lineales", d: "M5 80C30 15 70 15 95 80", trazo: true },
  { id: "sello", nombre: "Sello", categoria: "contenedores", d: estrella(14, 50, 42), contiene: true },
  { id: "banda", nombre: "Banda", categoria: "contenedores", d: "M0 35L100 25V65L0 75Z" },
  { id: "chip", nombre: "Chip", categoria: "contenedores", d: "M20 30H80A20 20 0 0 1 80 70H20A20 20 0 0 1 20 30Z" },
  { id: "etiqueta", nombre: "Etiqueta", categoria: "contenedores", d: "M0 20H70L100 50L70 80H0Z" },
];

export const formaPorId = (id: string) => FORMAS.find((f) => f.id === id);

// ── Patrones (6, generados por código) ──

export type Patron = "puntos" | "diagonales" | "ondas" | "grilla" | "ruido" | "cruces";
export const PATRONES: { id: Patron; nombre: string }[] = [
  { id: "puntos", nombre: "Puntos" },
  { id: "diagonales", nombre: "Líneas diagonales" },
  { id: "ondas", nombre: "Ondas" },
  { id: "grilla", nombre: "Grilla" },
  { id: "ruido", nombre: "Ruido sutil" },
  { id: "cruces", nombre: "Cruces" },
];
/** Opacidad de los patrones: 10-20% (cap. 5). */
export const OPACIDAD_PATRON = { min: 0.1, max: 0.2, uso: 0.16 };

// ── Íconos (subset curado de 60, librería única: Phosphor) ──

export type EstiloIconos = "lineal" | "solido";
export type CategoriaIcono = "contacto" | "comercio" | "gastronomia" | "belleza" | "servicios" | "tech";

export const ICONOS: Record<CategoriaIcono, string[]> = {
  contacto: ["Phone", "WhatsappLogo", "InstagramLogo", "FacebookLogo", "Envelope", "MapPin", "Globe", "Clock", "Calendar", "Truck", "CreditCard", "Storefront"],
  comercio: ["Tag", "ShoppingBag", "ShoppingCart", "Gift", "Percent", "Star", "Heart", "CheckCircle", "Sparkle", "Lightning", "Fire", "Medal", "Trophy"],
  gastronomia: ["Coffee", "Hamburger", "Pizza", "Wine", "ForkKnife", "Cake", "Cookie", "BowlFood"],
  belleza: ["Scissors", "Flower", "Leaf", "Drop", "Sun", "Moon", "HandHeart", "Barbell", "TShirt"],
  servicios: ["Briefcase", "Scales", "Calculator", "House", "Handshake", "ChartLine", "FileText", "ShieldCheck", "Users", "Lightbulb"],
  tech: ["Laptop", "DeviceMobile", "Code", "Cloud", "Rocket", "Gear", "Robot", "Cpu"],
};
export const TODOS_LOS_ICONOS = Object.values(ICONOS).flat();

/** Opacidad del ícono decorativo: 15-25% (cap. 5). */
export const OPACIDAD_ICONO_DECO = { min: 0.15, max: 0.25, uso: 0.2 };
/** Overlay de color de marca sobre foto decorativa: 60-70% (cap. 5). */
export const OVERLAY_FOTO = { min: 0.6, max: 0.7, uso: 0.65 };

// ── Contacto (variante 3) ──

export type TipoContacto = "telefono" | "whatsapp" | "instagram" | "facebook" | "email" | "direccion" | "web" | "horario";
export const CONTACTO: Record<TipoContacto, { nombre: string; icono: string }> = {
  telefono: { nombre: "Teléfono", icono: "Phone" },
  whatsapp: { nombre: "WhatsApp", icono: "WhatsappLogo" },
  instagram: { nombre: "Instagram", icono: "InstagramLogo" },
  facebook: { nombre: "Facebook", icono: "FacebookLogo" },
  email: { nombre: "Email", icono: "Envelope" },
  direccion: { nombre: "Dirección", icono: "MapPin" },
  web: { nombre: "Web", icono: "Globe" },
  horario: { nombre: "Horario", icono: "Clock" },
};

// ── Qué habilita cada rubro (cap. 7 / A.7) ──

/**
 * Capa decorativa de las variantes 2B (v1.1): una forma grande sangrada contra el borde de la pieza, rellena con foto
 * (recortada con la forma y overlay de marca) o, sin foto, con un patrón o un ícono adentro que le dan el valor
 * decorativo. El relleno es lo que mide el checklist.
 */
export type RellenoDeco = "foto" | "patron" | "icono";
/** Tipo que registra la medición de la capa decorativa (igual al relleno). */
export type TipoDeco = RellenoDeco;

export interface BibliotecaRubro {
  formas: CategoriaForma[];
  patrones: Patron[];
  /** Rellenos de la capa decorativa 2B, en orden de preferencia. La foto solo si la marca tiene fotos. */
  rellenos: RellenoDeco[];
  /** Formas que se pueden sangrar como capa decorativa 2B (la primera es la sugerida). */
  formasDeco: string[];
  /** Formas de contención para fotos e ítems de catálogo. */
  contenedores: string[];
  iconosSugeridos: CategoriaIcono[];
  estiloIconos: EstiloIconos;
}

export const BIBLIOTECA_RUBRO: Record<Rubro, BibliotecaRubro> = {
  servicios: {
    formas: ["geometricas", "lineales"],
    patrones: ["grilla", "diagonales"],
    rellenos: ["icono", "patron", "foto"],
    formasDeco: ["circulo", "cuadrado"],
    contenedores: ["cuadrado", "circulo"],
    iconosSugeridos: ["servicios", "contacto"],
    estiloIconos: "lineal",
  },
  gastronomia: {
    formas: ["contenedores", "geometricas"],
    patrones: ["puntos"],
    rellenos: ["foto", "patron", "icono"],
    formasDeco: ["circulo", "sello", "arco"],
    contenedores: ["circulo", "arco", "sello"],
    iconosSugeridos: ["gastronomia", "comercio"],
    estiloIconos: "solido",
  },
  belleza: {
    formas: ["organicas", "lineales"],
    patrones: ["ondas", "ruido"],
    rellenos: ["foto", "patron", "icono"],
    formasDeco: ["blob-1", "blob-2", "circulo"],
    contenedores: ["blob-1", "blob-2", "arco"],
    iconosSugeridos: ["belleza", "comercio"],
    estiloIconos: "lineal",
  },
  tech: {
    formas: ["geometricas", "contenedores"],
    patrones: ["grilla"],
    rellenos: ["patron", "icono", "foto"],
    formasDeco: ["circulo", "cuadrado"],
    contenedores: ["cuadrado", "circulo"],
    iconosSugeridos: ["tech", "comercio"],
    estiloIconos: "lineal",
  },
};

/** Formas habilitadas para el rubro, en el orden de categorías del rubro (la primera es la sugerida). */
export function formasDelRubro(rubro: Rubro): Forma[] {
  return BIBLIOTECA_RUBRO[rubro].formas.flatMap((cat) => FORMAS.filter((f) => f.categoria === cat));
}

/** Rellenos de capa decorativa habilitados para una marca (la foto requiere fotos propias). */
export function rellenosDisponibles(rubro: Rubro, fotosHabilitadas: boolean): RellenoDeco[] {
  return BIBLIOTECA_RUBRO[rubro].rellenos.filter((t) => t !== "foto" || fotosHabilitadas);
}
