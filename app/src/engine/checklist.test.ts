import { describe, expect, it } from "vitest";
import { areaCubierta, evaluarPieza, type Medicion } from "./checklist";
import { ajustarColorMarca, construirMarca, diagnosticoVacio, generarChips } from "./diagnostico";
import { aceptarControl, piezaNueva, quitarAceptacion, type Pieza } from "./pieza";
import { pesoH1 } from "./typography";

const d = { ...diagnosticoVacio(), nombre: "Test", personalidad: { tono: "seria" as const, valor: "calma" as const } };
const marca = construirMarca(d, generarChips(d)[0]);

function pieza(p: Partial<Pieza> = {}): Pieza {
  return {
    ...piezaNueva(marca),
    variante: "1",
    modo: "A",
    contenido: { h1: "Tu contabilidad, en orden", body: "Asesoramiento para pymes.", cta: "Agendá una consulta" },
    ...p,
  };
}

// Medición típica de la variante 1 en 4:5, todo dentro de la zona segura (margen 11%).
function medicion(m: Partial<Medicion> = {}): Medicion {
  return {
    h1: { lineas: [{ x: 119, y: 420, w: 700, h: 110 }, { x: 119, y: 530, w: 400, h: 110 }], px: 100, peso: pesoH1("Tu contabilidad, en orden", marca.identidad.tipografia.familia_variable), italica: false },
    body: { lineas: [{ x: 119, y: 680, w: 650, h: 44 }], px: 32, peso: 400, italica: false },
    cta: { lineas: [], caja: { x: 119, y: 1100, w: 380, h: 90 }, px: 34, peso: 600, italica: false },
    logo: { x: 119, y: 149, w: 300, h: 110 },
    forma: null,
    desborde: false,
    ...m,
  };
}

describe("checklist de pieza", () => {
  it("una pieza correcta pasa todos los controles", () => {
    const r = evaluarPieza(marca, pieza(), medicion());
    expect(r.controles.filter((c) => !c.ok)).toEqual([]);
    expect(r.estado).toBe("ok");
  });

  it("rechaza contenido fuera de la zona segura", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ logo: { x: 40, y: 40, w: 300, h: 110 } }));
    expect(r.estado).toBe("rechazado");
    expect(r.controles.find((c) => c.control === "Logo dentro del margen seguro")!.ok).toBe(false);
  });

  it("rechaza un peso de H1 distinto al de la fórmula", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ h1: { ...medicion().h1, peso: 900 } }));
    expect(r.controles.find((c) => c.control === "Peso del H1 según largo")!.ok).toBe(false);
  });

  it("rechaza poco espacio negativo", () => {
    const lleno = Array.from({ length: 15 }, (_, i) => ({ x: 0, y: i * 90, w: 1080, h: 90 }));
    const r = evaluarPieza(marca, pieza(), medicion({ h1: { ...medicion().h1, lineas: lleno } }));
    expect(r.controles.find((c) => c.control === "Espacio negativo")!.ok).toBe(false);
  });

  it("rechaza itálica en el H1 y alineación centrada en la variante 1", () => {
    const r = evaluarPieza(marca, pieza({ alineacion: "centrado" }), medicion({ h1: { ...medicion().h1, italica: true } }));
    const fallidos = r.controles.filter((c) => !c.ok).map((c) => c.control);
    expect(fallidos).toContain("Itálica nunca en H1");
    expect(fallidos).toContain("Alineación del mensaje");
  });

  it("un color ajustado a mano que no cumple se acepta con aviso y no bloquea", () => {
    // El gris más claro que rompe algún contraste solo como aviso (entre 3:1 y 4,5:1); por debajo de 3:1 sería
    // bloqueante (E9).
    const sinAjuste = (L: number) =>
      evaluarPieza({ ...marca, identidad: { ...marca.identidad, paleta: { ...marca.identidad.paleta, fondo_neutro: { H: 0, S: 0, L } } } }, pieza(), medicion());
    const L = [90, 88, 86, 84, 82, 80, 78, 76, 74].find((l) => {
      const r = sinAjuste(l);
      return r.estado === "rechazado" && r.controles.every((c) => c.ok || c.nivel === "aviso");
    })!;
    expect(L).toBeDefined();
    const gris = { H: 0, S: 0, L };
    expect(sinAjuste(L).estado).toBe("rechazado");
    const ajustada = ajustarColorMarca(marca, "fondo_neutro", gris);
    const r = evaluarPieza(ajustada, pieza(), medicion());
    expect(r.estado).toBe("ok");
    const avisos = r.controles.filter((c) => c.aceptado);
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.every((c) => c.bloque === "Color y contraste")).toBe(true);
    // Los demás bloques siguen rechazando.
    expect(evaluarPieza(ajustada, pieza(), medicion({ logo: { x: 40, y: 40, w: 300, h: 110 } })).estado).toBe("rechazado");
  });

  it("con el color heredado sin versión funcional, los contrastes que fallan se aceptan con aviso", () => {
    const dh = { ...d, color_previo_hex: "#0B9EBF" };
    const solo = construirMarca(dh, generarChips(dh).find((c) => c.id === "previo-heredado-solo")!);
    const r = evaluarPieza(solo, pieza(), medicion());
    expect(r.controles.some((c) => c.aceptado)).toBe(true);
    expect(r.estado).toBe("ok");
  });

  it("rechaza un H1 que no llega al doble del body o del CTA", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ h1: { ...medicion().h1, px: 60 } }));
    expect(r.controles.find((c) => c.control.startsWith("Jerarquía"))!.ok).toBe(false);
    expect(evaluarPieza(marca, pieza(), medicion()).controles.find((c) => c.control.startsWith("Jerarquía"))!.ok).toBe(true);
  });

  it("el desborde de texto eleva a revisión manual", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ desborde: true }));
    expect(r.estado).toBe("revision_manual");
  });

  it("la variante 2 no lleva CTA", () => {
    const r = evaluarPieza(marca, pieza({ variante: "2" }), medicion());
    expect(r.estado).toBe("rechazado");
    expect(r.controles.find((c) => c.control === "Variante sin CTA")!.ok).toBe(false);
  });
});

