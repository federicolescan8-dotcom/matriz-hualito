import { describe, expect, it } from "vitest";
import { hexToHsl } from "./color";
import {
  aplicarFiltro,
  bloqueTexto,
  capaProteccion,
  encuadre,
  filtroDeMarca,
  filtroFoto,
  peorContraste,
  valoresSvg,
} from "./fotografia";
import { FORMATOS } from "./formatos";

const paleta = { color_marca: hexToHsl("#1f5fa8", true)!, fondo_neutro: hexToHsl("#f3efe6", true)! };
const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a];

describe("filtros por tratamiento", () => {
  it("natural no cambia la foto", () => {
    const f = filtroFoto("natural", paleta);
    expect(f.tipo).toBe("ninguno");
    expect([...aplicarFiltro(px(10, 120, 240), f)]).toEqual(px(10, 120, 240));
    expect(filtroDeMarca({ paleta })).toBeNull();
    expect(filtroDeMarca({ paleta, fotografia: { tratamiento: "natural", intensidad: 1 } })).toBeNull();
  });

  it("la matriz tiene 20 valores y la fila de alfa no cambia", () => {
    for (const t of ["gradacion", "duotono"] as const) {
      const f = filtroFoto(t, paleta, 0.7);
      expect(f.tipo).toBe(t);
      expect(f.valores).toHaveLength(20);
      expect(f.valores.slice(15)).toEqual([0, 0, 0, 1, 0]);
      expect(valoresSvg(f).split(" ")).toHaveLength(20);
    }
  });

  it("intensidad 0 es la identidad", () => {
    expect(filtroFoto("duotono", paleta, 0).tipo).toBe("ninguno");
  });

  it("duotono: el negro va al color de marca oscuro y el blanco al fondo neutro (a intensidad 1)", () => {
    const f = filtroFoto("duotono", paleta, 1);
    const [r, g, b] = aplicarFiltro([...px(0, 0, 0), ...px(255, 255, 255)], f).slice(4, 7);
    const claro = [243, 239, 230];
    expect([r, g, b].every((v, i) => Math.abs(v - claro[i]) <= 2)).toBe(true);
    const negro = aplicarFiltro(px(0, 0, 0), f);
    // La sombra tiene el matiz de la marca (más azul que rojo) y es oscura.
    expect(negro[2]).toBeGreaterThan(negro[0]);
    expect(negro[2]).toBeLessThan(110);
  });

  it("duotono: dos colores con la misma luminancia salen iguales", () => {
    const f = filtroFoto("duotono", paleta, 1);
    const verde = aplicarFiltro(px(0, 140, 0), f); // 0,7152 · 140 ≈ 100
    const gris = aplicarFiltro(px(100, 100, 100), f);
    for (let i = 0; i < 3; i++) expect(Math.abs(verde[i] - gris[i])).toBeLessThanOrEqual(2);
  });

  it("gradación: las luces quedan en el color de marca y todo se acerca a su matiz", () => {
    const f = filtroFoto("gradacion", paleta, 1);
    const blanco = aplicarFiltro(px(255, 255, 255), f);
    const marca = [0x1f, 0x5f, 0xa8];
    expect(blanco.slice(0, 3).every((v, i) => Math.abs(v - marca[i]) <= 3)).toBe(true);
    // A intensidad media queda entre la foto y el color de marca.
    const medio = aplicarFiltro(px(255, 255, 255), filtroFoto("gradacion", paleta, 0.5));
    expect(medio[0]).toBeGreaterThan(blanco[0]);
    expect(medio[0]).toBeLessThan(255);
  });

  it("conserva el alfa", () => {
    expect(aplicarFiltro(px(50, 50, 50, 77), filtroFoto("duotono", paleta, 1))[3]).toBe(77);
  });
});

describe("encuadre con punto focal", () => {
  const imagen = { w: 2000, h: 1000 };
  const destino = { w: 1000, h: 1000 };

  it("cubre siempre la caja de destino", () => {
    for (const foco of [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }, { x: 0.2, y: 0.9 }]) {
      const e = encuadre(foco, imagen, destino);
      expect(e.x).toBeLessThanOrEqual(0);
      expect(e.y).toBeLessThanOrEqual(0);
      expect(e.x + e.w).toBeGreaterThanOrEqual(destino.w);
      expect(e.y + e.h).toBeGreaterThanOrEqual(destino.h);
    }
  });

  it("foco centrado equivale a cover centrado", () => {
    expect(encuadre({ x: 0.5, y: 0.5 }, imagen, destino)).toEqual({ x: -500, y: 0, w: 2000, h: 1000 });
  });

  it("el foco queda en el centro cuando el recorte lo permite, y se corre contra el borde si no", () => {
    // Foco al 75% del ancho: queda en el centro de la caja (x = 500 - 1500).
    const e = encuadre({ x: 0.75, y: 0.5 }, imagen, destino);
    expect(e.x).toBe(-1000);
    expect(e.x + 0.75 * e.w).toBe(destino.w / 2);
    // Foco en la punta: no se puede centrar sin mostrar vacío, la foto queda pegada al borde.
    expect(encuadre({ x: 1, y: 0.5 }, imagen, destino).x).toBe(-1000);
    expect(encuadre({ x: 0, y: 0.5 }, imagen, destino).x).toBe(0);
  });

  it("sin recorte en un eje, ese eje no se mueve", () => {
    const e = encuadre({ x: 0.9, y: 0.1 }, imagen, destino);
    expect(e.y).toBe(0);
  });
});

