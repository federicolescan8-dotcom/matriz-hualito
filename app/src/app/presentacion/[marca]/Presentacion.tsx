"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hslCss, hslToHex, type HSL } from "@/engine/color";
import { coloresModo, estiloCta } from "@/engine/palette";
import { piezaNueva, piezasDeGrilla } from "@/engine/pieza";
import { familiaTexto } from "@/engine/typography";
import { aprobarVersion, comentarVersion, guardarVersion, versionAprobada, type VersionIdentidad } from "@/engine/versiones";
import { PiezaEscalada } from "@/components/PiezaEscalada";
import { textosPara } from "@/components/PiezaMuestra";
import { guardarMarca, useMarcas } from "@/lib/marcas";
import { cargarFuentePropia, fontFamily } from "@/lib/fuentes";

// Presentación de la identidad al cliente (replanteo, E13). Pantalla completa, sin jerga técnica (ni ΔE, ni HSL, ni
// ratios): la marca puesta en contexto. Se avanza con las flechas del teclado.

const DIAPOSITIVAS = ["Portada", "Colores", "Tipografía", "Feed", "Story", "Tarjeta", "Cartel", "Aprobación"] as const;

export function Presentacion({ id, version }: { id: string; version: string | null }) {
  const marcas = useMarcas();
  const guardada = marcas.find((m) => m.id === id) ?? null;
  const [i, setI] = useState(0);
  const [comentario, setComentario] = useState("");
  const [quien, setQuien] = useState("");
  const elegida: VersionIdentidad | null = guardada?.versiones?.find((v) => v.id === version) ?? null;
  // La marca tal como se presenta: con la versión pedida o con la identidad actual.
  const marca = useMemo(() => (guardada ? (elegida ? { ...guardada, identidad: elegida.identidad } : guardada) : null), [guardada, elegida]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === " ") setI((x) => Math.min(DIAPOSITIVAS.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    void cargarFuentePropia(marca?.identidad.tipografia.propia);
  }, [marca]);

  const textos = marca ? textosPara(marca.rubro, marca.diagnostico.contenido) : null;
  const grilla = useMemo(() => (marca && textos ? piezasDeGrilla(marca, textos) : []), [marca]); // eslint-disable-line react-hooks/exhaustive-deps
  const story = useMemo(
    () => (marca && textos ? { ...piezaNueva(marca), canal: "stories_ig" as const, formato: "9:16" as const, variante: "2" as const, modo: "B" as const, alineacion: "izquierda" as const, contenido: { h1: textos.h1, body: null, cta: textos.cta } } : null),
    [marca], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!marca || !textos) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-600">
        No se encontró la marca. <Link href="/marcas" className="ml-2 underline">Volver</Link>
      </div>
    );
  }

  const id_ = marca.identidad;
  const p = id_.paleta;
  const A = coloresModo(p, "A");
  const B = coloresModo(p, "B");
  const display = fontFamily(id_.tipografia.familia_variable);
  const texto = fontFamily(familiaTexto(id_.tipografia));
  const ctaB = estiloCta(p, "B");
  const logoPortada = id_.logo.mono_claro ?? id_.logo.color;
  const aprobada = guardada ? versionAprobada(guardada) : null;
  const colores: { nombre: string; color: HSL }[] = [
    { nombre: "Color de marca", color: p.color_marca },
    { nombre: "Apoyo", color: p.tono_apoyo },
    { nombre: "Fondo", color: p.fondo_neutro },
    { nombre: "Acento", color: p.acento },
    ...(id_.paleta_extendida?.secundarios.map((s, k) => ({ nombre: `Secundario ${k + 1}`, color: s.color })) ?? []),
  ];

  /** Aprobar lo que se está mostrando: la versión elegida o, si es la identidad actual, se guarda primero como versión. */
  async function aprobar() {
    if (!guardada) return;
    const ahora = new Date().toISOString();
    let m = guardada;
    let vid = elegida?.id;
    if (!vid) {
      m = guardarVersion(m, `Presentada el ${new Date().toLocaleDateString("es-AR")}`, quien.trim() || "cliente", ahora);
      vid = m.versiones!.at(-1)!.id;
    }
    await guardarMarca(aprobarVersion(m, vid, { autor: quien.trim() || "cliente", fecha: ahora, texto: comentario.trim() || "Aprobada" }));
    setComentario("");
  }

  async function comentar() {
    if (!guardada || !elegida || !comentario.trim()) return;
    await guardarMarca(comentarVersion(guardada, elegida.id, { autor: quien.trim() || "cliente", fecha: new Date().toISOString(), texto: comentario.trim() }));
    setComentario("");
  }

  const diapositiva = DIAPOSITIVAS[i];
  return (
    <div className="flex min-h-screen flex-col" style={{ background: hslCss(A.fondo), color: hslCss(A.texto) }}>
      <header className="flex items-center gap-4 px-8 py-4 text-sm" style={{ fontFamily: "system-ui" }}>
        <Link href={`/identidad/${marca.id}`} className="opacity-60 hover:opacity-100">← Volver</Link>
        <span className="opacity-60">{marca.nombre}{elegida ? ` · ${elegida.nombre}` : ""}</span>
        <nav className="ml-auto flex flex-wrap gap-1">
          {DIAPOSITIVAS.map((d, k) => (
            <button key={d} type="button" onClick={() => setI(k)} className={`rounded-full px-3 py-1 ${k === i ? "bg-black/10 font-medium" : "opacity-60"}`}>
              {d}
            </button>
          ))}
        </nav>
        <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} className="opacity-60 hover:opacity-100" title="Pantalla completa">
          ⛶
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-8 pb-10">
        {diapositiva === "Portada" && (
          <div className="flex w-full max-w-5xl flex-col items-start gap-8 rounded-3xl p-16" style={{ background: hslCss(B.fondo), color: hslCss(B.texto) }}>
            {logoPortada ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPortada} alt={marca.nombre} className="max-h-28 max-w-xs object-contain" />
            ) : null}
            <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: 96, lineHeight: 1 }}>{marca.nombre}</h1>
            <p style={{ fontFamily: texto, fontSize: 28 }}>{textos.h1}</p>
          </div>
        )}

        {diapositiva === "Colores" && (
          <div className="grid w-full max-w-6xl gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(colores.length, 6)}, minmax(0, 1fr))` }}>
            {colores.map((c) => (
              <div key={c.nombre} className="flex flex-col gap-3">
                <div className="aspect-[3/4] rounded-2xl border border-black/10" style={{ background: hslCss(c.color) }} />
                <span style={{ fontFamily: texto, fontSize: 20 }}>{c.nombre}</span>
                <span className="font-mono text-sm opacity-60">{hslToHex(c.color).toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {diapositiva === "Tipografía" && (
          <div className="grid w-full max-w-6xl gap-16 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="text-sm opacity-60" style={{ fontFamily: "system-ui" }}>Títulos · {id_.tipografia.familia_variable}</span>
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 160, lineHeight: 1 }}>Aa</span>
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 48, lineHeight: 1.05 }}>{textos.h1}</span>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-sm opacity-60" style={{ fontFamily: "system-ui" }}>Texto · {familiaTexto(id_.tipografia)}</span>
              <span style={{ fontFamily: texto, fontSize: 160, lineHeight: 1 }}>Aa</span>
              <span style={{ fontFamily: texto, fontSize: 24, lineHeight: 1.4 }}>{textos.body}</span>
            </div>
          </div>
        )}

        {diapositiva === "Feed" && (
          <div className="flex flex-col items-center gap-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-xl">
              {grilla.map((pz) => (
                <PiezaEscalada key={pz.id} marca={marca} pieza={pz} ancho={180} />
              ))}
            </div>
            <span className="text-sm opacity-60" style={{ fontFamily: "system-ui" }}>Así se ve el perfil de Instagram con 9 publicaciones.</span>
          </div>
        )}

        {diapositiva === "Story" && story && (
          <div className="rounded-[48px] border-[10px] border-neutral-900 bg-neutral-900 p-1 shadow-2xl">
            <div className="overflow-hidden rounded-[38px]">
              <PiezaEscalada marca={marca} pieza={story} ancho={300} />
            </div>
          </div>
        )}

        {diapositiva === "Tarjeta" && (
          <div className="flex flex-wrap items-center justify-center gap-10">
            <div className="flex aspect-[85/55] w-[425px] items-center justify-center rounded-xl shadow-xl" style={{ background: hslCss(B.fondo), color: hslCss(B.texto) }}>
              {id_.logo.mono_claro ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={id_.logo.mono_claro} alt={marca.nombre} className="max-h-24 max-w-[60%] object-contain" />
              ) : (
                <span style={{ fontFamily: display, fontWeight: 800, fontSize: 40 }}>{marca.nombre}</span>
              )}
            </div>
            <div className="flex aspect-[85/55] w-[425px] flex-col justify-between rounded-xl p-8 shadow-xl" style={{ background: hslCss(A.fondo), color: hslCss(A.texto), border: "1px solid rgba(0,0,0,.08)" }}>
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 26 }}>{marca.nombre}</span>
              <span className="flex flex-col gap-1" style={{ fontFamily: texto, fontSize: 15 }}>
                <span>hola@{marca.nombre.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "")}.com</span>
                <span>+54 11 0000-0000</span>
              </span>
              <span className="h-2 w-16 rounded-full" style={{ background: hslCss(p.acento) }} />
            </div>
          </div>
        )}

        {diapositiva === "Cartel" && (
          <div className="flex flex-col items-center">
            <div className="flex h-[520px] w-[380px] flex-col justify-between rounded-t-2xl p-10 shadow-2xl" style={{ background: hslCss(B.fondo), color: hslCss(B.texto) }}>
              <span style={{ fontFamily: texto, fontSize: 18, opacity: 0.85 }}>{marca.nombre}</span>
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 52, lineHeight: 1.02 }}>{textos.h1}</span>
              <span className="self-start rounded-full px-6 py-3" style={{ background: hslCss(ctaB.fondo), color: hslCss(ctaB.texto), fontFamily: texto, fontWeight: 600, fontSize: 20 }}>
                {textos.cta}
              </span>
            </div>
            <div className="flex w-[420px] justify-between">
              <span className="h-24 w-3 -skew-x-6 bg-neutral-800" />
              <span className="h-24 w-3 skew-x-6 bg-neutral-800" />
            </div>
          </div>
        )}

        {diapositiva === "Aprobación" && (
          <div className="flex w-full max-w-2xl flex-col gap-5 rounded-2xl bg-white p-8 text-neutral-900 shadow-xl" style={{ fontFamily: "system-ui" }}>
            <h2 className="text-2xl font-semibold">¿Aprobamos esta identidad?</h2>
            {aprobada && (
              <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
                Versión aprobada: <strong>{aprobada.nombre}</strong>, por {aprobada.aprobacion?.autor} el{" "}
                {aprobada.aprobacion ? new Date(aprobada.aprobacion.fecha).toLocaleDateString("es-AR") : ""}
                {aprobada.aprobacion?.texto ? `: «${aprobada.aprobacion.texto}»` : ""}.
              </p>
            )}
            {elegida?.comentarios?.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {elegida.comentarios.map((c) => (
                  <li key={c.fecha} className="rounded-md bg-neutral-50 p-2">
                    «{c.texto}» <span className="text-xs text-neutral-500">— {c.autor}, {new Date(c.fecha).toLocaleString("es-AR")}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <input value={quien} onChange={(e) => setQuien(e.target.value)} placeholder="¿Quién aprueba o comenta?" className="rounded-md border border-neutral-300 px-3 py-2" />
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} placeholder="Comentario (opcional para aprobar)" className="resize-none rounded-md border border-neutral-300 px-3 py-2" />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void aprobar()} className="rounded-md bg-neutral-900 px-5 py-2.5 text-white">
                Aprobar {elegida ? `"${elegida.nombre}"` : "esta identidad"}
              </button>
              {elegida && (
                <button type="button" onClick={() => void comentar()} disabled={!comentario.trim()} className="rounded-md border border-neutral-300 px-5 py-2.5 disabled:opacity-40">
                  Dejar comentario
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              La versión aprobada es la que usa Publicaciones. Queda registrado quién la aprobó y cuándo.
            </p>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between px-8 pb-6 text-sm opacity-60" style={{ fontFamily: "system-ui" }}>
        <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>← Anterior</button>
        <span>{i + 1} / {DIAPOSITIVAS.length}</span>
        <button type="button" onClick={() => setI(Math.min(DIAPOSITIVAS.length - 1, i + 1))} disabled={i === DIAPOSITIVAS.length - 1}>Siguiente →</button>
      </footer>
    </div>
  );
}
