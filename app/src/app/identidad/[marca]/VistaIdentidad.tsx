"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Marca } from "@/engine/diagnostico";
import { PRESETS } from "@/engine/presets";
import { IdentidadMarca, SECCIONES_IDENTIDAD } from "@/components/IdentidadMarca";
import { elegirMarcaActiva, guardarMarca, useMarcaActiva, useMarcas } from "@/lib/marcas";

export function VistaIdentidad({ id }: { id: string }) {
  const marcas = useMarcas();
  const activa = useMarcaActiva();
  const guardada = marcas.find((m) => m.id === id);
  // Cambios sin confirmar de la identidad: no llegan a Publicaciones hasta confirmarlos.
  const [borrador, setBorrador] = useState<Marca | null>(null);
  const actual = borrador && borrador.id === id ? borrador : guardada;
  const sinGuardar = actual != null && actual !== guardada;

  // Abrir la identidad de una marca la vuelve la marca activa, igual que abrirla en Marcas.
  useEffect(() => {
    if (guardada && activa !== guardada.id) elegirMarcaActiva(guardada.id);
  }, [guardada, activa]);

  if (!actual) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Identidad</h1>
        <p className="mb-6 text-neutral-600">No se encontró la marca. Puede que esté guardada en otro navegador o que se haya borrado.</p>
        <Link href="/marcas" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Ver marcas</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex flex-col">
            <h1 className="text-2xl font-semibold">Identidad · {actual.nombre}</h1>
            <span className="text-xs text-neutral-500">
              {PRESETS[actual.rubro].nombre} · <Link href="/marcas" className="underline">datos de la marca</Link>
            </span>
          </div>
          {sinGuardar && (
            <>
              <span className="text-sm text-amber-800">Cambios sin confirmar · se aplican en Publicaciones al confirmar</span>
              <button type="button" onClick={() => setBorrador(null)} className="text-sm underline">Descartar</button>
              <button
                type="button"
                onClick={async () => {
                  if (await guardarMarca(actual)) setBorrador(null);
                }}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
              >
                Confirmar cambios
              </button>
            </>
          )}
          <Link
            href="/publicar"
            className={`rounded-md px-4 py-2 text-sm ${sinGuardar ? "pointer-events-none border border-neutral-200 text-neutral-400" : "border border-neutral-300"}`}
            title={sinGuardar ? "Confirmá o descartá los cambios antes de publicar" : undefined}
          >
            Publicar con esta identidad
          </Link>
        </div>
        <nav aria-label="Secciones de la identidad" className="flex flex-wrap gap-4 text-sm">
          {SECCIONES_IDENTIDAD.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-neutral-500 hover:text-neutral-900">
              {s.titulo}
            </a>
          ))}
        </nav>
      </div>
      <IdentidadMarca key={actual.id} marca={actual} onChange={setBorrador} />
    </div>
  );
}