describe("areaCubierta", () => {
  it("mide la fracción cubierta sin contar dos veces las superposiciones", () => {
    const a = { x: 0, y: 0, w: 60, h: 60 };
    expect(areaCubierta([a], 120, 120)).toBeCloseTo(0.25, 2);
    expect(areaCubierta([a, a], 120, 120)).toBeCloseTo(0.25, 2);
  });
});

describe("CTA en Modo A", () => {
  it("un acento claro sobre fondo neutro claro lleva contorno y pasa", async () => {
    const { ctaModoA, controlesCtaModoA, cumple } = await import("./palette");
    const p = marca.identidad.paleta;
    const r = evaluarPieza(marca, pieza(), medicion());
    const modo = ctaModoA(p);
    expect(cumple(controlesCtaModoA(p, modo))).toBe(true);
    expect(r.controles.filter((c) => c.control.startsWith("CTA")).every((c) => c.ok)).toBe(true);
  });
});

describe("reglas por formato", () => {
  it("1:1 rechaza un H1 de más de 2 líneas", () => {
    const tres = [0, 1, 2].map((i) => ({ x: 119, y: 400 + i * 110, w: 700, h: 110 }));
    const r = evaluarPieza(marca, pieza({ formato: "1:1" }), medicion({ h1: { ...medicion().h1, lineas: tres }, logo: { x: 119, y: 119, w: 300, h: 96 }, cta: null, body: null }));
    expect(r.controles.find((c) => c.control.startsWith("H1 en 2 líneas"))!.ok).toBe(false);
  });

  it("Facebook rechaza texto que pasa la mitad del ancho", () => {
    const m = medicion({
      h1: { ...medicion().h1, lineas: [{ x: 120, y: 200, w: 700, h: 80 }] },
      body: null,
      cta: null,
      logo: { x: 120, y: 63, w: 200, h: 60 },
    });
    const r = evaluarPieza(marca, pieza({ formato: "1200x630", canal: "feed_fb" }), m);
    expect(r.controles.find((c) => c.control.startsWith("Mensaje en el 50%"))!.ok).toBe(false);
  });

  it("story exige la zona segura del 15% arriba", () => {
    const m = medicion({ logo: { x: 119, y: 200, w: 300, h: 135 } });
    const r = evaluarPieza(marca, pieza({ formato: "9:16", canal: "stories_ig" }), m);
    expect(r.controles.find((c) => c.control === "Logo dentro del margen seguro")!.ok).toBe(false);
  });

  it("rechaza un texto pisado por otro elemento", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ logo: { x: 119, y: 430, w: 300, h: 110 } }));
    const k = r.controles.find((c) => c.control === "Ningún texto tapado por otro elemento")!;
    expect(k.ok).toBe(false);
    expect(k.detalle).toBe("H1 con logo");
    expect(r.estado).toBe("rechazado");
  });

  it("un roce de las cajas de las letras no cuenta como superposición", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ logo: { x: 119, y: 309, w: 300, h: 112 } }));
    expect(r.controles.find((c) => c.control === "Ningún texto tapado por otro elemento")!.ok).toBe(true);
  });

  it("sugiere recortar el H1 si quedó en su tamaño mínimo, sin bloquear", () => {
    const r = evaluarPieza(marca, pieza(), medicion({ h1: { ...medicion().h1, px: 56 }, body: { ...medicion().body!, px: 26 }, cta: { ...medicion().cta!, px: 24 } }));
    const k = r.controles.find((c) => c.control === "H1 con margen sobre su tamaño mínimo")!;
    expect(k.ok).toBe(true);
    expect(k.aviso).toMatch(/recortar palabras/);
    expect(r.estado).toBe("ok");
  });

  it("sugiere un H1 protagonista de 6 palabras o menos", () => {
    const corto = evaluarPieza(marca, pieza({ variante: "2", contenido: { h1: "Tu tienda online en 7 días", body: null, cta: null } }), medicion({ cta: null }));
    expect(corto.controles.find((c) => c.control.startsWith("H1 protagonista"))!.aviso).toBeUndefined();
    const largo = evaluarPieza(marca, pieza({ variante: "2", contenido: { h1: "Tu tienda online lista y funcionando en solo 7 días", body: null, cta: null } }), medicion({ cta: null }));
    expect(largo.controles.find((c) => c.control.startsWith("H1 protagonista"))!.aviso).toBeDefined();
  });

  it("story: nada debajo de la barra de respuesta (340 px abajo)", () => {
    const story = pieza({ formato: "9:16", canal: "stories_ig" });
    const control = (m: Medicion) => evaluarPieza(marca, story, m).controles.find((c) => c.control.startsWith("Nada tapado por la interfaz"))!;
    // El CTA termina en 1620 px: dentro del viejo 85% (1632), pero debajo de la barra de respuesta (1580).
    const logo = { x: 119, y: 300, w: 300, h: 110 };
    const tapado = control(medicion({ logo, cta: { ...medicion().cta!, caja: { x: 119, y: 1530, w: 380, h: 90 } } }));
    expect(tapado.ok).toBe(false);
    expect(tapado.detalle).toBe("CTA");
    expect(control(medicion({ logo, cta: { ...medicion().cta!, caja: { x: 119, y: 1400, w: 380, h: 90 } } })).ok).toBe(true);
    // Un logo en los primeros 250 px queda bajo la foto de perfil y el nombre.
    expect(control(medicion({ logo: { x: 119, y: 149, w: 300, h: 110 } })).detalle).toBe("logo");
  });

  it("1:1 en el feed: H1 y logo enteros en la grilla 3:4 del perfil", () => {
    const cuadrada = pieza({ formato: "1:1", canal: "feed_ig" });
    const control = (m: Medicion) => evaluarPieza(marca, cuadrada, m).controles.find((c) => c.control.startsWith("Mensaje y logo enteros"))!;
    // Con el margen de 11% (119 px) el H1 cae en los 135 px que recorta la grilla.
    const cortado = control(medicion());
    expect(cortado.ok).toBe(false);
    expect(cortado.detalle).toBe("H1, CTA, logo");
    const dentro = (r: { x: number; y: number; w: number; h: number }) => ({ ...r, x: 151 });
    const m = medicion();
    expect(control({ ...m, h1: { ...m.h1, lineas: m.h1.lineas.map(dentro) }, logo: dentro(m.logo!), cta: { ...m.cta!, caja: dentro(m.cta!.caja) } }).ok).toBe(true);
    // En Facebook no aplica.
    expect(evaluarPieza(marca, pieza({ formato: "1200x630", canal: "feed_fb" }), medicion()).controles.some((c) => c.control.startsWith("Mensaje y logo enteros"))).toBe(false);
  });

  it("2B-L con figura: el choque se mide contra el contorno real de la forma, no contra su caja", () => {
    const p2bl = pieza({ variante: "2B-L", deco: { forma: "blob-1", relleno: "patron", patron: "ondas" } });
    // Un rombo con su caja en x 600-1000: la esquina superior izquierda de la caja queda fuera de la forma.
    const contorno = [{ x: 800, y: 300 }, { x: 1000, y: 700 }, { x: 800, y: 1100 }, { x: 600, y: 700 }];
    const deco = { tipo: "patron" as const, caja: { x: 600, y: 300, w: 400, h: 800 }, opacidad: 0.16, overlay: null, color: marca.identidad.paleta.color_marca, contorno };
    const control = (h1x: number) =>
      evaluarPieza(marca, p2bl, medicion({ deco, body: null, h1: { ...medicion().h1, lineas: [{ x: 119, y: 320, w: h1x - 119, h: 100 }] } })).controles.find((c) => c.control.startsWith("Capa decorativa sin tapar"))!;
    expect(control(660).ok).toBe(true); // dentro de la caja, fuera del rombo
    expect(control(760).ok).toBe(false); // pisa el rombo
  });

  it("contacto con esquinas: la decoración no tapa texto ni logo, y el ícono contrasta con su soporte", () => {
    const p3 = pieza({ variante: "3", decoracion: "esquinas-diagonal", contenido: { h1: "Tu contabilidad, en orden", body: null, cta: null } });
    const base = medicion({ body: null, cta: null, logo: { x: 119, y: 1100, w: 300, h: 100 } });
    const control = (m: Medicion) => evaluarPieza(marca, p3, m).controles.find((c) => c.control.startsWith("Decoración (esquinas"))!;
    expect(control(base).ok).toBe(true);
    // Un logo arriba a la izquierda cae dentro de la curva.
    const tapado = control({ ...base, logo: { x: 119, y: 120, w: 300, h: 100 } });
    expect(tapado.ok).toBe(false);
    expect(tapado.detalle).toBe("logo");
    // Sin decoración compatible (variante 1), el control no aparece.
    expect(evaluarPieza(marca, pieza({ decoracion: "esquinas-diagonal" }), medicion()).controles.some((c) => c.control.startsWith("Decoración"))).toBe(false);
    const soporte = { fondo: marca.identidad.paleta.fondo_neutro, icono: marca.identidad.paleta.color_marca };
    const conSoporte = evaluarPieza(marca, p3, { ...base, contacto: [{ icono: { x: 119, y: 800, w: 58, h: 58 }, texto: { lineas: [{ x: 200, y: 810, w: 300, h: 40 }], px: 30, peso: 400, italica: false }, soporte }] });
    expect(conSoporte.controles.find((c) => c.control === "Íconos sobre su soporte")!.ok).toBe(true);
  });
});


