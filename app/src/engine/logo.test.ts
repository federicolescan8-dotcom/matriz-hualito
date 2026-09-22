import { describe, expect, it } from "vitest";
import { dataUrlASvg, recolorearSvg, svgADataUrl } from "./logo";

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
