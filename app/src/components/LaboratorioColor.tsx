"use client";

import { useState } from "react";
import { hexToHsl, hslCss, hslToHex, type HSL } from "@/engine/color";
import { ajustarColorMarca, aplicarAlternativa, valorDiagnostico, type Marca } from "@/engine/diagnostico";
import {
  ARMONIAS,
  confusionesDaltonismo,
  extraerColores,
  paletaExtendida,
  regenerarPaleta,
  type Armonia,
  type Daltonismo,
} from "@/engine/laboratorio";
import type { RolPaleta } from "@/engine/palette";
import { pixelesDeImagen } from "@/lib/imagen";
import { PiezaMuestra, textosPara } from "./PiezaMuestra";

// Laboratorio de color (replanteo, E3): para explorar en vivo con el cliente. El validador acompaña sin frenar: lo que
// no cumple queda como aviso, con la sugerencia del color válido más cercano debajo de cada color.

const BLOQUEABLES: { rol: RolPaleta; nombre: string }[] = [
  { rol: "color_marca", nombre: "Marca" },
  { rol: "tono_apoyo", nombre: "Apoyo" },
  { rol: "fondo_neutro", nombre: "Fondo" },
  { rol: "acento", nombre: "Acento" },
];

export const VISIONES: { id: Daltonismo | null; nombre: string }[] = [
  { id: null, nombre: "Visión típica" },
  { id: "protanopia", nombre: "Protanopía" },
  { id: "deuteranopia", nombre: "Deuteranopía" },
  { id: "tritanopia", nombre: "Tritanopía" },
];

const NOMBRE_DALTONISMO: Record<Daltonismo, string> = { protanopia: "protanopía", deuteranopia: "deuteranopía", tritanopia: "tritanopía" };

/** EyeDropper es de Chromium; donde no existe, el botón no aparece. */
type ConCuentagotas = { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } };

