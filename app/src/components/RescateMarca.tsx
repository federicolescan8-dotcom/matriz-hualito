"use client";

import { useState } from "react";
import { hslCss, hslToHex } from "@/engine/color";
import type { Marca } from "@/engine/diagnostico";
import { extraerColores } from "@/engine/laboratorio";
import { fallasPaleta } from "@/engine/palette";
import {
  GRADOS_CAMBIO,
  ROLES_RESCATE,
  aplicarCanonicos,
  briefRescate,
  colorCanonico,
  conRescate,
  gruposDeReferencias,
  htmlAntesDespues,
  informeAuditoria,
  masUsado,
  nombreColor,
  rescateInicial,
  type RolRescate,
} from "@/engine/rescate";
import { diferencias } from "@/engine/versiones";
import { descargar, slug } from "@/lib/exportar";
import { pixelesDeImagen } from "@/lib/imagen";
import { PiezaMuestra, textosPara } from "./PiezaMuestra";

// Rescate de marca existente (replanteo, E11): audita los colores que el cliente ya usa, propone un canónico por grupo
// según el grado de cambio y deja el antes y después. El logo y la tipografía los resuelve el diseñador con el brief.

const boton = "rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50";
const ROL_POR_ORDEN: RolRescate[] = ["color_marca", "acento", "tono_apoyo", "secundario_1", "secundario_2"];

const leer = (f: File) =>
  new Promise<string>((ok, fallo) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fallo(r.error);
    r.readAsDataURL(f);
  });

