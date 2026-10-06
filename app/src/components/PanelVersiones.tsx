"use client";

import { useState } from "react";
import Link from "next/link";
import type { Marca } from "@/engine/diagnostico";
import { aprobarVersion, cambiosSinAprobar, diferencias, guardarVersion, marcarFavorita, restaurarVersion, versionAprobada } from "@/engine/versiones";
import { PiezaMuestra, textosPara } from "./PiezaMuestra";

// Versiones de la identidad (replanteo, E13): guardar instantáneas con nombre, volver a una, compararlas y aprobar.

export function PanelVersiones({
  marca,
  autor,
  sinGuardar,
  onGuardar,
  onRestaurar,
}: {
  marca: Marca;
  autor: string;
  /** Hay cambios sin confirmar: guardar una versión los confirma. */
  sinGuardar: boolean;
  /** Guarda la marca (con la versión nueva o la aprobación). */
  onGuardar: (m: Marca) => void;
  /** Vuelve el borrador a una versión (queda sin confirmar). */
  onRestaurar: (m: Marca) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [comparar, setComparar] = useState<string[]>([]);
  const versiones = marca.versiones ?? [];
  const aprobada = versionAprobada(marca);
  const textos = textosPara(marca.rubro, marca.diagnostico.contenido);
  const elegidas = versiones.filter((v) => comparar.includes(v.id));

  return (
    <section className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Versiones</h2>
        {aprobada ? (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
            Aprobada: {aprobada.nombre}
            {cambiosSinAprobar(marca) && " · la identidad actual tiene cambios sin aprobar: Publicaciones sigue usando la aprobada"}
          </span>
        ) : (
          <span className="text-xs text-neutral-500">Sin versión aprobada: Publicaciones usa la identidad actual.</span>
        )}
        <Link href={`/presentacion/${marca.id}`} className="ml-auto rounded-md bg-neutral-900 px-3 py-1.5 text-white">
          Presentar al cliente
        </Link>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar(guardarVersion(marca, nombre, autor));
          setNombre("");
        }}
      >
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={`Versión ${versiones.length + 1}`} className="rounded-md border border-neutral-300 px-2 py-1.5" />
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5">
          Guardar versión{sinGuardar ? " (confirma los cambios)" : ""}
        </button>
      </form>
      {versiones.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-100">
          {[...versiones].reverse().map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 py-2">
              <input
                type="checkbox"
                title="Comparar"
                checked={comparar.includes(v.id)}
                onChange={(e) => setComparar(e.target.checked ? [...comparar, v.id].slice(-3) : comparar.filter((x) => x !== v.id))}
              />
              <button type="button" title={v.favorita ? "Quitar de favoritas" : "Marcar favorita"} onClick={() => onGuardar(marcarFavorita(marca, v.id, !v.favorita))}>
                {v.favorita ? "★" : "☆"}
              </button>
              <span className="font-medium">{v.nombre}</span>
              <span className="text-xs text-neutral-500">
                {v.autor} · {new Date(v.fecha).toLocaleString("es-AR")}
                {v.comentarios?.length ? ` · ${v.comentarios.length} comentario${v.comentarios.length === 1 ? "" : "s"}` : ""}
              </span>
              {v.id === marca.version_aprobada && <span className="rounded bg-emerald-100 px-1.5 text-[10px] text-emerald-900">aprobada</span>}
              <span className="ml-auto flex gap-3 text-xs">
                <button type="button" onClick={() => onRestaurar(restaurarVersion(marca, v.id))} className="underline">
                  Volver a esta
                </button>
                {v.id !== marca.version_aprobada && (
                  <button
                    type="button"
                    onClick={() => onGuardar(aprobarVersion(marca, v.id, { autor, fecha: new Date().toISOString(), texto: "Aprobada en el estudio" }))}
                    className="underline"
                  >
                    Aprobar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {elegidas.length >= 2 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Comparación</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${elegidas.length}, minmax(0, 1fr))` }}>
            {elegidas.map((v) => (
              <div key={v.id} className="flex flex-col gap-2">
                <span className="font-medium">{v.nombre}</span>
                <div className="grid grid-cols-2 gap-1">
                  <PiezaMuestra paleta={v.identidad.paleta} tipografia={v.identidad.tipografia} rubro={marca.rubro} modo="A" nombre={marca.nombre} logo={v.identidad.logo} textos={textos} />
                  <PiezaMuestra paleta={v.identidad.paleta} tipografia={v.identidad.tipografia} rubro={marca.rubro} modo="B" nombre={marca.nombre} logo={v.identidad.logo} textos={textos} />
                </div>
              </div>
            ))}
          </div>
          <ul className="list-disc pl-5 text-xs text-neutral-600">
            {diferencias(elegidas[0].identidad, elegidas[1].identidad).map((x) => (
              <li key={x}>{x}</li>
            ))}
            {diferencias(elegidas[0].identidad, elegidas[1].identidad).length === 0 && <li>Las dos versiones son iguales.</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
