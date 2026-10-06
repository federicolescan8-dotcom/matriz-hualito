"use client";

import { useId, useState } from "react";
import type { Marca } from "@/engine/diagnostico";
import { DIRECCION_DE_ARTE, filtroFoto, FOTOGRAFIA_POR_DEFECTO, TRATAMIENTOS, type Tratamiento } from "@/engine/fotografia";
import { MUESTRA_GENERADA, reducirFoto } from "@/lib/imagen";
import { FiltroSvg } from "./Graficos";

/**
 * Identidad › Fotografía (E6): el tratamiento propio de la marca, visto sobre una foto de ejemplo (una foto que se
 * carga acá para probar o, si no, una muestra generada), y la guía de dirección de arte. El filtro es el mismo que
 * usan las piezas.
 */
export function TratamientoFoto({ marca, onChange }: { marca: Marca; onChange?: (m: Marca) => void }) {
  const actual = marca.identidad.fotografia ?? FOTOGRAFIA_POR_DEFECTO;
  const [ejemplo, setEjemplo] = useState<string | null>(null);
  const foto = ejemplo ?? MUESTRA_GENERADA;
  const guardar = (f: Partial<typeof actual>) =>
    onChange?.({ ...marca, identidad: { ...marca.identidad, fotografia: { ...FOTOGRAFIA_POR_DEFECTO, ...marca.identidad.fotografia, ...f } } });

  return (
    <div className="mt-4 flex flex-col gap-3" data-slot="tratamiento-foto">
      <h3 className="text-sm font-medium">Tratamiento de las fotos</h3>
      <p className="text-xs text-neutral-500">Todas las fotos de la marca salen con el mismo tratamiento, en todas las piezas.</p>
      <div className="grid grid-cols-3 gap-2">
        {TRATAMIENTOS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!onChange}
            title={t.descripcion}
            onClick={() => guardar({ tratamiento: t.id })}
            className={`flex flex-col gap-1 rounded-lg border p-1.5 text-left text-xs ${actual.tratamiento === t.id ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-300"}`}
          >
            <Vista foto={foto} tratamiento={t.id} marca={marca} intensidad={actual.intensidad} />
            <span className="font-medium">{t.nombre}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">{TRATAMIENTOS.find((t) => t.id === actual.tratamiento)!.descripcion}</p>
      {actual.tratamiento !== "natural" && (
        <label className="flex items-center gap-2 text-xs">
          Intensidad
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={actual.intensidad}
            disabled={!onChange}
            onChange={(e) => guardar({ intensidad: Number(e.target.value) })}
          />
          {Math.round(actual.intensidad * 100)}%
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-neutral-600">
        Probar con una foto de la marca (no se guarda)
        <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEjemplo(await reducirFoto(f, 600)); }} />
      </label>

      <h3 className="text-sm font-medium">Dirección de arte</h3>
      <ul className="flex flex-col gap-1.5 text-xs" data-slot="direccion-arte">
        {DIRECCION_DE_ARTE.map((d) => (
          <li key={d.tema}>
            <span className="font-medium">{d.tema}.</span> Sí: {d.si} No: {d.no}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Vista({ foto, tratamiento, marca, intensidad }: { foto: string; tratamiento: Tratamiento; marca: Marca; intensidad: number }) {
  const id = `t${useId().replace(/:/g, "")}`;
  const filtro = tratamiento === "natural" ? null : filtroFoto(tratamiento, marca.identidad.paleta, intensidad);
  return (
    <svg viewBox="0 0 150 100" className="block w-full rounded">
      <defs>
        <FiltroSvg id={id} filtro={filtro} />
      </defs>
      <image href={foto} x="0" y="0" width="150" height="100" preserveAspectRatio="xMidYMid slice" filter={filtro ? `url(#${id})` : undefined} />
    </svg>
  );
}
