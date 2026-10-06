"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { contraste, hslCss, type HSL } from "@/engine/color";
import { BIBLIOTECA_RUBRO, CONTACTO, OPACIDAD_ICONO_DECO, OPACIDAD_PATRON, OVERLAY_FOTO } from "@/engine/biblioteca";
import { evaluarPieza, type Medicion, type ResultadoChecklist } from "@/engine/checklist";
import type { Marca } from "@/engine/diagnostico";
import { FORMATOS } from "@/engine/formatos";
import { coloresModo, estiloCta, estiloCtaSobre, fondoCapaDecorativa, MIN_GRAFICO, opacidadSegura } from "@/engine/palette";
import {
  decoEfectiva,
  estiloIconos,
  geometria2BLImagen,
  modoDeco,
  MAX_CONTACTO,
  maxItems,
  plantillaPara,
  type Deco,
  type Pieza as TPieza,
} from "@/engine/pieza";
import { compensacionOptica, FACTOR_STORY, familiaTexto, pesoH1 } from "@/engine/typography";
import { asegurarFamilias, cargarFuentePropia, fontFamily } from "@/lib/fuentes";
import { ajustarTexto, medirPieza } from "@/lib/medicion";
import { decoracionEfectiva, SOMBRA_DECORACION, trazadoDecoracion, type GeometriaDecoracion } from "@/engine/decoraciones";
import { FormaRellena, FormaSvg, FotoEnForma, Icono } from "./Graficos";

/**
 * Pieza a tamaño real de lienzo (p. ej. 1080×1350). La misma pieza se usa en la vista previa (escalada con CSS) y
 * en el render a PNG, así lo que se ve es lo que se exporta. Al montarse ajusta el texto a los slots, mide el
 * resultado y corre el checklist; cuando termina marca `data-listo="true"`.
 *
 * Orden de capas fijo (cap. 6): fondo y forma de fondo → capa decorativa o foto → texto e íconos.
 */
