import { describe, expect, it } from "vitest";
import { cajaVisible, dataUrlASvg, elegirVersionLogo, monocromoDe, recolorearSvg, svgADataUrl, versionLegible } from "./logo";

describe("recolorearSvg", () => {
  const svg = `<svg viewBox="0 0 10 10"><rect fill="#e30613" stroke="#000"/><path fill="none" style="fill:#0f0;stroke:none"/><circle/></svg>`;

  it("recolorea fill y stroke visibles y respeta none", () => {
    const out = recolorearSvg(svg, "#fff");
    expect(out).toContain('<rect fill="#fff" stroke="#fff"/>');
    expect(out).toContain('fill="none"');
    expect(out).toContain("fill:#fff;stroke:none");
  });

  it("fija el color en la raíz para elementos sin fill", () => {
    expect(recolorearSvg(svg, "#111")).toMatch(/^<svg viewBox="0 0 10 10" fill="#111">/);
  });

  it("ida y vuelta por data URL", () => {
    expect(dataUrlASvg(svgADataUrl(svg))).toBe(svg);
  });
});

describe("elegirVersionLogo", () => {
  const principal = { src: "p", aspecto: 3 };
  const versiones = { horizontal: { src: "h", aspecto: 4 }, vertical: { src: "v", aspecto: 0.6 }, simbolo: { src: "s", aspecto: 1 } };

  it("en un lugar ancho elige el principal u horizontal", () => {
    const e = elegirVersionLogo(principal, versiones, { ancho: 600, alto: 100 })!;
    expect(["principal", "horizontal"]).toContain(e.version);
  });

  it("en un lugar angosto elige vertical o símbolo", () => {
    const e = elegirVersionLogo(principal, versiones, { ancho: 100, alto: 200 })!;
    expect(["vertical", "simbolo"]).toContain(e.version);
    expect(e.version).toBe("vertical");
  });

  it("sin versiones devuelve el principal; sin nada, null", () => {
    expect(elegirVersionLogo(principal, undefined, { ancho: 100, alto: 100 })!.version).toBe("principal");
    expect(elegirVersionLogo(null, {}, { ancho: 100, alto: 100 })).toBeNull();
  });
});

describe("monocromoDe", () => {
  it("recolorea SVG y devuelve null para PNG", () => {
    const src = svgADataUrl('<svg><rect fill="#f00"/></svg>');
    expect(dataUrlASvg(monocromoDe(src, true)!)).toContain("#ffffff");
    expect(dataUrlASvg(monocromoDe(src, false)!)).toContain("#1a1a1a");
    expect(monocromoDe("data:image/png;base64,AAAA", true)).toBeNull();
  });
});

describe("cajaVisible", () => {
  it("centra la imagen contain en una caja más ancha", () => {
    expect(cajaVisible({ x: 0, y: 0, w: 400, h: 100 }, 2)).toEqual({ x: 100, y: 0, w: 200, h: 100 });
  });
  it("centra en vertical en una caja más alta", () => {
    expect(cajaVisible({ x: 10, y: 10, w: 100, h: 200 }, 1)).toEqual({ x: 10, y: 60, w: 100, h: 100 });
  });
});

describe("versión legible del logo (perfilador)", () => {
  const CREMA = { H: 38, S: 30, L: 88 };
  const hay = { mono_claro: true, mono_oscuro: true };
  it("un logo color claro sobre el fondo neutro claro pasa al monocromo oscuro", () => {
    expect(versionLegible("color", CREMA, { H: 38, S: 30, L: 90 }, hay)).toBe("mono_oscuro");
  });
  it("si se lee, queda la versión color", () => {
    expect(versionLegible("color", { H: 0, S: 0, L: 5 }, { H: 38, S: 30, L: 90 }, hay)).toBe("color");
  });
  it("sin monocromo cargado queda la versión pedida (el checklist avisa)", () => {
    expect(versionLegible("color", CREMA, { H: 38, S: 30, L: 90 }, { mono_claro: false, mono_oscuro: false })).toBe("color");
  });
  it("las versiones mono no se tocan", () => {
    expect(versionLegible("mono_claro", CREMA, { H: 0, S: 0, L: 0 }, hay)).toBe("mono_claro");
  });
});
