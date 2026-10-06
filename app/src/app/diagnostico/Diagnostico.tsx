"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { hexToHsl, hslToHex, normalizarH } from "@/engine/color";
import {
  construirMarca,
  diagnosticoDeMarca,
  diagnosticoVacio,
  generarChips,
  pendientesMarca,
  reconstruirMarca,
  valorDiagnostico,
  type Chip,
  type ContenidoCliente,
  type Diagnostico,
  type Marca,
} from "@/engine/diagnostico";
import { EJES, ejesSemilla, familiaDeEjes, rangoMatiz, tonoDeEjes, valorDeEjes, type Ejes } from "@/engine/ejes";
import { dataUrlASvg, recolorearSvg, svgADataUrl } from "@/engine/logo";
import { PRESETS, RUBROS, type Rubro } from "@/engine/presets";
import { FAMILIAS, resolverTipografia } from "@/engine/typography";
import { PiezaMuestra, textosPara } from "@/components/PiezaMuestra";
import { IdentidadMarca } from "@/components/IdentidadMarca";
import { CampoHex } from "@/components/CampoHex";
import { descargarJson, elegirMarcaActiva, guardarMarca, useMarcas } from "@/lib/marcas";
import { fontFamily } from "@/lib/fuentes";
import { recortarTransparencia } from "@/lib/imagen";

const PASOS = ["Marca", "Personalidad", "Color", "Insumos", "Resultado"] as const;

/** Tono y valor se derivan de los ejes (E12): la fórmula de paleta y las marcas viejas los siguen usando. */
function conEjes(d: Diagnostico, ejes: Ejes): Diagnostico {
  return { ...d, ejes, personalidad: { tono: tonoDeEjes(ejes), valor: valorDeEjes(ejes) } };
}

