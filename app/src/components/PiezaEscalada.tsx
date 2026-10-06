import { Pieza } from "@/components/Pieza";
import type { Marca } from "@/engine/diagnostico";
import { FORMATOS } from "@/engine/formatos";
import type { Pieza as TPieza } from "@/engine/pieza";

/** Una pieza real dibujada a tamaño completo y escalada con CSS (lo que se ve es lo que se exporta). */
export function PiezaEscalada({ marca, pieza, ancho }: { marca: Marca; pieza: TPieza; ancho: number }) {
  const f = FORMATOS[pieza.formato];
  const k = ancho / f.ancho;
  return (
    <div style={{ width: ancho, height: f.alto * k, overflow: "hidden", position: "relative" }}>
      <div style={{ transform: `scale(${k})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0 }}>
        <Pieza marca={marca} pieza={pieza} />
      </div>
    </div>
  );
}