describe("niveles de regla y aceptación con justificación (E9)", () => {
  it("cada control tiene nivel, y la alineación del rubro es sugerencia", () => {
    const r = evaluarPieza(marca, pieza(), medicion());
    expect(r.controles.every((c) => ["bloqueante", "aviso", "sugerencia"].includes(c.nivel))).toBe(true);
    expect(r.controles.find((c) => c.control === "Alineación del mensaje")!.nivel).toBe("sugerencia");
    expect(r.controles.find((c) => c.control === "Un mensaje principal")!.nivel).toBe("bloqueante");
  });

  it("una sugerencia que falla no frena la pieza", () => {
    const r = evaluarPieza(marca, pieza({ alineacion: "centrado" }), medicion());
    const k = r.controles.find((c) => c.control === "Alineación del mensaje")!;
    expect(k.ok).toBe(false);
    expect(r.estado).toBe("ok");
  });

  it("un aviso que falla frena hasta que se acepta con justificación", () => {
    const conCuerpoChico = medicion({ body: { ...medicion().body!, px: 18 } });
    const r0 = evaluarPieza(marca, pieza(), conCuerpoChico);
    const k = r0.controles.find((c) => !c.ok)!;
    expect(k.nivel).toBe("aviso");
    expect(r0.estado).toBe("rechazado");
    const aceptada = aceptarControl(pieza(), k.control, "Pedido del cliente: pieza para imprimir", "estudio");
    const r1 = evaluarPieza(marca, aceptada, conCuerpoChico);
    const k1 = r1.controles.find((c) => c.control === k.control)!;
    expect(k1.aceptado).toBe(true);
    expect(k1.justificacion).toMatchObject({ motivo: "Pedido del cliente: pieza para imprimir", autor: "estudio" });
    expect(r1.estado).toBe("ok");
    expect(evaluarPieza(marca, quitarAceptacion(aceptada, k.control), conCuerpoChico).estado).toBe("rechazado");
  });

  it("un bloqueante no se acepta aunque tenga justificación", () => {
    const sinH1 = { ...pieza(), contenido: { ...pieza().contenido, h1: "" } };
    const aceptada = aceptarControl(sinH1, "Un mensaje principal", "lo quiero así", "estudio");
    const r = evaluarPieza(marca, aceptada, medicion());
    expect(r.controles.find((c) => c.control === "Un mensaje principal")!.aceptado).toBeUndefined();
    expect(r.estado).toBe("rechazado");
  });

  it("un texto bajo 3:1 es bloqueante aunque la paleta tenga ajustes manuales", () => {
    const ajustada = ajustarColorMarca(marca, "fondo_neutro", { H: 0, S: 0, L: 60 });
    const r = evaluarPieza(ajustada, pieza(), medicion());
    const bloqueantes = r.controles.filter((c) => !c.ok && c.nivel === "bloqueante");
    expect(bloqueantes.length).toBeGreaterThan(0);
    expect(bloqueantes.every((c) => !c.aceptado)).toBe(true);
    expect(r.estado).toBe("rechazado");
  });
});
