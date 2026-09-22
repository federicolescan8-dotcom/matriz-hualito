"use client";

import { useState } from "react";
import Link from "next/link";
import { PRESETS } from "@/engine/presets";
import { hslCss } from "@/engine/color";
import { FichaMarca } from "@/components/FichaMarca";
import { borrarMarca, descargarJson, useMarcas } from "@/lib/marcas";

export default function MarcasPage() {
  const marcas = useMarcas();
  const [abierta, setAbierta] = useState<string | null>(null);

  const actual = marcas.find((m) => m.id === abierta);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Marcas</h1>
        <Link href="/" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Nuevo diagnóstico</Link>
      </header>
      {marcas.length === 0 && <p className="text-neutral-600">Todavía no hay marcas guardadas en este navegador.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {marcas.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setAbierta(m.id === abierta ? null : m.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${m.id === abierta ? "border-neutral-900" : "border-neutral-200"}`}
            >
              <span className="flex overflow-hidden rounded">
                {[m.paleta.color_marca, m.paleta.tono_apoyo, m.paleta.fondo_neutro, m.paleta.acento].map((c, i) => (
                  <span key={i} className="h-8 w-5" style={{ background: hslCss(c) }} />
                ))}
              </span>
              <span className="flex flex-col">
                <span className="font-medium">{m.nombre}</span>
                <span className="text-xs text-neutral-500">{PRESETS[m.rubro].nombre} · {m.tipografia.familia_variable}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {actual && (
        <section className="flex flex-col gap-4 border-t border-neutral-200 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-xl font-semibold">{actual.nombre}</h2>
            <button type="button" onClick={() => descargarJson(actual)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Exportar JSON</button>
            <button
              type="button"
              onClick={() => {
                if (!confirm(`¿Borrar la marca ${actual.nombre}?`)) return;
                borrarMarca(actual.id);
                setAbierta(null);
              }}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Borrar
            </button>
          </div>
          <FichaMarca marca={actual} />
        </section>
      )}
    </div>
  );
}
