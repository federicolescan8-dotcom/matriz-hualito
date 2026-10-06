import { elementosInformativos, superposiciones, type Medicion, type Rect } from "@/engine/checklist";
import { FORMATOS, type Formato, type Margenes } from "@/engine/formatos";

// Capa de guías sobre la vista previa: márgenes del formato, lo que tapa o recorta la plataforma y las cajas medidas
// de cada elemento, tal como las ve el checklist. Va encima de la pieza, fuera de ella, así nunca llega al PNG. Trabaja en px de lienzo: `escala` es la de
// la vista, para que los trazos y rótulos se vean del mismo grosor en cualquier tamaño.

const COLOR_MARGEN = "#0891b2";
const COLOR_CAJA = "#c026d3";
const COLOR_DECO = "#64748b";
const COLOR_CHOQUE = "#dc2626";
const COLOR_PLATAFORMA = "#f59e0b";

function unir(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
}

export function Guias({ formato, medicion, escala }: { formato: Formato; medicion: Medicion | null; escala: number }) {
  const f = FORMATOS[formato];
  const t = 1.5 / escala;
  const rotulo = 10 / escala;
  const margen = (z: Margenes): Rect => ({
    x: f.ancho * z.x,
    y: f.alto * z.arriba,
    w: f.ancho * (1 - 2 * z.x),
    h: f.alto * (1 - z.arriba - z.abajo),
  });
  const zona = margen(f.zona);
  const minima = margen(f.zonaMinima);
  const caja = (r: Rect, color: string, estilo: "solid" | "dashed" | "dotted", nombre?: string, key?: string) => (
    <div
      key={key}
      style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, border: `${t}px ${estilo} ${color}` }}
    >
      {nombre && (
        <span
          style={{
            position: "absolute",
            left: -t,
            bottom: "100%",
            background: color,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            fontSize: rotulo,
            lineHeight: 1.3,
            padding: `0 ${rotulo * 0.4}px`,
            whiteSpace: "nowrap",
          }}
        >
          {nombre}
        </span>
      )}
    </div>
  );
  const choques = medicion ? superposiciones(medicion) : [];
  // Franja rayada: zona que la plataforma tapa o recorta.
  const franja = (r: Rect, nombre: string, lado: "arriba" | "abajo") => (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        background: `repeating-linear-gradient(45deg, ${COLOR_PLATAFORMA}55 0 ${6 / escala}px, transparent ${6 / escala}px ${14 / escala}px)`,
      }}
    >
      {nombre && (
        <span
          style={{
            position: "absolute",
            left: 4 / escala,
            [lado === "arriba" ? "top" : "bottom"]: 4 / escala,
            background: COLOR_PLATAFORMA,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            fontSize: rotulo,
            lineHeight: 1.3,
            padding: `0 ${rotulo * 0.4}px`,
            whiteSpace: "nowrap",
          }}
        >
          {nombre}
        </span>
      )}
    </div>
  );

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, width: f.ancho, height: f.alto, pointerEvents: "none" }}>
      {/* Lo que tapa la plataforma: la interfaz de stories y estados, y el recorte de la grilla 3:4 del perfil. */}
      {f.interfaz && (
        <>
          {franja({ x: 0, y: 0, w: f.ancho, h: f.alto * f.interfaz.arriba }, f.interfaz.nombre, "arriba")}
          {franja({ x: 0, y: f.alto * (1 - f.interfaz.abajo), w: f.ancho, h: f.alto * f.interfaz.abajo }, f.interfaz.nombre, "abajo")}
        </>
      )}
      {f.recorteGrilla != null && f.recorteGrilla > 0.05 && (
        <>
          {franja({ x: 0, y: 0, w: f.ancho * f.recorteGrilla, h: f.alto }, "grilla 3:4", "arriba")}
          {franja({ x: f.ancho * (1 - f.recorteGrilla), y: 0, w: f.ancho * f.recorteGrilla, h: f.alto }, "", "arriba")}
        </>
      )}
      {/* Margen de diseño (donde se ubica el contenido) y margen mínimo que exige el checklist. */}
      {caja(zona, COLOR_MARGEN, "dashed")}
      {(minima.x !== zona.x || minima.y !== zona.y || minima.h !== zona.h) && caja(minima, COLOR_MARGEN, "dotted")}
      {f.columnaMensaje && (
        <div style={{ position: "absolute", left: f.ancho * f.columnaMensaje, top: 0, bottom: 0, borderLeft: `${t}px dashed ${COLOR_MARGEN}` }} />
      )}
      {medicion?.decoracion && (
        <svg style={{ position: "absolute", inset: 0, overflow: "hidden" }} width={f.ancho} height={f.alto}>
          {medicion.decoracion.circulos.map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke={COLOR_DECO} strokeWidth={t} strokeDasharray={`${6 / escala} ${4 / escala}`} />
          ))}
        </svg>
      )}
      {medicion?.deco &&
        (medicion.deco.circulo ? (
          <div
            style={{
              position: "absolute",
              left: medicion.deco.circulo.cx - medicion.deco.circulo.r,
              top: medicion.deco.circulo.cy - medicion.deco.circulo.r,
              width: medicion.deco.circulo.r * 2,
              height: medicion.deco.circulo.r * 2,
              borderRadius: "50%",
              border: `${t}px dashed ${COLOR_DECO}`,
            }}
          />
        ) : medicion.deco.contorno?.length ? (
          <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={f.ancho} height={f.alto}>
            <polygon
              points={medicion.deco.contorno.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={COLOR_DECO}
              strokeWidth={t}
              strokeDasharray={`${6 / escala} ${4 / escala}`}
            />
          </svg>
        ) : (
          caja(medicion.deco.caja, COLOR_DECO, "dashed", "deco")
        ))}
      {medicion && elementosInformativos(medicion).map((e) => caja(unir(e.cajas), COLOR_CAJA, "solid", e.nombre, e.nombre))}
      {choques.map((k, i) => (
        <div
          key={i}
          style={{ position: "absolute", left: k.zona.x, top: k.zona.y, width: k.zona.w, height: k.zona.h, background: `${COLOR_CHOQUE}66`, outline: `${t}px solid ${COLOR_CHOQUE}` }}
        />
      ))}
    </div>
  );
}
