"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Marca } from "@/engine/diagnostico";
import { PRESETS } from "@/engine/presets";
import { IdentidadMarca, SECCIONES_IDENTIDAD } from "@/components/IdentidadMarca";
import { PanelVersiones } from "@/components/PanelVersiones";
import { deshacer, deshacerNuevo, registrarPaso, rehacer, type Deshacer } from "@/engine/versiones";
import { elegirMarcaActiva, guardarMarca, useMarcaActiva, useMarcas } from "@/lib/marcas";
import { useSesion } from "@/lib/sesion";
import { descargarKit, descargarManual } from "@/lib/kit";

export function VistaIdentidad({ id }: { id: string }) {
  const marcas = useMarcas();
  const activa = useMarcaActiva();
  const guardada = marcas.find((m) => m.id === id);
  const sesion = useSesion();
  const autor = sesion.estado === "conectado" ? sesion.email : "estudio (modo local)";
  // Cambios sin confirmar de la identidad, con deshacer y rehacer (E13): no llegan a Publicaciones hasta confirmarlos.
  const [historia, setHistoria] = useState<Deshacer<Marca> | null>(null);
  const borrador = historia ? historia.pasos[historia.pos] : null;
  const actual = borrador && borrador.id === id ? borrador : guardada;
  const sinGuardar = actual != null && actual !== guardada;
  const cambiar = (m: Marca) => setHistoria((h) => registrarPaso(h ?? deshacerNuevo(guardada ?? m), m));
  const puedeDeshacer = !!historia && historia.pos > 0;
  const puedeRehacer = !!historia && historia.pos < historia.pasos.length - 1;
  const guardar = async (m: Marca) => {
    if (await guardarMarca(m)) setHistoria(null);
  };

  // Entregables (E8): el manual en PDF y el kit en ZIP. Un solo botón trabaja a la vez.
  const [generando, setGenerando] = useState<"manual" | "kit" | null>(null);
  const [errorEntrega, setErrorEntrega] = useState<string | null>(null);
  const entregar = async (cual: "manual" | "kit", tarea: () => Promise<string | null>) => {
    setGenerando(cual);
    setErrorEntrega(null);
    try {
      setErrorEntrega(await tarea());
    } catch (e) {
      setErrorEntrega((e as Error).message);
    } finally {
      setGenerando(null);
    }
  };

  // Ctrl+Z / Ctrl+Shift+Z (o Cmd en Mac), salvo mientras se escribe en un campo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      setHistoria((h) => (h ? (e.shiftKey ? rehacer(h) : deshacer(h)) : h));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

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
          {historia && (
            <span className="flex overflow-hidden rounded-md border border-neutral-300 text-sm">
              <button type="button" disabled={!puedeDeshacer} onClick={() => setHistoria(deshacer(historia))} title="Deshacer (Ctrl+Z)" className="px-3 py-1.5 disabled:opacity-30">
                ↶
              </button>
              <button type="button" disabled={!puedeRehacer} onClick={() => setHistoria(rehacer(historia))} title="Rehacer (Ctrl+Shift+Z)" className="border-l border-neutral-300 px-3 py-1.5 disabled:opacity-30">
                ↷
              </button>
            </span>
          )}
          {sinGuardar && (
            <>
              <span className="text-sm text-amber-800">Cambios sin confirmar · se aplican en Publicaciones al confirmar</span>
              <button type="button" onClick={() => setHistoria(null)} className="text-sm underline">Descartar</button>
              <button
                type="button"
                onClick={() => void guardar(actual)}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
              >
                Confirmar cambios
              </button>
            </>
          )}
          <button type="button" disabled={!!generando} onClick={() => void entregar("manual", () => descargarManual(actual))} className="rounded-md border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50" title="Usa la versión aprobada de la identidad, si hay">
            {generando === "manual" ? "Generando PDF…" : "Descargar manual de marca (PDF)"}
          </button>
          <button type="button" disabled={!!generando} onClick={() => void entregar("kit", () => descargarKit(actual).then(() => null))} className="rounded-md border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50" title="Usa la versión aprobada de la identidad, si hay">
            {generando === "kit" ? "Armando kit…" : "Descargar kit (ZIP)"}
          </button>
          <Link
            href="/publicar"
            className={`rounded-md px-4 py-2 text-sm ${sinGuardar ? "pointer-events-none border border-neutral-200 text-neutral-400" : "border border-neutral-300"}`}
            title={sinGuardar ? "Confirmá o descartá los cambios antes de publicar" : undefined}
          >
            Publicar con esta identidad
          </Link>
        </div>
        {errorEntrega && <p role="alert" className="text-sm text-red-700">{errorEntrega}</p>}
        <nav aria-label="Secciones de la identidad" className="flex flex-wrap gap-4 text-sm">
          {SECCIONES_IDENTIDAD.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-neutral-500 hover:text-neutral-900">
              {s.titulo}
            </a>
          ))}
        </nav>
      </div>
      <PanelVersiones marca={actual} autor={autor} sinGuardar={sinGuardar} onGuardar={(m) => void guardar(m)} onRestaurar={cambiar} />
      <IdentidadMarca key={actual.id} marca={actual} onChange={cambiar} />
    </div>
  );
}
