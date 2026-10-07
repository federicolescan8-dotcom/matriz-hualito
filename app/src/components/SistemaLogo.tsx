"use client";

import { useState } from "react";
import { hslToHex } from "@/engine/color";
import { briefLogo, coloresDeMarca, paletaASE, paletaCSS, paletaJSON } from "@/engine/entregables";
import type { Marca } from "@/engine/diagnostico";
import { extraerColores } from "@/engine/laboratorio";
import { AREA_SEGURIDAD, LOGO_MIN_PX, VERSIONES_LOGO, type ArchivoLogo, type VersionLogo } from "@/engine/logo";
import { descargar, slug } from "@/lib/exportar";
import { aspectoDeImagen, leerArchivoLogo, pixelesDeImagen } from "@/lib/imagen";

type SobreFoto = NonNullable<Marca["identidad"]["logo"]["sobre_foto"]>;

const SOBRE_FOTO: { id: SobreFoto; nombre: string; ayuda: string }[] = [
  { id: "mono", nombre: "Monocromo", ayuda: "el logo en blanco, como hoy" },
  { id: "placa", nombre: "Placa", ayuda: "el logo en color sobre una placa del fondo neutro" },
  { id: "sombra", nombre: "Sombra", ayuda: "el logo en blanco con una sombra suave" },
];

/**
 * Logo como sistema (E4): el diseñador entrega las versiones y esta sección las recibe, muestra su área de seguridad y
 * baja el brief y la paleta para pedírselas. La herramienta no genera ni vectoriza versiones.
 */
export function SistemaLogo({ marca, onChange }: { marca: Marca; onChange: (m: Marca) => void }) {
  const logo = marca.identidad.logo;
  const [error, setError] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);

  const guardarLogo = (cambios: Partial<Marca["identidad"]["logo"]>) =>
    onChange({ ...marca, identidad: { ...marca.identidad, logo: { ...logo, ...cambios } } });

  const subir = async (id: VersionLogo, file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const { src, aspecto } = await leerArchivoLogo(file);
      guardarLogo({ versiones: { ...logo.versiones, [id]: { src, aspecto } } });
    } catch {
      setError("No se pudo leer el archivo. Probá con un SVG o un PNG.");
    }
  };

  const quitar = (id: VersionLogo) => {
    const resto = { ...logo.versiones };
    delete resto[id];
    guardarLogo({ versiones: resto });
  };

  const analizar = async () => {
    if (!logo.color) return;
    setError(null);
    setAnalizando(true);
    try {
      const aspecto = await aspectoDeImagen(logo.color);
      const colores = extraerColores(await pixelesDeImagen(logo.color));
      const dominante = colores.sort((a, b) => b.peso - a.peso)[0]?.color ?? null;
      guardarLogo({ aspecto, color_dominante: dominante });
    } catch {
      setError("No se pudo analizar el logo principal.");
    } finally {
      setAnalizando(false);
    }
  };

  const colores = coloresDeMarca(marca.identidad);
  const base = slug(marca.nombre) || "marca";
  const bajar = (contenido: BlobPart, tipo: string, nombre: string) => descargar(new Blob([contenido], { type: tipo }), nombre);
  const boton = "rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
      <div>
        <h3 className="text-sm font-semibold">Sistema de logo</h3>
        <p className="text-xs text-neutral-500">
          Las versiones las entrega el diseñador (SVG o PNG). Cada pieza usa la que mejor entra en su lugar y el checklist
          controla el tamaño mínimo ({LOGO_MIN_PX} px), el área de seguridad ({Math.round(AREA_SEGURIDAD * 100)}% del alto) y el
          contraste con el fondo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VERSIONES_LOGO.map((v) => {
          const archivo: ArchivoLogo | undefined = logo.versiones?.[v.id];
          return (
            <div key={v.id} className="flex flex-col gap-2">
              <div className="flex h-32 items-center justify-center rounded-md bg-neutral-50 p-4">
                {archivo ? <ConAreaDeSeguridad archivo={archivo} /> : <span className="text-xs text-neutral-500">sin cargar</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-600">
                  <strong>{v.nombre}</strong> · {v.uso}
                </span>
                <span className="flex shrink-0 gap-2 text-xs">
                  <label className="cursor-pointer underline">
                    {archivo ? "Cambiar" : "Subir"}
                    <input type="file" accept=".svg,.png,image/svg+xml,image/png" className="hidden" onChange={(e) => { void subir(v.id, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {archivo && (
                    <button type="button" className="underline" onClick={() => quitar(v.id)}>
                      Quitar
                    </button>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {logo.color && (!logo.aspecto || !logo.color_dominante) && (
        <div className="flex items-center gap-3">
          <button type="button" className={boton} disabled={analizando} onClick={() => void analizar()}>
            {analizando ? "Analizando…" : "Analizar logo principal"}
          </button>
          <span className="text-xs text-neutral-500">Mide su proporción y su color dominante para elegir versión y controlar el contraste.</span>
        </div>
      )}
      {logo.color_dominante && (
        <p className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="inline-block h-4 w-4 rounded border border-neutral-300" style={{ background: hslToHex(logo.color_dominante) }} />
          Color dominante del logo principal: {hslToHex(logo.color_dominante).toUpperCase()}
        </p>
      )}

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Sobre foto</legend>
        <div className="flex flex-wrap gap-4">
          {SOBRE_FOTO.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm" title={o.ayuda}>
              <input type="radio" name="logo-sobre-foto" checked={(logo.sobre_foto ?? "mono") === o.id} onChange={() => guardarLogo({ sobre_foto: o.id })} />
              {o.nombre}
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">{SOBRE_FOTO.find((o) => o.id === (logo.sobre_foto ?? "mono"))!.ayuda}.</p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={boton} onClick={() => bajar(briefLogo(marca), "text/markdown", `brief-logo-${base}.md`)}>
          Brief del logo (.md)
        </button>
        <button type="button" className={boton} onClick={() => bajar(paletaASE(colores) as BlobPart, "application/octet-stream", `paleta-${base}.ase`)}>
          Paleta .ase
        </button>
        <button type="button" className={boton} onClick={() => bajar(paletaCSS(colores), "text/css", `paleta-${base}.css`)}>
          Paleta .css
        </button>
        <button type="button" className={boton} onClick={() => bajar(paletaJSON(colores), "application/json", `paleta-${base}.json`)}>
          Paleta .json
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

/** El logo con un recuadro punteado que marca el área de seguridad (25% del alto por cada lado). */
function ConAreaDeSeguridad({ archivo }: { archivo: ArchivoLogo }) {
  const alto = 56;
  const aire = alto * AREA_SEGURIDAD;
  return (
    <div style={{ padding: aire, border: "1px dashed #a3a3a3", maxWidth: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={archivo.src} alt="" style={{ height: alto, width: alto * archivo.aspecto, maxWidth: "100%", objectFit: "contain", display: "block" }} />
    </div>
  );
}