describe("peor contraste sobre píxeles reales", () => {
  const blanco = { H: 0, S: 0, L: 100 };
  const negro = { H: 0, S: 0, L: 0 };
  const rep = (c: number[], n: number) => Array.from({ length: n }, () => c).flat();

  it("texto blanco sobre negro puro da 21:1 y sobre blanco 1:1", () => {
    expect(peorContraste(rep(px(0, 0, 0), 50), blanco)).toBeCloseTo(21, 0);
    expect(peorContraste(rep(px(255, 255, 255), 50), blanco)).toBeCloseTo(1, 1);
  });

  it("toma la zona peor, no el promedio", () => {
    // 80% oscuro y 20% claro: el texto blanco se pierde en el 20% claro.
    const pixeles = [...rep(px(10, 10, 10), 80), ...rep(px(250, 250, 250), 20)];
    expect(peorContraste(pixeles, blanco)).toBeLessThan(1.2);
    expect(peorContraste(pixeles, negro)).toBeLessThan(1.2);
  });

  it("ignora el ruido bajo el percentil (un píxel suelto no hunde la medida)", () => {
    const pixeles = [...rep(px(10, 10, 10), 99), ...px(250, 250, 250)];
    expect(peorContraste(pixeles, blanco)).toBeGreaterThan(15);
    expect(peorContraste(pixeles, blanco, 0)).toBeLessThan(1.2);
  });

  it("ignora los píxeles transparentes y sin píxeles devuelve 21", () => {
    expect(peorContraste(rep(px(255, 255, 255, 0), 10), blanco)).toBe(21);
  });
});

describe("protección de contraste", () => {
  const f = FORMATOS["4:5"];
  const bloque = bloqueTexto(f, "abajo");

  it("el bloque de texto queda dentro de la zona segura, arriba o abajo", () => {
    const abajo = bloqueTexto(f, "abajo");
    const arriba = bloqueTexto(f, "arriba");
    expect(abajo.y + abajo.h).toBeCloseTo(f.alto * (1 - f.zona.abajo));
    expect(arriba.y).toBeCloseTo(f.alto * f.zona.arriba);
    expect(abajo.x).toBeCloseTo(f.ancho * f.zona.x);
  });

  it("en horizontal el bloque es la columna del mensaje", () => {
    const h = FORMATOS["1200x630"];
    const b = bloqueTexto(h, "abajo");
    expect(b.x + b.w).toBeCloseTo(h.ancho * h.columnaMensaje!);
  });

  it("zona limpia no lleva capa", () => {
    expect(capaProteccion("zona", bloque, f, "abajo")).toBeNull();
  });

  it("placa: rectángulo con aire alrededor del bloque, opaco casi del todo", () => {
    const c = capaProteccion("placa", bloque, f, "abajo")!;
    expect(c.tipo).toBe("placa");
    expect(c.rect.x).toBeLessThan(bloque.x);
    expect(c.rect.y + c.rect.h).toBeGreaterThanOrEqual(bloque.y + bloque.h);
    expect(c.paradas[0][1]).toBeGreaterThan(0.8);
  });

  it("degradado abajo: llega al borde, es opaco en el bloque y transparente al principio", () => {
    const c = capaProteccion("degradado", bloque, f, "abajo")!;
    expect(c.rect.y + c.rect.h).toBe(f.alto);
    expect(c.rect.y).toBeLessThan(bloque.y);
    expect(c.paradas[0]).toEqual([0, 0]);
    expect(c.paradas.at(-1)![1]).toBeGreaterThan(0.8);
    // La parte opaca empieza donde empieza el bloque.
    const opaco = c.paradas.find(([, a]) => a >= 0.8)![0];
    expect(c.rect.y + opaco * c.rect.h).toBeCloseTo(bloque.y, 3);
  });

  it("degradado arriba: nace en el borde superior y se desvanece pasando el bloque", () => {
    const arriba = bloqueTexto(f, "arriba");
    const c = capaProteccion("degradado", arriba, f, "arriba")!;
    expect(c.rect.y).toBe(0);
    expect(c.rect.h).toBeGreaterThan(arriba.y + arriba.h);
    expect(c.eje).toEqual([0, 1, 0, 0]);
  });
});
