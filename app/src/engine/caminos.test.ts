import { describe, expect, it } from "vitest";
import { distanciaH, hexToHsl } from "./color";
import { diagnosticoVacio, generarChips, type Diagnostico } from "./diagnostico";
import { ejesSemilla } from "./ejes";
import { distanciaCamino, generarCaminos, marcaDeCamino, sonDistintos } from "./caminos";
import { enBandaProhibida } from "./palette";
import { RUBROS } from "./presets";

const base = (rubro: Diagnostico["rubro"] = "servicios"): Diagnostico => ({ ...diagnosticoVacio(), nombre: "Marca", rubro, ejes: ejesSemilla(rubro) });

describe("caminos (E5)", () => {
  it("genera n caminos, de 1 a 3, sin repetir", () => {
    expect(generarCaminos(base(), 3)).toHaveLength(3);
    expect(generarCaminos(base(), 2)).toHaveLength(2);
    expect(new Set(generarCaminos(base()).map((c) => c.id)).size).toBe(3);
  });

  it("es determinista", () => {
    const a = generarCaminos(base("gastronomia"));
    const b = generarCaminos(base("gastronomia"));
    expect(a.map((c) => [c.id, c.chip.H, c.tipografia, c.forma.d])).toEqual(b.map((c) => [c.id, c.chip.H, c.tipografia, c.forma.d]));
  });

  it("los caminos difieren en matiz o en familia, en todos los rubros", () => {
    for (const rubro of RUBROS) {
      const cs = generarCaminos(base(rubro));
      for (let i = 0; i < cs.length; i++)
        for (let j = i + 1; j < cs.length; j++) {
          expect(sonDistintos(cs[i], cs[j])).toBe(true);
          expect(distanciaCamino(cs[i], cs[j])).toBeGreaterThan(0.1);
        }
    }
  });

  it("respetan la banda prohibida y la competencia", () => {
    const d = { ...base(), excluido_H: 200, competencia: [hexToHsl("#e30613")!, hexToHsl("#0057b8")!] };
    for (const c of generarCaminos(d)) {
      expect(enBandaProhibida(c.chip.H, 200)).toBe(false);
      for (const comp of d.competencia) expect(distanciaH(c.chip.H, comp.H)).toBeGreaterThan(25);
    }
  });

  it("con moodboard, un camino sale de su color dominante", () => {
    const verde = { H: 150, S: 60, L: 45 };
    const d = { ...base(), moodboard: [{ color: { H: 0, S: 0, L: 50 }, peso: 0.7 }, { color: verde, peso: 0.3 }] };
    const cs = generarCaminos(d);
    const m = cs.find((c) => c.id === "moodboard")!;
    expect(m).toBeDefined();
    expect(distanciaH(m.chip.H, verde.H)).toBeLessThanOrEqual(40);
    expect(cs.every((c) => sonDistintos(m, c) || c === m)).toBe(true);
    expect(generarCaminos(d, 2).map((c) => c.id)).toEqual(["fiel", "moodboard"]);
  });

  it("marcaDeCamino arma una marca válida con el par y la forma del camino", () => {
    const d = base("belleza");
    for (const c of generarCaminos(d)) {
      const m = marcaDeCamino(d, c);
      expect(c.chip.resultado.estado).toBe("ok");
      expect(m.identidad.paleta).toBeTruthy();
      expect(m.identidad.tipografia).toEqual(c.tipografia);
      expect(m.identidad.recursos?.formas).toEqual([c.forma]);
      expect(m.diagnostico.ejes).toEqual(c.ejes);
      expect(m.diagnostico.matiz_elegido).toBe(c.chip.H);
    }
  });

  it("la competencia también corre los chips del diagnóstico", () => {
    const d = { ...base(), competencia: [{ H: 220, S: 80, L: 50 }] };
    for (const c of generarChips(d).filter((x) => x.id.startsWith("rango-"))) expect(distanciaH(c.H, 220)).toBeGreaterThan(25);
  });
});