export function LaboratorioColor({
  marca,
  onChange,
  vision,
  onVision,
}: {
  marca: Marca;
  onChange: (m: Marca) => void;
  vision: Daltonismo | null;
  onVision: (v: Daltonismo | null) => void;
}) {
  const p = marca.identidad.paleta;
  const [bloqueados, setBloqueados] = useState<RolPaleta[]>(["color_marca"]);
  const [semilla, setSemilla] = useState<number | null>(null);
  const [armonia, setArmonia] = useState<Armonia>(marca.identidad.paleta_extendida?.armonia ?? "analoga");
  const [extraidos, setExtraidos] = useState<{ color: HSL; peso: number }[] | null>(null);
  const textos = textosPara(marca.rubro, marca.diagnostico.contenido);
  const alternativas =
    semilla == null
      ? []
      : regenerarPaleta(p, bloqueados, { rubro: marca.rubro, valor: valorDiagnostico(marca.diagnostico), excluido_H: marca.diagnostico.excluido_H, solo_heredado: marca.identidad.color.solo_heredado }, semilla);
  const extendida = paletaExtendida(p, armonia);
  const guardada = marca.identidad.paleta_extendida;
  const confusiones = confusionesDaltonismo(p);
  const cuentagotas = typeof window !== "undefined" && (window as unknown as ConCuentagotas).EyeDropper;

  async function extraerDe(src: string) {
    setExtraidos(extraerColores(await pixelesDeImagen(src)));
  }
  const usar = (rol: RolPaleta, color: HSL) => onChange(ajustarColorMarca(marca, rol, color));

  return (
    <div className="flex flex-col gap-6 rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-medium">Laboratorio de color</h3>
        <span className="text-xs text-neutral-500">Para probar en vivo. Nada se guarda hasta confirmar los cambios.</span>
      </div>

      {/* Bloquear y regenerar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">Bloquear</span>
          {BLOQUEABLES.map(({ rol, nombre }) => (
            <label key={rol} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={bloqueados.includes(rol)}
                onChange={(e) => setBloqueados(e.target.checked ? [...bloqueados, rol] : bloqueados.filter((r) => r !== rol))}
              />
              <span className="h-4 w-4 rounded-sm border border-black/10" style={{ background: hslCss(p[rol] as HSL) }} />
              {nombre}
            </label>
          ))}
          <button type="button" onClick={() => setSemilla((s) => (s ?? 0) + 1)} className="ml-auto rounded-md bg-neutral-900 px-3 py-1.5 text-white">
            {semilla == null ? "Ver otras opciones" : "Otras opciones"}
          </button>
        </div>
        {alternativas.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {alternativas.map((a, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-2">
                <div className="grid grid-cols-2 gap-1">
                  <PiezaMuestra paleta={a.paleta} tipografia={marca.identidad.tipografia} rubro={marca.rubro} modo="A" nombre={marca.nombre} logo={marca.identidad.logo} textos={textos} />
                  <PiezaMuestra paleta={a.paleta} tipografia={marca.identidad.tipografia} rubro={marca.rubro} modo="B" nombre={marca.nombre} logo={marca.identidad.logo} textos={textos} />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {a.fallas ? <span className="text-amber-700">{a.fallas} aviso{a.fallas === 1 ? "" : "s"}</span> : <span className="text-emerald-700">Cumple</span>}
                  <button type="button" onClick={() => onChange(aplicarAlternativa(marca, a))} className="ml-auto rounded bg-neutral-900 px-2 py-1 text-white">
                    Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extraer colores */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">Tomar colores de</span>
          {marca.identidad.logo.color && (
            <button type="button" onClick={() => void extraerDe(marca.identidad.logo.color!)} className="rounded-md border border-neutral-300 px-3 py-1.5">
              el logo
            </button>
          )}
          <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5">
            una foto o referencia
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await extraerDe(URL.createObjectURL(f));
              }}
            />
          </label>
          {cuentagotas && (
            <button
              type="button"
              onClick={async () => {
                const r = await new (window as unknown as Required<ConCuentagotas>).EyeDropper().open().catch(() => null);
                const c = r && hexToHsl(r.sRGBHex, true);
                if (c) setExtraidos([{ color: c, peso: 1 }, ...(extraidos ?? [])]);
              }}
              className="rounded-md border border-neutral-300 px-3 py-1.5"
            >
              la pantalla (cuentagotas)
            </button>
          )}
        </div>
        {extraidos && (
          extraidos.length ? (
            <div className="flex flex-wrap gap-3">
              {extraidos.map(({ color, peso }, i) => (
                <div key={i} className="flex flex-col items-center gap-1 text-xs">
                  <span className="h-10 w-14 rounded border border-black/10" style={{ background: hslCss(color) }} title={`${Math.round(peso * 100)}%`} />
                  <span className="font-mono">{hslToHex(color).toUpperCase()}</span>
                  <span className="flex gap-1">
                    <button type="button" onClick={() => usar("color_marca", color)} className="underline">marca</button>
                    <button type="button" onClick={() => usar("acento", color)} className="underline">acento</button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-neutral-500">No se encontraron colores (la imagen es blanca, negra o transparente).</span>
          )
        )}
      </div>

      {/* Paleta extendida */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">Paleta extendida</span>
          <select value={armonia} onChange={(e) => setArmonia(e.target.value as Armonia)} className="rounded-md border border-neutral-300 px-2 py-1.5">
            {ARMONIAS.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange({ ...marca, identidad: { ...marca.identidad, paleta_extendida: extendida } })}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-white"
          >
            {guardada ? "Reemplazar" : "Sumar a la identidad"}
          </button>
          {guardada && (
            <button
              type="button"
              onClick={() => {
                const { paleta_extendida: _, ...resto } = marca.identidad; // eslint-disable-line @typescript-eslint/no-unused-vars
                onChange({ ...marca, identidad: resto });
              }}
              className="text-xs underline"
            >
              Quitar la extendida
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {[...extendida.secundarios.map((s, i) => ({ nombre: `Secundario ${i + 1}`, color: s.color, nota: s.texto ? "masa y texto" : "solo masa, nunca texto" })), { nombre: "Neutro oscuro", color: extendida.neutro_oscuro, nota: "texto largo y fondos oscuros" }].map((x) => (
            <div key={x.nombre} className="flex flex-col gap-1 text-xs">
              <span className="h-10 w-24 rounded border border-black/10" style={{ background: hslCss(x.color) }} />
              <span className="font-medium">{x.nombre}</span>
              <span className="font-mono">{hslToHex(x.color).toUpperCase()}</span>
              <span className="text-neutral-500">{x.nota}</span>
            </div>
          ))}
        </div>
        {guardada && guardada.armonia !== armonia && (
          <span className="text-xs text-neutral-500">La identidad tiene guardada la armonía {ARMONIAS.find((a) => a.id === guardada.armonia)!.nombre.toLowerCase()}.</span>
        )}
        <span className="text-xs text-neutral-500">En Publicaciones, las decoraciones de plantilla pueden ir en un secundario.</span>
      </div>

      {/* Daltonismo */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">Ver la identidad como</span>
          <div className="flex overflow-hidden rounded-md border border-neutral-300 text-xs">
            {VISIONES.map((v) => (
              <button key={v.nombre} type="button" onClick={() => onVision(v.id)} className={`px-3 py-1.5 ${vision === v.id ? "bg-neutral-900 text-white" : "bg-white"}`}>
                {v.nombre}
              </button>
            ))}
          </div>
        </div>
        {confusiones.length > 0 ? (
          <ul className="list-disc pl-5 text-xs text-amber-800">
            {confusiones.map((c) => (
              <li key={`${c.tipo}-${c.par}`}>
                Con {NOMBRE_DALTONISMO[c.tipo]}, {c.par} se confunden (ΔE {c.delta.toFixed(0)}). Si es el CTA, conviene separarlos por luminosidad.
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-emerald-700">Ningún par clave de la paleta se confunde con los tres tipos de daltonismo.</span>
        )}
      </div>
    </div>
  );
}