export function Pieza({
  marca,
  pieza,
  onResultado,
}: {
  marca: Marca;
  pieza: TPieza;
  onResultado?: (r: ResultadoChecklist, m: Medicion) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const f = FORMATOS[pieza.formato];
  // El body se compensa por la familia de texto (la del par, si hay; E3).
  const plantilla = plantillaPara(pieza.variante, pieza.formato, familiaTexto(marca.identidad.tipografia));
  // Compensación óptica de la familia para el texto secundario (los datos de contacto; el body ya viene en la plantilla).
  const kOptico = compensacionOptica(familiaTexto(marca.identidad.tipografia));
  const fuenteTexto = fontFamily(familiaTexto(marca.identidad.tipografia));
  const horizontal = f.columnaMensaje != null;
  const escala = f.escala === "story" ? FACTOR_STORY : 1;
  const px = (v: number) => Math.round(v * escala);
  const p = marca.identidad.paleta;
  const c = coloresModo(p, pieza.modo);
  const cta = estiloCta(p, pieza.modo);
  const estilo = estiloIconos(marca);
  const logoSrc = marca.identidad.logo[c.logo];
  const colorTextoMarca = p.version_funcional ?? p.color_marca;
  const centrado = pieza.alineacion === "centrado";
  const italica = pieza.body_italica && marca.identidad.tipografia.italic_habilitado;
  const { h1, body } = pieza.contenido;
  const ctaTexto = plantilla.tieneCta ? pieza.contenido.cta?.trim() : null;
  const deco = plantilla.deco ? decoEfectiva(marca, pieza) : null;
  // 2B-L con foto o ícono (v1.1): círculo del 80% del ancho. En 1200×630 el mensaje ya ocupa la mitad izquierda y sigue
  // con la forma sangrada.
  // 2B-L en formatos verticales: la misma estructura con las dos opciones de capa (v1.1). "Imagen o ícono" va en un
  // círculo; "figura y patrón" usa la forma elegida en el mismo lugar y tamaño.
  const lateralVertical = deco != null && pieza.variante === "2B-L" && !horizontal;
  const decoImagen = deco != null && modoDeco(deco.relleno) === "imagen";
  const g = geometria2BLImagen(pieza.formato);
  const contacto = plantilla.bloque === "contacto" ? (pieza.contacto ?? []).filter((d) => d.valor.trim()).slice(0, MAX_CONTACTO) : [];
  const items = plantilla.bloque === "catalogo" ? (pieza.items ?? []).slice(0, maxItems(pieza.formato)) : [];

  // Íconos informativos: color de marca en Modo A; en Modo B, acento si contrasta con la marca, si no el neutro.
  const colorInfo: HSL = pieza.modo === "A" ? c.texto : contraste(p.acento, p.color_marca) >= MIN_GRAFICO ? p.acento : c.texto;

  // La forma de fondo va solo cuando no hay capa decorativa ni ítems con su propia forma: nunca dos formas
  // protagonistas (cap. 6).
  // Decoración de plantilla (v1.1): reemplaza a la forma de fondo automática.
  const decoracion = decoracionEfectiva(pieza);
  // La decoración puede ir en un secundario de la paleta extendida (E3): es masa, nunca texto, y su opacidad en Modo A
  // se limita para que el texto que pase por encima siga cumpliendo.
  const colorDeco = (pieza.color_decoracion != null && marca.identidad.paleta_extendida?.secundarios[pieza.color_decoracion]?.color) || p.tono_apoyo;
  const geoDecoracion = decoracion?.geometria(pieza.formato) ?? null;
  const conFormaFondo = !plantilla.deco && plantilla.bloque !== "catalogo" && !decoracion;
  const formaColor = pieza.modo === "A" ? c.apoyo : p.fondo_neutro;
  const formaOpacidad = opacidadSegura(c.fondo, formaColor, c.texto, pieza.modo === "A" ? 0.35 : 0.12);

  const onResultadoRef = useRef(onResultado);
  useLayoutEffect(() => {
    onResultadoRef.current = onResultado;
  });

  // Solo lo que cambia el layout: el id de la pieza no cuenta.
  const clave = JSON.stringify([{ ...pieza, id: null }, p, marca.identidad.tipografia, marca.identidad.graficos, marca.identidad.logo[c.logo]?.length]);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let vigente = true;
    root.dataset.listo = "false";
    const imagenes = [...root.querySelectorAll("image, img")].map((el) =>
      el instanceof HTMLImageElement ? el.decode().catch(() => undefined) : Promise.resolve(),
    );
    // La fuente propia de la marca (E3) se registra antes de medir.
    const fuentes = cargarFuentePropia(marca.identidad.tipografia.propia)
      .then(() => asegurarFamilias([marca.identidad.tipografia.familia_variable, familiaTexto(marca.identidad.tipografia)]))
      .then(() => document.fonts.ready);
    Promise.all([fuentes, ...imagenes]).then(() => {
      if (!vigente) return;
      const desborde = ajustarTexto(root, plantilla, f.alto, escala, lateralVertical ? g.posiciones : undefined);
      const medicion = medirPieza(root, desborde);
      const resultado = evaluarPieza(marca, pieza, medicion);
      root.dataset.listo = "true";
      onResultadoRef.current?.(resultado, medicion);
    });
    return () => {
      vigente = false;
    };
    // `clave` resume todo lo que cambia el layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const justificar = centrado ? "center" : "flex-start";

  /** Logo en la versión que corresponde al fondo inmediato (cap. 6). Sin logo cargado, el nombre en texto. */
  const logoCon = (version: "color" | "mono_claro" | "mono_oscuro", fondoLogo: HSL) => {
    const src = marca.identidad.logo[version] ?? logoSrc;
    const colorNombre = [c.texto, p.fondo_neutro, colorTextoMarca].sort((a, b) => contraste(b, fondoLogo) - contraste(a, fondoLogo))[0];
    return (
      <div style={{ display: "flex", flexShrink: 0, alignItems: "center", height: px(plantilla.logoPx), justifyContent: justificar }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img data-slot="logo" src={src} alt="" style={{ height: "100%", width: "auto", maxWidth: "70%", objectFit: "contain" }} />
        ) : (
          <span data-slot="logo" style={{ color: hslCss(colorNombre), fontSize: px(40), fontWeight: 600, lineHeight: 1.1 }}>
            {marca.nombre}
          </span>
        )}
      </div>
    );
  };
  // Carrusel (v1.1): los slides de contenido llevan el indicador de posición en el lugar del logo.
  const enCarrusel = pieza.carrusel;
  const indicador = enCarrusel && (
    <div style={{ display: "flex", flexShrink: 0, alignItems: "center", height: px(60), justifyContent: justificar }}>
      <span data-slot="indicador" style={{ color: hslCss(c.texto), fontSize: px(28), fontWeight: 600, letterSpacing: "0.08em" }}>
        {enCarrusel.indice} / {enCarrusel.total}
      </span>
    </div>
  );
  const logo = enCarrusel?.rol === "contenido" ? indicador : logoCon(c.logo, c.fondo);
  // Número grande del punto (variante P): en acento si contrasta con el fondo, si no en el color del texto.
  const colorNumero = contraste(p.acento, c.fondo) >= MIN_GRAFICO ? p.acento : c.texto;

  const bodyEstilo: React.CSSProperties = {
    margin: 0,
    fontFamily: fuenteTexto,
    color: hslCss(c.texto),
    fontSize: "var(--body)",
    fontWeight: 400,
    lineHeight: 1.38,
  };

  const listaContacto = contacto.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: px(18), alignItems: justificar }}>
      {contacto.map((d, i) => (
        // El ícono va siempre a la izquierda del dato, también con alineación centrada (cap. 6).
        <div key={i} data-slot="contacto-item" style={{ display: "flex", alignItems: "center", gap: px(18) }}>
          {pieza.soporte_iconos ? (
            // Soporte del ícono (v1.1): cuadrado redondeado en el color del texto con el ícono en el color del fondo,
            // el mismo par que ya cumple contraste en el texto.
            <span
              data-slot="contacto-icono"
              data-soporte={JSON.stringify({ fondo: c.texto, icono: c.fondo })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: px(horizontal ? 46 : 58),
                height: px(horizontal ? 46 : 58),
                borderRadius: px(horizontal ? 11 : 14),
                background: hslCss(c.texto),
                boxShadow: `0 0 ${SOMBRA_DECORACION.desenfoque}px rgba(0,0,0,${SOMBRA_DECORACION.opacidad * 0.6})`,
              }}
            >
              <Icono nombre={CONTACTO[d.tipo].icono} estilo={estilo} color={c.fondo} tamano={px(horizontal ? 32 : 40)} />
            </span>
          ) : (
            <Icono slot="contacto-icono" nombre={CONTACTO[d.tipo].icono} estilo={estilo} color={colorInfo} tamano={px(horizontal ? 36 : 44)} />
          )}
          <span data-slot="contacto-texto" style={{ ...bodyEstilo, fontSize: px((horizontal ? 26 : 30) * kOptico) }}>
            {d.valor}
          </span>
        </div>
      ))}
    </div>
  );

  const mensaje = (extra?: React.ReactNode, estiloZona?: React.CSSProperties, despues?: React.ReactNode) => (
    <div data-slot="mensaje" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", ...estiloZona }}>
      <div data-slot="mensaje-contenido" style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: horizontal ? px(16) : px(28), alignItems: justificar }}>
        <h1
          data-slot="h1"
          style={{
            margin: 0,
            width: "100%",
            color: hslCss(c.texto),
            fontSize: "var(--h1)",
            fontWeight: pesoH1(h1, marca.identidad.tipografia.familia_variable),
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            overflowWrap: "normal",
          }}
        >
          {h1 || " "}
        </h1>
        {body?.trim() && (
          <p data-slot="body" style={{ ...bodyEstilo, maxWidth: "88%", fontStyle: italica ? "italic" : "normal" }}>
            {body}
          </p>
        )}
        {extra}
      </div>
      {despues}
    </div>
  );

  /** `angosto`: columna estrecha (2B-L con imagen), el botón va en una línea con menos relleno lateral. */
  const botonCtaCon = (e: typeof cta, angosto = false) =>
    ctaTexto && (
      <div style={{ display: "flex", justifyContent: justificar, padding: e.anillo ? e.anillo.px : 0, flexShrink: 0 }}>
        <span
          data-slot="cta"
          data-cta-fondo={JSON.stringify(e.fondo)}
          style={{
            display: "inline-block",
            background: hslCss(e.fondo),
            color: hslCss(e.texto),
            fontSize: "var(--cta)",
            fontWeight: 600,
            fontFamily: fuenteTexto,
            padding: horizontal ? `${px(14)}px ${px(32)}px` : `${px(22)}px ${px(angosto ? 32 : 46)}px`,
            whiteSpace: angosto ? "var(--cta-salto, nowrap)" : undefined,
            textAlign: "center",
            borderRadius: 999,
            boxShadow: e.anillo ? `0 0 0 ${e.anillo.px}px ${hslCss(e.anillo.color)}` : undefined,
          }}
        >
          {ctaTexto}
        </span>
      </div>
    );
  const botonCta = botonCtaCon(cta);

  // ── Capa decorativa 2B (v1.1): forma grande sangrada contra el borde derecho, alineada con el bloque del mensaje ──
  const zonaArriba = f.alto * f.zona.arriba;
  const zonaAbajo = f.alto * (1 - f.zona.abajo);
  const bloqueAbajo = zonaAbajo - px(plantilla.logoPx) - (horizontal ? px(20) : px(36));
  // Diámetro de la forma: el alto del bloque título + texto + CTA, sin comerse más del 40% del ancho de la pieza.
  const diametroDeco = horizontal
    ? f.alto * 0.95
    : Math.min((bloqueAbajo - zonaArriba) * 0.95, f.ancho * (pieza.formato === "9:16" ? 0.7 : 0.8));
  const centroDecoY = horizontal ? f.alto / 2 : (zonaArriba + bloqueAbajo) / 2;
  // 2B-S en formatos verticales: cúpula. Un círculo de 1,3 veces el ancho con el centro bajo el borde inferior, que
  // asoma ~38% del alto. A la altura del CTA ya cubre todo el ancho, así el CTA y el logo se apoyan enteros sobre ella.
  const cupula = deco && pieza.variante === "2B-S" && !horizontal;
  const diametroCupula = f.ancho * 1.3;
  const altoCupula = f.alto * (pieza.formato === "1:1" ? 0.4 : 0.38);
  const topeCupula = f.alto - altoCupula;
  const fondoCupula = deco ? fondoCapaDecorativa(p, deco.relleno) : c.fondo;
  const decoCupula = cupula ? (
    <div
      style={{
        position: "absolute",
        left: (f.ancho - diametroCupula) / 2,
        top: topeCupula,
        width: diametroCupula,
        height: diametroCupula,
      }}
    >
      <CapaDecorativa
        deco={deco}
        marca={marca}
        modo={pieza.modo}
        estilo={estilo}
        tamanoPx={diametroCupula}
        // El lienzo recorta la cúpula a lo ancho: se ve la franja central del círculo.
        visible={{ x: 50 - (50 * f.ancho) / diametroCupula, y: 0, w: (100 * f.ancho) / diametroCupula, h: (altoCupula / diametroCupula) * 100 }}
        // Ícono a la derecha, lejos del CTA y el logo que se apoyan a la izquierda.
        zonaIcono={{ x: 52, y: 0, w: 34, h: (altoCupula / diametroCupula) * 100 }}
      />
    </div>
  ) : null;
  // CTA y logo sobre la cúpula: se validan contra el relleno (tono de apoyo, o la foto con overlay de marca).
  const ctaSobreCupula = cupula ? estiloCtaSobre(p, fondoCupula) : null;
  const logoSobreCupula: "mono_claro" | "mono_oscuro" =
    deco?.relleno === "foto" || contraste(fondoCupula, { H: 0, S: 0, L: 100 }) >= MIN_GRAFICO ? "mono_claro" : "mono_oscuro";

  // El borde izquierdo del círculo es la variable --deco-izq: el ajuste de texto lo corre al 60% si hace falta lugar.
  const visibleCirculo = { x: 0, y: 0, w: ((f.ancho - g.posiciones[0]) / g.diametro) * 100, h: 100 };
  const anchoMinVisible = ((f.ancho - g.posiciones[g.posiciones.length - 1]) / g.diametro) * 100;
  // El ajuste de texto y el checklist miden contra el contorno real: el círculo exacto, o la forma muestreada.
  const decoLateral = lateralVertical ? (
    <div
      data-deco-lateral
      data-circulo={deco.forma === "circulo" ? "" : undefined}
      style={{ position: "absolute", left: "var(--deco-izq)", top: g.arriba, width: g.diametro, height: g.diametro }}
    >
      <CapaDecorativa
        deco={deco}
        marca={marca}
        modo={pieza.modo}
        estilo={estilo}
        tamanoPx={g.diametro}
        visible={visibleCirculo}
        // La foto del círculo es protagonista: va natural, sin overlay de marca (no lleva texto encima).
        sinOverlay={decoImagen}
        // Ícono centrado en la parte que se ve con el círculo en su posición más a la derecha.
        zonaIcono={{ x: 4, y: 0, w: anchoMinVisible - 8, h: 100 }}
      />
    </div>
  ) : null;

  const decoSangrada =
    deco && !lateralVertical && (pieza.variante === "2B-L" || (pieza.variante === "2B-S" && horizontal)) ? (
      <div
        style={{
          position: "absolute",
          left: f.ancho - diametroDeco / 2,
          top: centroDecoY - diametroDeco / 2,
          width: diametroDeco,
          height: diametroDeco,
        }}
      >
        <CapaDecorativa
          deco={deco}
          marca={marca}
          modo={pieza.modo}
          estilo={estilo}
          tamanoPx={diametroDeco}
          visible={{ x: 0, y: 0, w: 50, h: 100 }}
          zonaIcono={{ x: 4, y: 0, w: 46, h: 100 }}
        />
      </div>
    ) : null;
  const capaDeco = null;

  const catalogo = items.length > 0 && (
    <Catalogo
      items={items}
      marca={marca}
      modo={pieza.modo}
      estilo={estilo}
      colorInfo={colorInfo}
      colorTexto={c.texto}
      gap={GAP_ITEMS}
      tamano={
        horizontal
          ? Math.min((f.ancho * (1 - f.columnaMensaje!) - f.ancho * f.zona.x - 40 - GAP_ITEMS * (items.length - 1)) / items.length, f.alto * 0.42)
          : Math.min((f.ancho * (1 - 2 * f.zona.x) - GAP_ITEMS * (items.length - 1)) / items.length, f.alto * (pieza.formato === "9:16" ? 0.2 : 0.24))
      }
      textoPx={px(horizontal ? 24 : 28)}
      centrado={centrado}
    />
  );

  // ── Composición por variante ──
  const zonaBase: React.CSSProperties = {
    position: "absolute",
    left: f.ancho * f.zona.x,
    top: f.alto * f.zona.arriba,
    bottom: f.alto * f.zona.abajo,
    display: "flex",
    flexDirection: "column",
    gap: horizontal ? px(20) : px(36),
    textAlign: centrado ? "center" : "left",
  };
  // Horizontal: el mensaje ocupa la mitad izquierda; el elemento lateral (deco, contacto o ítems), la derecha.
  const lateral = horizontal && (decoSangrada || capaDeco || listaContacto || catalogo);
  const derechaCol = horizontal
    ? f.ancho * (1 - f.columnaMensaje!)
    : decoSangrada
      ? diametroDeco / 2 + 40
      : f.ancho * f.zona.x;
  const colIzq: React.CSSProperties = { ...zonaBase, right: derechaCol };
  const colDer: React.CSSProperties = {
    position: "absolute",
    left: f.ancho * f.columnaMensaje! + 40,
    right: f.ancho * f.zona.x,
    top: f.alto * f.zona.arriba,
    bottom: f.alto * f.zona.abajo,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  let contenidoPieza: React.ReactNode;
  if (horizontal) {
    contenidoPieza = (
      <>
        <div data-columna style={colIzq}>
          {(pieza.variante === "1" || pieza.variante === "4") && logo}
          {pieza.variante === "2B-L" || pieza.variante === "2B-S" ? mensaje(botonCta) : mensaje()}
          {pieza.variante !== "2B-L" && pieza.variante !== "2B-S" && botonCta}
          {pieza.variante !== "1" && pieza.variante !== "4" && logo}
        </div>
        {decoSangrada}
        {lateral && !decoSangrada && <div style={colDer}>{capaDeco || listaContacto || catalogo}</div>}
      </>
    );
  } else if (lateralVertical) {
    // H1 y body arrancan a la altura del círculo, el logo cierra abajo y el CTA queda en el punto medio exacto entre el
    // final del body y el logo (dos separadores iguales).
    const separador = <div style={{ flex: "1 1 0", minHeight: px(28) }} />;
    contenidoPieza = (
      <>
        {decoLateral}
        <div
          data-columna
          // La columna arranca en la zona segura y el texto baja hasta el borde del círculo con un relleno: así las
          // ascendentes que sobresalen del renglón no cuentan como fuera de la columna.
          style={{
            ...zonaBase,
            top: zonaArriba,
            paddingTop: `max(0px, ${g.textoArriba - zonaArriba}px - var(--h1-mayuscula, 0px))`,
            bottom: f.alto - g.logoAbajo,
            // La columna pasa el borde izquierdo del círculo: arriba y abajo la curva deja lugar. Que ninguna línea
            // de texto ni el CTA toquen el círculo lo controla el ajuste de texto contra el círculo real.
            right: `calc(${f.ancho - ANCHO_SOBRE_CIRCULO}px - var(--deco-izq))`,
            gap: 0,
          }}
        >
          {mensaje(undefined, { justifyContent: "flex-start" }, <>{separador}{botonCtaCon(cta, true)}{separador}</>)}
          {logo}
        </div>
      </>
    );
  } else if (pieza.variante === "2B-L") {
    contenidoPieza = (
      <>
        {decoSangrada}
        <div data-columna style={colIzq}>
          {/* Título, texto y CTA forman un solo bloque centrado, a la altura de la forma. */}
          {mensaje(botonCta)}
          {logo}
        </div>
      </>
    );
  } else if (pieza.variante === "2B-S") {
    contenidoPieza = (
      <>
        {decoCupula}
        <div data-columna style={colIzq}>
          {/* El mensaje ocupa lo que queda arriba de la cúpula; CTA y logo se apoyan sobre ella. */}
          <div style={{ height: topeCupula - zonaArriba - px(36), flexShrink: 0, display: "flex", flexDirection: "column" }}>{mensaje()}</div>
          <div style={{ flex: 1 }} />
          {botonCtaCon(ctaSobreCupula!)}
          {logoCon(logoSobreCupula, fondoCupula)}
        </div>
      </>
    );
  } else if (pieza.variante === "P") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        <div
          data-slot="numero"
          style={{
            flexShrink: 0,
            color: hslCss(colorNumero),
            fontSize: px(210),
            fontWeight: pesoH1("", marca.identidad.tipografia.familia_variable),
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
          }}
        >
          {String(enCarrusel?.punto ?? 1).padStart(2, "0")}
        </div>
        {mensaje(undefined, { justifyContent: "flex-start" })}
        {logo}
      </div>
    );
  } else if (pieza.variante === "3") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {mensaje(listaContacto)}
        {logo}
      </div>
    );
  } else if (pieza.variante === "4") {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {logo}
        {mensaje(undefined, { flex: "0 0 auto" })}
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: justificar }}>{catalogo}</div>
        {botonCta}
      </div>
    );
  } else {
    contenidoPieza = (
      <div data-columna style={colIzq}>
        {pieza.variante === "1" && logo}
        {/* Con una decoración de bloque centrado, el logo acompaña al mensaje y el conjunto queda centrado en alto. */}
        {decoracion?.bloque === "centrado" ? mensaje(logo) : mensaje()}
        {pieza.variante === "1" && botonCta}
        {pieza.variante === "2" && decoracion?.bloque !== "centrado" && logo}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-pieza
      style={{
        position: "relative",
        width: f.ancho,
        height: f.alto,
        overflow: "hidden",
        background: hslCss(c.fondo),
        fontFamily: fontFamily(marca.identidad.tipografia.familia_variable),
        ["--h1" as string]: `${px(plantilla.h1.max)}px`,
        ["--body" as string]: `${px(plantilla.body.max)}px`,
        ["--cta" as string]: `${px(plantilla.cta)}px`,
        ["--deco-izq" as string]: `${g.izquierda}px`,
      }}
    >
      {conFormaFondo && (
        <div
          data-slot="forma"
          data-color={JSON.stringify(formaColor)}
          style={{
            position: "absolute",
            // Horizontal: la forma ocupa la mitad derecha, que el mensaje deja libre.
            ...(horizontal && !lateral
              ? { width: f.alto * 1.25, height: f.alto * 1.25, right: -f.alto * 0.1, top: -f.alto * 0.12 }
              : { width: f.ancho * 0.72, height: f.ancho * 0.72, right: -f.ancho * 0.24, bottom: -f.ancho * 0.2 }),
            borderRadius: "50%",
            background: hslCss(formaColor),
            opacity: horizontal && lateral ? formaOpacidad * 0.5 : formaOpacidad,
          }}
        />
      )}
      {geoDecoracion && <CapaDecoracion geometria={geoDecoracion} ancho={f.ancho} alto={f.alto} color={colorDeco} opacidad={pieza.modo === "B" ? 1 : opacidadSegura(c.fondo, colorDeco, c.texto, 0.35)} />}
      {contenidoPieza}
      {enCarrusel?.rol === "portada" && (
        // Portada del carrusel: la señal para deslizar, abajo a la derecha (el logo va a la izquierda).
        <div
          style={{
            position: "absolute",
            right: f.ancho * f.zona.x,
            bottom: f.alto * f.zona.abajo,
            height: px(plantilla.logoPx),
            display: "flex",
            alignItems: "center",
          }}
        >
          <span data-slot="senal" style={{ color: hslCss(c.texto), fontSize: px(30), fontWeight: 600 }}>
            Deslizá →
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Decoración de plantilla (v1.1): figuras en tono de apoyo con una sombra mínima hacia el fondo. Va sobre el fondo y
 * debajo del texto; su geometría queda en `data-decoracion` para el ajuste de texto y el checklist.
 */
function CapaDecoracion({
  geometria,
  ancho,
  alto,
  color,
  opacidad,
}: {
  geometria: GeometriaDecoracion;
  ancho: number;
  alto: number;
  color: HSL;
  opacidad: number;
}) {
  const uid = useId().replace(/:/g, "");
  const { d } = trazadoDecoracion(geometria, ancho, alto);
  return (
    <svg
      data-slot="decoracion"
      data-decoracion={JSON.stringify(geometria)}
      width={ancho}
      height={alto}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id={`s${uid}`} filterUnits="userSpaceOnUse" x={-100} y={-100} width={ancho + 200} height={alto + 200}>
          <feDropShadow dx={0} dy={0} stdDeviation={SOMBRA_DECORACION.desenfoque} floodColor="#000" floodOpacity={SOMBRA_DECORACION.opacidad} />
        </filter>
      </defs>
      <g filter={`url(#s${uid})`} opacity={opacidad}>
        <path d={d} fill={hslCss(color)} />
      </g>
    </svg>
  );
}

/**
 * Capa decorativa de las variantes 2B (v1.1): una forma de la biblioteca rellena con foto (overlay de marca 65%) o,
 * sin foto, con tono de apoyo más un patrón (marca al 18%) o un ícono grande (fondo neutro al 25%).
 */
function CapaDecorativa({
  deco,
  marca,
  modo,
  estilo,
  tamanoPx,
  visible,
  zonaIcono,
  sinOverlay = false,
}: {
  deco: Deco;
  marca: Marca;
  modo: "A" | "B";
  estilo: "lineal" | "solido";
  tamanoPx: number;
  visible?: { x: number; y: number; w: number; h: number };
  zonaIcono?: { x: number; y: number; w: number; h: number };
  sinOverlay?: boolean;
}) {
  const p = marca.identidad.paleta;
  const opacidadPatron = OPACIDAD_PATRON.max - 0.02;
  const opacidadIcono = OPACIDAD_ICONO_DECO.max;
  // El valor que mide el checklist depende del relleno: opacidad y color del patrón o del ícono, u overlay de la foto.
  const medida =
    deco.relleno === "foto"
      ? { opacidad: 1, color: p.color_marca }
      : deco.relleno === "patron"
        ? { opacidad: opacidadPatron, color: p.color_marca }
        : { opacidad: opacidadIcono, color: p.fondo_neutro };
  return (
    <div
      data-slot="deco"
      data-deco-tipo={deco.relleno}
      data-deco-forma={deco.forma}
      data-opacidad={medida.opacidad}
      data-overlay={deco.relleno === "foto" && !sinOverlay ? OVERLAY_FOTO.uso : undefined}
      data-protagonista={sinOverlay ? "true" : undefined}
      data-color={JSON.stringify(medida.color)}
      data-modo={modo}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <FormaRellena
        formaId={deco.forma}
        relleno={deco.relleno}
        fondo={p.tono_apoyo}
        foto={deco.foto}
        overlay={sinOverlay ? undefined : { color: p.color_marca, opacidad: OVERLAY_FOTO.uso }}
        patron={deco.patron}
        colorPatron={p.color_marca}
        opacidadPatron={opacidadPatron}
        icono={deco.icono}
        estiloIcono={estilo}
        colorIcono={p.fondo_neutro}
        opacidadIcono={opacidadIcono}
        visible={visible}
        zonaIcono={zonaIcono}
        tamanoPx={tamanoPx}
      />
    </div>
  );
}

/** 2B-L con imagen: cuánto pasa la columna del mensaje el borde izquierdo del círculo, en px. */
const ANCHO_SOBRE_CIRCULO = 40;

/** Separación entre ítems del catálogo, en px. El tamaño de cada ítem se calcula con este mismo valor. */
const GAP_ITEMS = 28;

/** Ítems del catálogo (variante 4): foto dentro de forma de contención o ícono, más un texto corto. */
function Catalogo({
  items,
  marca,
  modo,
  estilo,
  colorInfo,
  colorTexto,
  tamano,
  gap,
  textoPx,
  centrado,
}: {
  items: NonNullable<TPieza["items"]>;
  marca: Marca;
  modo: "A" | "B";
  estilo: "lineal" | "solido";
  colorInfo: HSL;
  colorTexto: HSL;
  tamano: number;
  gap: number;
  textoPx: number;
  centrado: boolean;
}) {
  const p = marca.identidad.paleta;
  const contenedor = BIBLIOTECA_RUBRO[marca.rubro].contenedores[0];
  const lado = Math.floor(tamano);
  return (
    <div style={{ display: "flex", gap, justifyContent: centrado ? "center" : "flex-start", alignItems: "flex-start" }}>
      {items.map((it, i) => (
        <div key={i} data-slot="item" style={{ width: lado, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div data-slot="item-visual" style={{ width: lado, height: lado, position: "relative" }}>
            {it.foto ? (
              <FotoEnForma foto={it.foto} formaId={contenedor} style={{ width: "100%", height: "100%" }} />
            ) : (
              <>
                <FormaSvg id={contenedor} color={modo === "A" ? p.tono_apoyo : p.fondo_neutro} opacidad={modo === "A" ? 0.35 : 0.15} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                {it.icono && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icono nombre={it.icono} estilo={estilo} color={colorInfo} tamano={Math.round(lado * 0.46)} />
                  </div>
                )}
              </>
            )}
          </div>
          <span data-slot="item-texto" style={{ color: hslCss(colorTexto), fontFamily: fontFamily(familiaTexto(marca.identidad.tipografia)), fontSize: textoPx, fontWeight: 400, lineHeight: 1.25, textAlign: "center" }}>
            {it.texto}
          </span>
        </div>
      ))}
    </div>
  );
}