function Opcion({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        activa ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:border-neutral-500"
      }`}
    >
      {children}
    </button>
  );
}

/** `editar`: id de una marca guardada para volver a su diagnóstico (E12). */
export function DiagnosticoWizard({ editar = null }: { editar?: string | null }) {
  const marcas = useMarcas();
  const anterior = editar ? marcas.find((m) => m.id === editar) ?? null : null;
  const [cargada, setCargada] = useState<string | null>(null);
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<Diagnostico>(() => conEjes(diagnosticoVacio(), ejesSemilla("servicios")));
  const [chipId, setChipId] = useState<string | null>(null);
  const [marca, setMarca] = useState<Marca | null>(null);
  const [guardada, setGuardada] = useState<boolean | null>(null);
  const [excluidoHex, setExcluidoHex] = useState<string | null>(null);

  // Al editar, el diagnóstico guardado se carga una sola vez, cuando llega la marca (después del primer render). Se
  // ajusta el estado durante el render, que es el patrón de React para derivar estado de una entrada que cambia.
  if (anterior && cargada !== anterior.id) {
    setCargada(anterior.id);
    setD(diagnosticoDeMarca(anterior));
    setExcluidoHex(anterior.diagnostico.excluido_H != null ? hslToHex({ H: anterior.diagnostico.excluido_H, S: 80, L: 50 }) : null);
    setChipId(null);
    setPaso(1);
  }

  const chips = useMemo(() => generarChips(d), [d]);
  const chip: Chip | undefined = chips.find((c) => c.id === chipId);
  const tipografia = resolverTipografia(d.rubro, d.personalidad.tono, d.tipografia_previa, familiaDeEjes(d.ejes));
  const rango = rangoMatiz(d.ejes, d.rubro, d.rubro_secundario);
  const franjaMatiz = [0, 1, 2, 3, 4].map((i) => hslToHex({ H: normalizarH(rango[0] + ((rango[1] - rango[0]) * i) / 4), S: 70, L: 50 }));
  const semillaTexto = d.rubro_secundario
    ? `la mezcla de ${PRESETS[d.rubro].nombre} y ${PRESETS[d.rubro_secundario].nombre}`
    : `los valores de ${PRESETS[d.rubro].nombre}`;
  const textos = textosPara(d.rubro, d.contenido);

  const set = (p: Partial<Diagnostico>) => setD((x) => ({ ...x, ...p }));
  const setContenido = (c: Partial<ContenidoCliente>) => setD((x) => ({ ...x, contenido: { ...x.contenido, ...c } }));
  const setEjes = (ejes: Ejes) => {
    setD((x) => conEjes(x, ejes));
    setChipId(null);
  };
  /** Cambiar de rubro (o de mezcla) vuelve los ejes a la nueva semilla. */
  const elegirRubro = (rubro: Rubro, secundario: Rubro | null) => {
    setD((x) => conEjes({ ...x, rubro, rubro_secundario: secundario }, ejesSemilla(rubro, secundario)));
    setChipId(null);
  };
  const puedeSeguir = [d.nombre.trim().length > 0, true, chip?.resultado.estado === "ok", true, true][paso];

  /** Arma la marca del resultado; al editar, conserva lo fijado a mano (E12). */
  function armar(): boolean {
    if (!chip || chip.resultado.estado !== "ok") return false;
    setMarca(anterior ? reconstruirMarca(anterior, d, chip) : construirMarca(d, chip));
    setGuardada(null);
    return true;
  }

  /** Navegación libre entre pasos (E12): el resultado necesita un color elegido. */
  function irA(i: number) {
    if (i === PASOS.length - 1 && !armar()) return;
    setPaso(i);
  }

  function avanzar() {
    if (paso === 3 && !armar()) return;
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  async function cargarLogo(k: "color" | "mono_claro" | "mono_oscuro", file: File | undefined) {
    if (!file) return;
    const esSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    let url: string;
    let ladoMayor: number | null = null;
    if (esSvg) {
      url = svgADataUrl(await file.text());
    } else {
      const original = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(file);
      });
      const recortada = await recortarTransparencia(original);
      url = recortada.dataUrl;
      ladoMayor = recortada.ladoMayorOriginal;
    }
    setD((x) => {
      const logo = { ...x.logo, [k]: url };
      if (k === "color") {
        logo.formato = esSvg ? "svg" : "png";
        logo.deuda_vectorizar = !esSvg;
        logo.png_lado_mayor = ladoMayor;
      }
      return { ...x, logo };
    });
  }

  function generarMonocromos() {
    const svg = d.logo.color ? dataUrlASvg(d.logo.color) : null;
    if (!svg) return;
    set({
      logo: {
        ...d.logo,
        mono_claro: svgADataUrl(recolorearSvg(svg, "#ffffff")),
        mono_oscuro: svgADataUrl(recolorearSvg(svg, "#1a1a1a")),
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{anterior ? `Diagnóstico de ${anterior.nombre}` : "Diagnóstico de marca"}</h1>
          <p className="text-sm text-neutral-600">10 a 15 minutos con el cliente. Manual v1.1.</p>
        </div>
        <Link href="/marcas" className="text-sm underline">Marcas guardadas</Link>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm">
        {PASOS.map((p, i) => (
          <li key={p}>
            <button
              type="button"
              disabled={!d.nombre.trim() || (i === PASOS.length - 1 && chip?.resultado.estado !== "ok")}
              onClick={() => irA(i)}
              className={`rounded-full px-3 py-1 ${
                i === paso ? "bg-neutral-900 text-white" : i < paso ? "bg-neutral-200" : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {i + 1}. {p}
            </button>
          </li>
        ))}
      </ol>

      {paso === 0 && (
        <section className="flex flex-col gap-8">
          <label className="flex max-w-md flex-col gap-1 text-sm font-medium">
            Nombre de la marca
            <input
              value={d.nombre}
              onChange={(e) => set({ nombre: e.target.value })}
              className="rounded-md border border-neutral-300 px-3 py-2 font-normal"
              placeholder="Ej. Estudio Pérez"
              autoFocus
            />
          </label>
          <div>
            <h2 className="mb-1 font-medium">¿En qué rubro está?</h2>
            <p className="mb-3 text-sm text-neutral-600">
              Es un punto de partida: precarga la personalidad y la biblioteca gráfica. Todo se ajusta en el paso siguiente.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RUBROS.map((r) => (
                <Opcion key={r} activa={d.rubro === r} onClick={() => elegirRubro(r, d.rubro_secundario === r ? null : d.rubro_secundario)}>
                  <div className="font-medium">{PRESETS[r].nombre}</div>
                  <div className="mt-1 text-xs opacity-70">{PRESETS[r].ejemplos}</div>
                </Opcion>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <label className="flex flex-col gap-1">
                Mezclar con otro rubro
                <select
                  value={d.rubro_secundario ?? ""}
                  onChange={(e) => elegirRubro(d.rubro, (e.target.value || null) as Rubro | null)}
                  className="rounded-md border border-neutral-300 px-3 py-2"
                >
                  <option value="">Ninguno</option>
                  {RUBROS.filter((r) => r !== d.rubro).map((r) => (
                    <option key={r} value={r}>{PRESETS[r].nombre}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                ¿Ninguno encaja? Escribí el rubro
                <input
                  value={d.rubro_libre ?? ""}
                  onChange={(e) => set({ rubro_libre: e.target.value || null })}
                  placeholder="Ej. librería con café"
                  className="rounded-md border border-neutral-300 px-3 py-2"
                />
                <span className="text-xs text-neutral-500">Se usa como base el rubro marcado arriba.</span>
              </label>
            </div>
          </div>
          <div>
            <h2 className="mb-1 font-medium">Contenido real del cliente</h2>
            <p className="mb-3 text-sm text-neutral-600">
              Las vistas previas usan esto en lugar de los textos de ejemplo. Se puede dejar vacío.
            </p>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Mensaje principal
                <input value={d.contenido.mensaje} onChange={(e) => setContenido({ mensaje: e.target.value })} placeholder="Ej. Pan recién horneado" className="rounded-md border border-neutral-300 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                Llamado a la acción
                <input value={d.contenido.cta} onChange={(e) => setContenido({ cta: e.target.value })} placeholder="Ej. Pedí el tuyo" className="rounded-md border border-neutral-300 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                Texto de apoyo
                <input value={d.contenido.apoyo} onChange={(e) => setContenido({ apoyo: e.target.value })} placeholder="Ej. Masa madre, todos los días desde las 7" className="rounded-md border border-neutral-300 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                Productos o servicios (hasta 4, separados por coma)
                <input
                  value={d.contenido.oferta.join(", ")}
                  onChange={(e) => setContenido({ oferta: e.target.value.split(",").map((x) => x.trimStart()).slice(0, 4) })}
                  placeholder="Ej. Pan de masa madre, Medialunas, Tortas"
                  className="rounded-md border border-neutral-300 px-3 py-2"
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section className="flex flex-col gap-8">
          <div>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h2 className="font-medium">1. Personalidad de la marca</h2>
              <span className="text-sm text-neutral-600">
                Mové cada eje hasta donde está la marca. Arrancan en {semillaTexto}.
              </span>
              <button type="button" onClick={() => setEjes(ejesSemilla(d.rubro, d.rubro_secundario))} className="ml-auto text-sm underline">
                Volver al punto de partida
              </button>
            </div>
            <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[1fr_20rem]">
              <div className="flex flex-col gap-4">
                {EJES.map((e) => (
                  <label key={e.id} className="grid grid-cols-[6.5rem_1fr_6.5rem] items-center gap-3 text-sm">
                    <span className="text-right">{e.izquierda}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={d.ejes[e.id]}
                      onChange={(ev) => setEjes({ ...d.ejes, [e.id]: Number(ev.target.value) })}
                      aria-label={`${e.izquierda} – ${e.derecha}`}
                      title={`Decide: ${e.decide}`}
                      className="accent-neutral-900"
                    />
                    <span>{e.derecha}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Lo que sale de los ejes</span>
                <div>
                  <div className="text-xs text-neutral-500">Tipografía</div>
                  <div className="text-2xl" style={{ fontFamily: fontFamily(tipografia.familia_variable), fontWeight: 800 }}>
                    {d.nombre.trim() || "Tu marca"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {tipografia.familia_variable}
                    {tipografia.previa ? " (la que ya usa el cliente)" : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Rango de color</div>
                  <div className="h-4 rounded" style={{ background: `linear-gradient(90deg, ${franjaMatiz.join(", ")})` }} />
                  <div className="text-xs text-neutral-500">H{rango[0]}° a H{rango[1]}°</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Acento</div>
                  <div>{valorDiagnostico(d) === "energia" || valorDiagnostico(d) === "innovacion" ? "Complementario: contrasta" : "Análogo: armoniza"}</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-medium">2. ¿Hay un color que ya asociás con tu marca, o uno que no querés usar?</h2>
            <div className="flex flex-wrap gap-8">
              <ColorOpcional
                etiqueta="Color corporativo actual"
                valor={d.color_previo_hex}
                onChange={(hex) => { set({ color_previo_hex: hex }); setChipId(null); }}
              />
              <ColorOpcional
                etiqueta="Color que no quiere (banda ±25°)"
                valor={excluidoHex}
                hexInicial="#e30613"
                onChange={(hex) => {
                  setExcluidoHex(hex);
                  set({ excluido_H: hex ? hexToHsl(hex)!.H : null });
                  setChipId(null);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {paso === 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-medium">¿Cuál sentís más cercana a tu marca?</h2>
          <p className="text-sm text-neutral-600">
            Cada opción ya está aplicada a una pieza real (Modo A y Modo B). {d.color_previo_hex && "Incluye tu color actual, optimizado y tal cual."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chips.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setChipId(c.id)}
                disabled={!c.resultado.paleta}
                className={`flex flex-col gap-3 rounded-xl border-2 bg-white p-3 text-left transition ${
                  chipId === c.id ? "border-neutral-900" : "border-transparent hover:border-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.etiqueta}</span>
                  <span className="font-mono text-xs text-neutral-500">H{Math.round(c.H)} · {c.modo}</span>
                </div>
                {c.resultado.paleta ? (
                  <div className="grid grid-cols-2 gap-2">
                    <PiezaMuestra paleta={c.resultado.paleta} tipografia={tipografia} rubro={d.rubro} modo="A" nombre={d.nombre} logo={d.logo} textos={textos} />
                    <PiezaMuestra paleta={c.resultado.paleta} tipografia={tipografia} rubro={d.rubro} modo="B" nombre={d.nombre} logo={d.logo} textos={textos} />
                  </div>
                ) : (
                  <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
                    Requiere revisión manual: {c.resultado.motivos.join("; ")}
                  </div>
                )}
                {c.resultado.paleta && (c.resultado.avisos?.length ?? 0) > 0 && (
                  <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                    No cumple la fórmula (se acepta con aviso): {c.resultado.avisos!.join("; ")}.
                  </div>
                )}
              </button>
            ))}
          </div>
          {chip && chip.resultado.log.length > 0 && (
            <details className="text-sm text-neutral-600">
              <summary className="cursor-pointer">Cómo se calculó esta paleta</summary>
              <ul className="mt-2 list-disc pl-5">{chip.resultado.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </details>
          )}
        </section>
      )}

      {paso === 3 && (
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-1 font-medium">Logo</h2>
            <p className="mb-4 text-sm text-neutral-600">
              Ideal: SVG. PNG se acepta con 1000 px mínimo y fondo transparente (queda como deuda para vectorizar).
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ["color", "Versión color"],
                ["mono_claro", "Monocromo claro"],
                ["mono_oscuro", "Monocromo oscuro"],
              ] as const).map(([k, etiqueta]) => (
                <label key={k} className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-4 text-sm">
                  <span className="font-medium">{etiqueta}</span>
                  <div className={`flex h-20 items-center justify-center rounded ${k === "mono_claro" ? "bg-neutral-800" : "bg-neutral-100"}`}>
                    {d.logo[k] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.logo[k]!} alt="" className="max-h-16 max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-400">sin cargar</span>
                    )}
                  </div>
                  <input type="file" accept=".svg,image/svg+xml,image/png" onChange={(e) => cargarLogo(k, e.target.files?.[0])} className="text-xs" />
                </label>
              ))}
            </div>
            {pendientesMarca(d.logo).length > 0 && d.logo.color && (
              <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">
                {pendientesMarca(d.logo).map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
            {d.logo.formato === "svg" && (!d.logo.mono_claro || !d.logo.mono_oscuro) && (
              <button type="button" onClick={generarMonocromos} className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
                Generar monocromos a partir del SVG color
              </button>
            )}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={d.tiene_fotos_propias} onChange={(e) => set({ tiene_fotos_propias: e.target.checked })} />
              Tiene fotos propias de calidad usable
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipografía previa asociada a la marca
              <select
                value={d.tipografia_previa ?? ""}
                onChange={(e) => set({ tipografia_previa: e.target.value || null })}
                className="rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="">No tiene / no es variable → usar la del sistema</option>
                {Object.keys(FAMILIAS).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
        </section>
      )}

      {paso === 4 && marca && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-xl font-semibold">{marca.nombre}</h2>
            <button
              type="button"
              onClick={async () => {
                const ok = await guardarMarca(marca);
                if (ok) elegirMarcaActiva(marca.id);
                setGuardada(ok);
              }}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
            >
              {anterior ? "Guardar cambios" : "Guardar marca"}
            </button>
            <button type="button" onClick={() => descargarJson(marca)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
              Exportar JSON
            </button>
          </div>
          {guardada === true && (
            <p className="text-sm text-emerald-700">
              Marca guardada. Seguí con su <Link href={`/identidad/${marca.id}`} className="underline">identidad</Link> o{" "}
              <Link href="/marcas" className="underline">volvé a las marcas</Link>.
            </p>
          )}
          {guardada === false && <p className="text-sm text-red-700">No se pudo guardar en este navegador. Exportá el JSON.</p>}
          <IdentidadMarca marca={marca} onChange={(m) => { setMarca(m); setGuardada(null); }} />
        </section>
      )}

      {paso < 4 && (
        <footer className="flex justify-between border-t border-neutral-200 pt-6">
          <button type="button" onClick={() => setPaso((p) => Math.max(0, p - 1))} disabled={paso === 0} className="text-sm disabled:opacity-30">
            ← Atrás
          </button>
          <button
            type="button"
            onClick={avanzar}
            disabled={!puedeSeguir}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white disabled:opacity-30"
          >
            {paso === 3 ? "Ver resultado" : "Siguiente →"}
          </button>
        </footer>
      )}
    </div>
  );
}

function ColorOpcional({
  etiqueta,
  valor,
  hexInicial = "#0057b8",
  onChange,
}: {
  etiqueta: string;
  valor: string | null;
  hexInicial?: string;
  onChange: (hex: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={valor != null} onChange={(e) => onChange(e.target.checked ? hexInicial : null)} />
        {etiqueta}
      </label>
      {valor != null && <CampoHex valor={valor} onChange={onChange} />}
    </div>
  );
}
