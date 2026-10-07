"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { hslCss, hslToHex, hslToRgb } from "@/engine/color";
import type { Marca } from "@/engine/diagnostico";
import { migrarMarca, type MarcaV1 } from "@/engine/identidad";
import { coloresDeMarca } from "@/engine/entregables";
import { DIRECCION_DE_ARTE, TRATAMIENTOS } from "@/engine/fotografia";
import { AREA_SEGURIDAD, LOGO_MIN_PX, VERSIONES_LOGO, monocromoDe } from "@/engine/logo";
import { coloresModo } from "@/engine/palette";
import { piezasDeGrilla } from "@/engine/pieza";
import { familiaTexto } from "@/engine/typography";
import { marcaParaPublicar, versionAprobada } from "@/engine/versiones";
import { PiezaEscalada } from "@/components/PiezaEscalada";
import { textosPara } from "@/components/PiezaMuestra";
import { asegurarFamilias, cargarFuentePropia, fontFamily } from "@/lib/fuentes";
import { useMarcas } from "@/lib/marcas";

// Manual de marca en A4 vertical (replanteo, E8). Cada `.pagina` es una hoja; el navegador la imprime a PDF con los
// saltos de página de abajo. Las piezas de ejemplo son `Pieza` real escalada: lo que se ve es lo que se exporta.
// Marca `data-manual-listo="true"` cuando las fuentes cargaron y todas las piezas terminaron de medirse.

declare global {
  interface Window {
    __MANUAL__?: Marca | MarcaV1;
  }
}

const sinSuscripcion = () => () => {};

const ROLES: Record<string, string> = {
  Marca: "El color que identifica a la marca. Va en los detalles principales y en los fondos de marca.",
  "Marca funcional": "Una versión del color de marca que se lee bien sobre fondos claros, para textos y botones.",
  Apoyo: "Acompaña al color de marca en fondos y formas secundarias.",
  Fondo: "El fondo claro de las piezas y los documentos.",
  Acento: "Un toque de contraste para llamar la atención: botones y detalles.",
  "Neutro oscuro": "El color de los textos sobre fondo claro.",
};

const SOBRE_FOTO = {
  mono: "El logo va en blanco (monocromo claro) sobre la foto, con el degradado de la marca debajo para que se lea.",
  placa: "El logo va sobre una placa de color neutro, con aire alrededor.",
  sombra: "El logo va en blanco con una sombra suave para separarlo de la foto.",
} as const;

function Pagina({ clave, titulo, nombre, n, display, children }: { clave: string; titulo: string; nombre: string; n: number; display: string; children: React.ReactNode }) {
  return (
    <section className="pagina" data-pagina={clave}>
      <header>
        <h2 style={{ fontFamily: display }}>{titulo}</h2>
        <span>{nombre} · {n}</span>
      </header>
      {children}
    </section>
  );
}

