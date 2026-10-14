// Sujeto PNG (cap. 6b, E16): transparencia útil, damero pintado, máscara de lo opaco, respaldo y control del checklist.
import { describe, expect, it } from "vitest";
import { evaluarPieza, type Medicion } from "./checklist";
import { construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { piezaNueva, type Pieza } from "./pieza";
import { analizarAlfa, capaSujeto, celdasOpacas, mascaraOpaca, motivoSinSujeto, pareceDamero, tocaSujeto, type Sujeto } from "./sujeto";
import { pesoH1 } from "./typography";

/** Imagen RGBA sintética: `pintar(x, y)` devuelve [r, g, b, a]. */
function imagen(w: number, h: number, pintar: (x: number, y: number) => [number, number, number, number]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(pintar(x, y), (y * w + x) * 4);
  return d;
}
// Un círculo opaco de radio 30 en el centro de 100×100, sobre transparente (un recorte bien hecho).
const recorte = imagen(100, 100, (x, y) => (Math.hypot(x - 50, y - 50) < 30 ? [200, 40, 40, 255] : [0, 0, 0, 0]));
// La misma foto con fondo blanco (sin alfa): como una foto de celular.
const conFondo = imagen(100, 100, (x, y) => (Math.hypot(x - 50, y - 50) < 30 ? [200, 40, 40, 255] : [255, 255, 255, 255]));
// "PNG sin fondo" falso: el damero gris y blanco pintado en los píxeles, de 10 px.
const damero = imagen(100, 100, (x, y) =>
  Math.hypot(x - 50, y - 50) < 30 ? [200, 40, 40, 255] : (Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? [231, 231, 231, 255] : [255, 255, 255, 255],
);

describe("transparencia útil", () => {
  it("un recorte con aire alrededor tiene transparencia útil y su caja es la del sujeto", () => {
    const a = analizarAlfa(recorte, 100, 100);
    expect(a.transparente).toBe(true);
    expect(a.borde).toBe(1);
    expect(a.caja).toEqual({ x: 21, y: 21, w: 59, h: 59 });
  });

  it("una foto con fondo no tiene transparencia", () => {
    expect(analizarAlfa(conFondo, 100, 100).transparente).toBe(false);
  });

  it("un sujeto que llena la imagen, con transparencia solo en un rincón, no alcanza", () => {
    const lleno = imagen(100, 100, (x, y) => (x > 90 && y > 90 ? [0, 0, 0, 0] : [10, 10, 10, 255]));
    expect(analizarAlfa(lleno, 100, 100).transparente).toBe(false);
  });

  it("una imagen vacía no tiene caja", () => {
    const vacia = imagen(10, 10, () => [0, 0, 0, 0]);
    expect(analizarAlfa(vacia, 10, 10)).toMatchObject({ caja: null, transparente: false });
  });
});

describe("damero pintado", () => {
  it("detecta el damero gris y blanco", () => {
    expect(pareceDamero(damero, 100, 100)).toBe(true);
  });

  it("un fondo blanco liso o un recorte de verdad no son damero", () => {
    expect(pareceDamero(conFondo, 100, 100)).toBe(false);
    expect(pareceDamero(recorte, 100, 100)).toBe(false);
  });

  it("el motivo para el usuario distingue el damero de una foto común", () => {
    const base: Sujeto = { src: "", ancho: 1, alto: 1, transparente: false, damero: true, mascara: null };
    expect(motivoSinSujeto(base)).toContain("cuadriculado");
    expect(motivoSinSujeto({ ...base, damero: false })).toContain("no tiene fondo transparente");
    expect(motivoSinSujeto({ ...base, transparente: true })).toBeNull();
  });
});

describe("máscara de lo opaco", () => {
  const caja = analizarAlfa(recorte, 100, 100).caja!;
  const m = mascaraOpaca(recorte, 100, caja, 10);

  it("arma una grilla del tamaño pedido con el centro opaco y las esquinas transparentes", () => {
    expect([m.cols, m.filas]).toEqual([10, 10]);
    expect(m.celdas[5 * 10 + 5]).toBe("1");
    expect(m.celdas[0]).toBe("0");
    expect(m.celdas[99]).toBe("0");
  });

  it("lleva las celdas a la caja donde se dibuja", () => {
    const celdas = celdasOpacas(m, { x: 500, y: 500, w: 200, h: 200 });
    expect(celdas.every((c) => c.w === 20 && c.h === 20)).toBe(true);
    expect(celdas.every((c) => c.x >= 500 && c.x + c.w <= 700)).toBe(true);
  });

  it("un texto en el rincón transparente de la caja no toca el sujeto; uno en el centro sí", () => {
    const destino = { x: 500, y: 500, w: 200, h: 200 };
    expect(tocaSujeto(m, destino, { x: 500, y: 500, w: 18, h: 18 })).toBe(false);
    expect(tocaSujeto(m, destino, { x: 590, y: 590, w: 20, h: 20 })).toBe(true);
  });
});

describe("cadena de respaldo y checklist", () => {
  const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
  const marca = construirMarca(d, generarChips(d)[0]);
  const caja = analizarAlfa(recorte, 100, 100).caja!;
  const valido: Sujeto = { src: "data:image/png;base64,x", ancho: 59, alto: 59, transparente: true, damero: false, mascara: mascaraOpaca(recorte, 100, caja, 10) };
  const sinAlfa: Sujeto = { ...valido, transparente: false, mascara: null };
  const pieza = (p: Partial<Pieza> = {}): Pieza => ({
    ...piezaNueva(marca),
    variante: "1",
    modo: "A",
    contenido: { h1: "Tu contabilidad, en orden", body: "Asesoramiento para pymes.", cta: "Agendá una consulta" },
    ...p,
  });
  const medicion = (m: Partial<Medicion> = {}): Medicion => ({
    h1: { lineas: [{ x: 119, y: 420, w: 700, h: 110 }, { x: 119, y: 530, w: 400, h: 110 }], px: 100, peso: pesoH1("Tu contabilidad, en orden", marca.identidad.tipografia.familia_variable), italica: false },
    body: { lineas: [{ x: 119, y: 680, w: 650, h: 44 }], px: 32, peso: 400, italica: false },
    cta: { lineas: [], caja: { x: 119, y: 1100, w: 380, h: 90 }, px: 34, peso: 600, italica: false },
    logo: { x: 119, y: 149, w: 300, h: 110 },
    forma: null,
    desborde: false,
    ...m,
  });
  const control = (p: Pieza, m: Medicion) => evaluarPieza(marca, p, m).controles.find((c) => c.control === "Sujeto sin tapar texto, logo ni CTA");

  it("PNG con transparencia: va el sujeto", () => {
    expect(capaSujeto(marca, pieza({ sujeto: valido })).tipo).toBe("png");
  });

  it("sin transparencia cae al ícono del rubro, y se puede elegir forma o nada", () => {
    expect(capaSujeto(marca, pieza({ sujeto: sinAlfa })).tipo).toBe("icono");
    expect(capaSujeto(marca, pieza({ sujeto: { ...sinAlfa, respaldo: "forma" } })).tipo).toBe("forma");
    expect(capaSujeto(marca, pieza({ sujeto: { ...sinAlfa, respaldo: "nada" } })).tipo).toBe("nada");
  });

  it("el sujeto que se sale del lienzo sin tocar el mensaje pasa (bloqueante sin fallar)", () => {
    const c = control(pieza({ sujeto: valido }), medicion({ sujeto: { x: 700, y: 800, w: 600, h: 600 } }))!;
    expect(c.ok).toBe(true);
    expect(c.nivel).toBe("bloqueante");
  });

  it("si lo opaco pisa el CTA, es bloqueante y nombra lo tapado", () => {
    const c = control(pieza({ sujeto: valido }), medicion({ sujeto: { x: 0, y: 900, w: 500, h: 500 } }))!;
    expect(c.ok).toBe(false);
    expect(c.detalle).toContain("CTA");
  });

  it("el aire transparente del PNG puede pasar sobre el texto", () => {
    // La caja del sujeto cubre el body, pero el body cae en su rincón transparente.
    const c = control(pieza({ sujeto: valido }), medicion({ sujeto: { x: 740, y: 690, w: 400, h: 400 } }))!;
    expect(c.ok).toBe(true);
  });

  it("sin sujeto válido (estado sin sujeto) el control no corre y la pieza sigue pasando", () => {
    const r = evaluarPieza(marca, pieza({ sujeto: sinAlfa }), medicion({ sujeto: { x: 0, y: 0, w: 1080, h: 1350 } }));
    expect(r.controles.some((c) => c.control.startsWith("Sujeto"))).toBe(false);
    expect(r.estado).toBe("ok");
  });
});