export function RescateMarca({ marca, onChange }: { marca: Marca; onChange: (m: Marca) => void }) {
  const r = marca.identidad.rescate ?? rescateInicial();
  const grupos = r.grupos ?? [];
  const [roles, setRoles] = useState<Record<number, RolRescate>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const informe = informeAuditoria(grupos);
  const rolDe = (i: number): RolRescate => roles[i] ?? ROL_POR_ORDEN[i] ?? "secundario_2";

  async function cargar(files: FileList | null) {
    if (!files?.length) return;
    setCargando(true);
    setError(null);
    try {
      const nuevas = [];
      for (const f of Array.from(files)) {
        const px = await pixelesDeImagen(await leer(f));
        nuevas.push({ nombre: f.name, colores: extraerColores(px, 5) });
      }
      const referencias = [...r.referencias, ...nuevas];
      onChange(conRescate(marca, { referencias, grupos: gruposDeReferencias(referencias) }));
    } catch {
      setError("No se pudo leer alguna de las imágenes.");
    } finally {
      setCargando(false);
    }
  }

  function quitar(i: number) {
    const referencias = r.referencias.filter((_, j) => j !== i);
    onChange(conRescate(marca, { referencias, grupos: gruposDeReferencias(referencias) }));
  }

  const base = slug(marca.nombre) || "marca";
  const antes = r.antes;
  const dif = antes ? diferencias(antes, marca.identidad) : [];
  const textos = textosPara(marca.rubro, marca.diagnostico.contenido);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-neutral-600">
        Para marcas que ya existen: se auditan los colores que circulan, se fija un canónico por grupo y se guía al diseñador para el
        logo y la tipografía.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Grado de cambio</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {GRADOS_CAMBIO.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={r.grado === g.id}
              onClick={() => onChange(conRescate(marca, { grado: g.id }))}
              className={`rounded-md border p-3 text-left text-sm ${r.grado === g.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-300"}`}
            >
              <span className="font-medium">{g.nombre}</span>
              <span className="mt-1 block text-neutral-600">{g.ayuda}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Referencias del cliente</h3>
        <p className="text-sm text-neutral-600">Logos en todas sus versiones, capturas de redes, fotos de cartel, packaging o tarjetas.</p>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={cargando}
          aria-label="Cargar referencias"
          onChange={(e) => {
            void cargar(e.target.files);
            e.target.value = "";
          }}
          className="text-sm"
        />
        {cargando && <p className="text-sm text-neutral-500">Leyendo colores…</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {r.referencias.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {r.referencias.map((x, i) => (
              <li key={`${x.nombre}-${i}`} className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1">
                {x.nombre}
                <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${x.nombre}`} className="text-neutral-500 hover:text-neutral-900">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {grupos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Auditoría de color</h3>
          <ul className="list-disc pl-5 text-sm">
            {informe.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <div className="grid gap-3 md:grid-cols-2">
            {grupos.map((g, i) => {
              const rol = rolDe(i);
              const canonico = colorCanonico(g, r.grado, marca.identidad.paleta, rol);
              const movido = hslToHex(canonico) !== hslToHex(masUsado(g));
              const probado = aplicarCanonicos(marca, [{ grupo: g, rol }]);
              const fallas = rol.startsWith("secundario") ? [] : fallasPaleta(probado.identidad.paleta, rol as never);
              return (
                <div key={i} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-medium capitalize">{nombreColor(masUsado(g))}</span>
                    <span className="ml-auto text-neutral-500">{Math.round(g.peso * 100)}% · {g.fuentes.length} fuente(s)</span>
                  </div>
                  <div className="flex gap-1" aria-label="Tonos que circulan">
                    {g.tonos.map((t, j) => (
                      <span key={j} title={`${hslToHex(t.color).toUpperCase()} · ${Math.round(t.peso * 100)}%`} className="h-8 flex-1 rounded border border-neutral-200" style={{ background: hslCss(t.color) }} />
                    ))}
                  </div>
                  <p>
                    Canónico ({r.grado}):{" "}
                    <span className="inline-block h-3 w-3 rounded-sm border border-neutral-300 align-middle" style={{ background: hslCss(canonico) }} />{" "}
                    <code>{hslToHex(canonico).toUpperCase()}</code>
                    {movido && <span className="text-neutral-500"> (ajustado desde {hslToHex(masUsado(g)).toUpperCase()})</span>}
                  </p>
                  {fallas.length > 0 && (
                    <p className="text-amber-700">Aviso: no cumple {fallas.map((f) => f.control).join(", ")}. Queda como ajuste manual.</p>
                  )}
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Rol del color"
                      value={rol}
                      onChange={(e) => setRoles({ ...roles, [i]: e.target.value as RolRescate })}
                      className="rounded-md border border-neutral-300 px-2 py-1"
                    >
                      {ROLES_RESCATE.map((x) => (
                        <option key={x.id} value={x.id}>{x.nombre}</option>
                      ))}
                    </select>
                    <button type="button" className={boton} onClick={() => onChange(probado)}>
                      Aplicar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Antes y después</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={boton}
            onClick={() => onChange(conRescate(marca, { antes: { ...marca.identidad, rescate: undefined } }))}
          >
            {antes ? "Volver a guardar el antes" : "Guardar el antes"}
          </button>
          <button type="button" className={boton} onClick={() => descargar(new Blob([briefRescate(marca)], { type: "text/markdown" }), `brief-rescate-${base}.md`)}>
            Descargar brief de rescate
          </button>
          <button
            type="button"
            className={boton}
            disabled={!antes}
            onClick={() => descargar(new Blob([htmlAntesDespues(marca)], { type: "text/html" }), `antes-y-despues-${base}.html`)}
          >
            Descargar antes y después (.html)
          </button>
        </div>
        {antes ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {([["Antes", antes], ["Ahora", marca.identidad]] as const).map(([titulo, id]) => (
              <div key={titulo} className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B"] as const).map((modo) => (
                    <PiezaMuestra key={modo} paleta={id.paleta} tipografia={id.tipografia} rubro={marca.rubro} modo={modo} nombre={marca.nombre} logo={id.logo} textos={textos} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Guardá el antes antes de aplicar los canónicos para poder compararlos.</p>
        )}
        {antes && (
          <ul className="list-disc pl-5 text-sm">
            {dif.length ? dif.map((x) => <li key={x}>{x}</li>) : <li>Sin diferencias todavía.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