export function Manual({ id }: { id: string }) {
  const inyectada = useSyncExternalStore(sinSuscripcion, () => window.__MANUAL__ ?? null, () => null);
  const guardadas = useMarcas();
  const base = useMemo(() => {
    if (inyectada) return migrarMarca(inyectada);
    return guardadas.find((m) => m.id === id) ?? null;
  }, [inyectada, guardadas, id]);
  // El manual refleja la versión aprobada de la identidad, si hay (E13).
  const marca = useMemo(() => (base ? marcaParaPublicar(base) : null), [base]);
  const aprobada = base ? versionAprobada(base) : null;

  const textos = marca ? textosPara(marca.rubro, marca.diagnostico.contenido) : null;
  const ejemplos = useMemo(() => (marca && textos ? piezasDeGrilla(marca, textos, 4) : []), [marca]); // eslint-disable-line react-hooks/exhaustive-deps

  const [fuentesListas, setFuentesListas] = useState(false);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!marca) return;
    const t = marca.identidad.tipografia;
    void cargarFuentePropia(t.propia)
      .then(() => asegurarFamilias([t.familia_variable, familiaTexto(t)]))
      .then(() => document.fonts.ready)
      .then(() => setFuentesListas(true));
  }, [marca]);
  useEffect(() => {
    if (!fuentesListas) return;
    const timer = setInterval(() => {
      const piezas = [...document.querySelectorAll("[data-pieza]")];
      if (piezas.every((p) => (p as HTMLElement).dataset.listo === "true")) {
        setListo(true);
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [fuentesListas, ejemplos]);

  if (!marca || !textos) return <div style={{ padding: 40 }}>No se encontró la marca.</div>;

  const idn = marca.identidad;
  const p = idn.paleta;
  const A = coloresModo(p, "A");
  const B = coloresModo(p, "B");
  const display = fontFamily(idn.tipografia.familia_variable);
  const cuerpo = fontFamily(familiaTexto(idn.tipografia));
  const colores = coloresDeMarca(idn);
  const tinta = hslCss(A.texto);
  const logoClaro = idn.logo.mono_claro ?? (idn.logo.color && monocromoDe(idn.logo.color, true)) ?? idn.logo.color;
  const logoOscuro = idn.logo.mono_oscuro ?? (idn.logo.color && monocromoDe(idn.logo.color, false)) ?? idn.logo.color;
  const versiones = VERSIONES_LOGO.filter((v) => idn.logo.versiones?.[v.id]);
  const formas = idn.recursos?.formas ?? [];
  const detalle = idn.recursos?.detalle ?? null;
  const hayRecursos = formas.length > 0 || !!detalle;
  const hayFoto = idn.fotos_habilitadas || !!idn.fotografia;
  const tratamiento = TRATAMIENTOS.find((t) => t.id === (idn.fotografia?.tratamiento ?? "natural"))!;
  const pct = Math.round(AREA_SEGURIDAD * 100);
  const paginas = ["portada", "paleta", "tipografia", "logo", ...(hayRecursos ? ["recursos"] : []), ...(hayFoto ? ["fotografia"] : []), "ejemplos"];
  const num = (n: string) => paginas.indexOf(n) + 1;

  return (
    <div data-manual-listo={listo ? "true" : "false"} style={{ background: "#e5e5e5", color: tinta, fontFamily: cuerpo }}>
      <style>{`
        @page { size: A4; margin: 0; }
        html, body { margin: 0; background: #e5e5e5; }
        .pagina { width: 210mm; height: 297mm; box-sizing: border-box; padding: 18mm 16mm; margin: 0 auto 8mm; background: ${hslCss(A.fondo)}; overflow: hidden; break-after: page; page-break-after: always; display: flex; flex-direction: column; gap: 8mm; position: relative; }
        .pagina > header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(0,0,0,.12); padding-bottom: 4mm; }
        .pagina > header h2 { margin: 0; font-size: 26px; font-weight: 800; }
        .pagina > header span { font-size: 12px; opacity: .6; }
        .pagina h3 { margin: 0 0 2mm; font-size: 15px; font-weight: 700; }
        .pagina p { margin: 0; font-size: 13px; line-height: 1.5; }
        .nota { opacity: .7; }
        .rejilla { display: grid; gap: 6mm; }
        .pagina:last-child { break-after: auto; page-break-after: auto; }
        @media print { .pagina { margin: 0; } html, body { background: none; } }
      `}</style>

      <section className="pagina" data-pagina="portada" style={{ background: hslCss(B.fondo), color: hslCss(B.texto), justifyContent: "space-between" }}>
        {logoClaro ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoClaro} alt={marca.nombre} style={{ maxHeight: "28mm", maxWidth: "70mm", objectFit: "contain", alignSelf: "flex-start" }} />
        ) : <span />}
        <div>
          <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: 64, lineHeight: 1, margin: 0 }}>{marca.nombre}</h1>
          <p style={{ fontSize: 20, marginTop: "6mm" }}>Manual de marca</p>
        </div>
        <p style={{ fontSize: 12, opacity: 0.8 }}>
          {aprobada ? `Identidad aprobada: ${aprobada.nombre}${aprobada.aprobacion ? `, el ${new Date(aprobada.aprobacion.fecha).toLocaleDateString("es-AR")}` : ""}.` : "Identidad en elaboración, sin versión aprobada."}
        </p>
      </section>

      <Pagina clave="paleta" titulo="Colores" nombre={marca.nombre} n={num("paleta")} display={display}>
        <p>Estos son los colores de la marca. Usá siempre los códigos exactos.</p>
        <div className="rejilla" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {colores.map((c) => {
            const [r, g, b] = hslToRgb(c.color);
            return (
              <div key={c.nombre} style={{ display: "flex", gap: "4mm", alignItems: "stretch" }}>
                <div style={{ width: "26mm", minHeight: "26mm", borderRadius: 8, background: hslCss(c.color), border: "1px solid rgba(0,0,0,.12)", flex: "none" }} />
                <div>
                  <h3>{c.nombre}</h3>
                  <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>HEX {hslToHex(c.color).toUpperCase()}<br />RGB {r}, {g}, {b}</p>
                  <p className="nota" style={{ fontSize: 11, marginTop: "1mm" }}>{ROLES[c.nombre] ?? "Color secundario, para sumar variedad sin perder la identidad."}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Pagina>

      <Pagina clave="tipografia" titulo="Tipografía" nombre={marca.nombre} n={num("tipografia")} display={display}>
        <div>
          <p className="nota">Títulos · {idn.tipografia.familia_variable}</p>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 110, lineHeight: 1.1 }}>Aa</div>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 30, lineHeight: 1.1 }}>{textos.h1}</div>
          <p style={{ fontFamily: display, fontSize: 15, marginTop: "3mm" }}>ABCDEFGHIJKLMNÑOPQRSTUVWXYZ abcdefghijklmnñopqrstuvwxyz 0123456789</p>
        </div>
        <div>
          <p className="nota">Texto · {familiaTexto(idn.tipografia)}</p>
          <div style={{ fontFamily: cuerpo, fontSize: 110, lineHeight: 1.1 }}>Aa</div>
          <div style={{ fontFamily: cuerpo, fontSize: 16, lineHeight: 1.45 }}>{textos.body}</div>
          <p style={{ fontFamily: cuerpo, fontSize: 15, marginTop: "3mm" }}>ABCDEFGHIJKLMNÑOPQRSTUVWXYZ abcdefghijklmnñopqrstuvwxyz 0123456789</p>
        </div>
        <p className="nota">Los títulos van en negrita y el texto en peso normal. Se usan siempre estas dos familias, sin mezclar otras.</p>
      </Pagina>

      <Pagina clave="logo" titulo="Logo" nombre={marca.nombre} n={num("logo")} display={display}>
        <div className="rejilla" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <h3>Versión a color</h3>
            <div style={{ height: "34mm", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,.12)", borderRadius: 8 }}>
              {idn.logo.color ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={idn.logo.color} alt="Logo a color" style={{ maxHeight: "22mm", maxWidth: "70%", objectFit: "contain" }} />
              ) : <span className="nota">Sin logo cargado</span>}
            </div>
          </div>
          <div>
            <h3>Monocromos</h3>
            <div style={{ display: "flex", gap: "3mm", height: "34mm" }}>
              <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {logoOscuro ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoOscuro} alt="Logo oscuro" style={{ maxHeight: "16mm", maxWidth: "80%", objectFit: "contain" }} />
                ) : null}
              </div>
              <div style={{ flex: 1, background: hslCss(B.fondo), borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {logoClaro ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoClaro} alt="Logo claro" style={{ maxHeight: "16mm", maxWidth: "80%", objectFit: "contain" }} />
                ) : null}
              </div>
            </div>
            <p className="nota" style={{ fontSize: 11, marginTop: "2mm" }}>Oscuro sobre fondos claros; claro sobre fondos oscuros o de color.</p>
          </div>
        </div>
        {versiones.length > 0 && (
          <div>
            <h3>Versiones</h3>
            <div className="rejilla" style={{ gridTemplateColumns: `repeat(${Math.min(versiones.length, 4)}, 1fr)`, gap: "4mm" }}>
              {versiones.map((v) => (
                <div key={v.id}>
                  <div style={{ height: "28mm", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,.12)", borderRadius: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={idn.logo.versiones![v.id]!.src} alt={v.nombre} style={{ maxHeight: "18mm", maxWidth: "80%", objectFit: "contain" }} />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, marginTop: "1mm" }}>{v.nombre}</p>
                  <p className="nota" style={{ fontSize: 10 }}>{v.uso}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rejilla" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <h3>Área de seguridad</h3>
            <div style={{ display: "inline-block", padding: `${14 * AREA_SEGURIDAD}mm`, border: "1.5px dashed rgba(0,0,0,.4)", position: "relative" }}>
              <div style={{ height: "14mm", display: "flex", alignItems: "center", minWidth: "40mm" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {idn.logo.color ? <img src={idn.logo.color} alt="" style={{ height: "14mm", maxWidth: "60mm", objectFit: "contain" }} /> : <b style={{ fontFamily: display }}>{marca.nombre}</b>}
              </div>
            </div>
            <p style={{ marginTop: "2mm" }}>Dejá libre el {pct}% del alto del logo por cada lado. Ningún texto ni elemento entra en esa zona.</p>
          </div>
          <div>
            <h3>Tamaño mínimo</h3>
            <p>El logo nunca se ve con menos de {LOGO_MIN_PX} px de alto en una publicación de feed ({Math.round(LOGO_MIN_PX * 1.78)} px en stories). Si no entra con ese tamaño, se usa una versión más simple.</p>
            <h3 style={{ marginTop: "5mm" }}>Sobre foto</h3>
            <p>{SOBRE_FOTO[idn.logo.sobre_foto ?? "mono"]}</p>
          </div>
        </div>
      </Pagina>

      {hayRecursos && (
        <Pagina clave="recursos" titulo="Recursos propios" nombre={marca.nombre} n={num("recursos")} display={display}>
          {formas.length > 0 && (
            <div>
              <h3>Forma</h3>
              <div style={{ display: "flex", gap: "6mm", flexWrap: "wrap" }}>
                {formas.map((f) => (
                  <svg key={f.id} viewBox="0 0 100 100" width="40mm" height="40mm" style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 8 }}>
                    <path d={f.d} fill={f.trazo ? "none" : hslCss(p.color_marca)} stroke={f.trazo ? hslCss(p.color_marca) : undefined} strokeWidth={4} fillRule={f.evenodd ? "evenodd" : undefined} transform="translate(10 10) scale(.8)" />
                  </svg>
                ))}
              </div>
              <p style={{ marginTop: "2mm" }}>Las formas propias de la marca aparecen primero en la decoración de las piezas.</p>
            </div>
          )}
          {idn.recursos?.patron_propio && formas[0] && (
            <div>
              <h3>Patrón</h3>
              <svg width="100%" height="60mm" style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,.12)" }}>
                <defs>
                  <pattern id="patron-manual" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path transform="translate(16 16) scale(.48)" d={formas[0].d} fill={formas[0].trazo ? "none" : hslCss(p.color_marca)} stroke={formas[0].trazo ? hslCss(p.color_marca) : undefined} strokeWidth={4} fillRule={formas[0].evenodd ? "evenodd" : undefined} />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#patron-manual)" />
              </svg>
              <p style={{ marginTop: "2mm" }}>El patrón repite la forma propia y se usa de fondo decorativo.</p>
            </div>
          )}
          {detalle && (
            <div>
              <h3>Detalle recurrente</h3>
              <div style={{ padding: "8mm", background: hslCss(A.fondo), border: "1px solid rgba(0,0,0,.12)", borderRadius: 8, display: "inline-block" }}>
                <span style={{ fontFamily: display, fontWeight: 800, fontSize: 28, borderBottom: detalle === "subrayado" ? `5px solid ${hslCss(p.acento)}` : undefined, outline: detalle === "marco" ? `4px solid ${hslCss(p.acento)}` : undefined, outlineOffset: 8 }}>
                  {marca.nombre}
                </span>
              </div>
              <p style={{ marginTop: "2mm" }}>{detalle === "subrayado" ? "Un subrayado en el color de acento acompaña al título." : "Un marco en el color de acento rodea la pieza."} Se repite en todas las publicaciones.</p>
            </div>
          )}
        </Pagina>
      )}

      {hayFoto && (
        <Pagina clave="fotografia" titulo="Fotografía" nombre={marca.nombre} n={num("fotografia")} display={display}>
          <div>
            <h3>Tratamiento: {tratamiento.nombre}</h3>
            <p>{tratamiento.descripcion}{idn.fotografia && idn.fotografia.tratamiento !== "natural" ? ` Intensidad: ${Math.round(idn.fotografia.intensidad * 100)}%.` : ""}</p>
          </div>
          <div>
            <h3>Dirección de arte</h3>
            {DIRECCION_DE_ARTE.map((d) => (
              <div key={d.tema} style={{ display: "grid", gridTemplateColumns: "22mm 1fr 1fr", gap: "4mm", padding: "3mm 0", borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                <b style={{ fontSize: 13 }}>{d.tema}</b>
                <p><b>Sí:</b> {d.si}</p>
                <p><b>No:</b> {d.no}</p>
              </div>
            ))}
          </div>
        </Pagina>
      )}

      <Pagina clave="ejemplos" titulo="Ejemplos de piezas" nombre={marca.nombre} n={num("ejemplos")} display={display}>
        <p>Así se ve la marca en publicaciones reales.</p>
        <div className="rejilla" style={{ gridTemplateColumns: "1fr 1fr", justifyItems: "center" }}>
          {ejemplos.map((pz) => (
            <PiezaEscalada key={pz.id} marca={marca} pieza={pz} ancho={300} />
          ))}
        </div>
      </Pagina>
    </div>
  );
}
