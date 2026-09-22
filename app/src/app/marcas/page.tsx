"use client";

import { useState } from "react";
import Link from "next/link";
import { PRESETS } from "@/engine/presets";
import { hslCss } from "@/engine/color";
import { FichaMarca } from "@/components/FichaMarca";
import type { Marca } from "@/engine/diagnostico";
import { borrarMarca, descargarJson, guardarMarca, importarDelNavegador, marcasDelNavegador, useErrorMarcas, useMarcas } from "@/lib/marcas";
import { usaSupabase } from "@/lib/supabase";

export default function MarcasPage() {
  const marcas = useMarcas();
  const error = useErrorMarcas();
  const [importacion, setImportacion] = useState<string | null>(null);
  const pendientesImportar = usaSupabase ? marcasDelNavegador().filter((l) => !marcas.some((m) => m.id === l.id)) : [];
  const [abierta, setAbierta] = useState<string | null>(null);
  // Cambios sin guardar de la marca abierta (ajustes de paleta).
  const [borrador, setBorrador] = useState<Marca | null>(null);

  const guardada = marcas.find((m) => m.id === abierta);
  const actual = borrador && borrador.id === abierta ? borrador : guardada;
  const sinGuardar = actual != null && actual !== guardada;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Marcas</h1>
        <Link href="/" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Nuevo diagnóstico</Link>
      </header>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {pendientesImportar.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Hay {pendientesImportar.length} marca(s) guardadas solo en este navegador.
          <button
            type="button"
            onClick={async () => {
              const r = await importarDelNavegador();
              setImportacion(`Se subieron ${r.subidas} marca(s)${r.fallidas ? `; fallaron ${r.fallidas}` : ""}.`);
            }}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-white"
          >
            Subirlas a la base
          </button>
        </div>
      )}
      {importacion && <p className="text-sm text-emerald-800">{importacion}</p>}
      {marcas.length === 0 && (
        <p className="text-neutral-600">
          {usaSupabase ? "Todavía no hay marcas en la base de tu organización." : "Todavía no hay marcas guardadas en este navegador."}
        </p>
      )}
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
            {sinGuardar && (
              <>
                <span className="text-sm text-amber-800">Cambios sin guardar</span>
                <button type="button" onClick={() => setBorrador(null)} className="text-sm underline">Descartar</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (await guardarMarca(actual)) setBorrador(null);
                  }}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
                >
                  Guardar cambios
                </button>
              </>
            )}
            <button type="button" onClick={() => descargarJson(actual)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Exportar JSON</button>
            <button
              type="button"
              onClick={() => {
                if (!confirm(`¿Borrar la marca ${actual.nombre}?`)) return;
                void borrarMarca(actual.id);
                setAbierta(null);
              }}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Borrar
            </button>
          </div>
          <FichaMarca key={actual.id} marca={actual} onChange={setBorrador} />
        </section>
      )}
    </div>
  );
}
