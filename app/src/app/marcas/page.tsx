"use client";

import { useState } from "react";
import Link from "next/link";
import { PRESETS } from "@/engine/presets";
import { EJES } from "@/engine/ejes";
import { ESTADOS_MARCA, estadoMarca, type EstadoMarca } from "@/engine/versiones";
import { hslCss } from "@/engine/color";
import type { Marca } from "@/engine/diagnostico";
import { borrarMarca, descargarJson, elegirMarcaActiva, guardarMarca, importarDelNavegador, marcasDelNavegador, useErrorMarcas, useMarcaActiva, useMarcas } from "@/lib/marcas";
import { usaSupabase } from "@/lib/supabase";

// Paso 1 del proceso (replanteo, E1): la marca y sus datos. El sistema visual se edita en Identidad.

export default function MarcasPage() {
  const marcas = useMarcas();
  const error = useErrorMarcas();
  const activa = useMarcaActiva();
  const [importacion, setImportacion] = useState<string | null>(null);
  const pendientesImportar = usaSupabase ? marcasDelNavegador().filter((l) => !marcas.some((m) => m.id === l.id)) : [];
  const actual = marcas.find((m) => m.id === activa) ?? null;

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
              onClick={() => elegirMarcaActiva(m.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${m.id === actual?.id ? "border-neutral-900" : "border-neutral-200"}`}
            >
              <span className="flex overflow-hidden rounded">
                {[m.identidad.paleta.color_marca, m.identidad.paleta.tono_apoyo, m.identidad.paleta.fondo_neutro, m.identidad.paleta.acento].map((c, i) => (
                  <span key={i} className="h-8 w-5" style={{ background: hslCss(c) }} />
                ))}
              </span>
              <span className="flex flex-col">
                <span className="font-medium">{m.nombre}</span>
                <span className="text-xs text-neutral-500">{PRESETS[m.rubro].nombre} · {m.identidad.tipografia.familia_variable}</span>
                <span className="mt-1 self-start rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">
                  {ESTADOS_MARCA.find((e) => e.id === estadoMarca(m))!.nombre}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {actual && (
        <section className="flex flex-col gap-4 border-t border-neutral-200 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-xl font-semibold">{actual.nombre}</h2>
            <label className="flex items-center gap-2 text-sm">
              Estado
              <select
                value={estadoMarca(actual)}
                onChange={(e) => void guardarMarca({ ...actual, estado: e.target.value as EstadoMarca })}
                className="rounded-md border border-neutral-300 px-2 py-1.5"
              >
                {ESTADOS_MARCA.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </label>
            <Link href={`/?editar=${actual.id}`} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
              Editar diagnóstico
            </Link>
            <Link href={`/identidad/${actual.id}`} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
              Ver identidad
            </Link>
            <Link href="/publicar" className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
              Publicar con esta marca
            </Link>
            <button type="button" onClick={() => descargarJson(actual)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Exportar JSON</button>
            <button
              type="button"
              onClick={() => {
                if (!confirm(`¿Borrar la marca ${actual.nombre}?`)) return;
                void borrarMarca(actual.id);
              }}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Borrar
            </button>
          </div>
          <DatosMarca marca={actual} />
        </section>
      )}
    </div>
  );
}

/** Datos de la marca: las respuestas del diagnóstico, sin el sistema visual (que vive en la identidad). */
function DatosMarca({ marca }: { marca: Marca }) {
  const d = marca.diagnostico;
  const filas: [string, React.ReactNode][] = [
    [
      "Rubro",
      [d.rubro_libre, PRESETS[marca.rubro].nombre + (d.rubro_secundario ? ` + ${PRESETS[d.rubro_secundario].nombre}` : "")].filter(Boolean).join(" · base: "),
    ],
    [
      "Personalidad",
      <span key="ejes" className="flex flex-col gap-0.5">
        {EJES.map((e) => (
          <span key={e.id} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-right text-neutral-500">{e.izquierda}</span>
            <span className="relative h-1.5 w-32 rounded bg-neutral-200">
              <span className="absolute -top-0.5 h-2.5 w-1 rounded bg-neutral-900" style={{ left: `${d.ejes[e.id]}%` }} />
            </span>
            <span className="text-neutral-500">{e.derecha}</span>
          </span>
        ))}
      </span>,
    ],
    ["Contenido del cliente", [d.contenido.mensaje, d.contenido.oferta.filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Sin cargar"],
    [
      "Color previo del cliente",
      d.color_previo_hex ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-black/10" style={{ background: d.color_previo_hex }} />
          <span className="font-mono">{d.color_previo_hex.toUpperCase()}</span>
        </span>
      ) : (
        "No tiene"
      ),
    ],
    ["Matiz que no quiere", d.excluido_H != null ? `H${Math.round(d.excluido_H)}` : "Ninguno"],
    ["Decisión de color", d.decision_color === "heredado" ? "Se hereda el color del cliente" : "Chip optimizado"],
    ["Tipografía previa", d.tipografia_previa ?? "No tiene"],
    ["Fotos propias (diagnóstico)", d.tiene_fotos_propias ? "Sí" : "No"],
    ["Creada", new Date(marca.creada).toLocaleDateString("es-AR")],
  ];
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Datos del diagnóstico</h3>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[14rem_1fr]">
        {filas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-neutral-500">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-neutral-500">
        Color, tipografía, logo, recursos gráficos y fotografía se ajustan en la identidad de la marca.
      </p>
      <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Historial de decisiones</h3>
      {marca.historial?.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {[...marca.historial].reverse().map((h) => (
            <li key={`${h.fecha}-${h.control}`} className="rounded-md border border-neutral-200 bg-white p-3">
              <div className="font-medium">Aviso aceptado: {h.control}</div>
              <div className="text-neutral-700">«{h.motivo}»</div>
              <div className="text-xs text-neutral-500">
                {h.autor} · {new Date(h.fecha).toLocaleString("es-AR")} · {h.pieza}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-500">
          Todavía no hay decisiones registradas. Cuando se acepta un aviso del checklist con su justificación, queda acá.
        </p>
      )}
    </div>
  );
}
