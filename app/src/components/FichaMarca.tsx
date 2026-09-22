import { contraste, hslCss, hslToHex, type HSL } from "@/engine/color";
import { colorTextoAcento, coloresModo, MIN_GRAFICO, MIN_TEXTO } from "@/engine/palette";
import { pendientesMarca, type Marca } from "@/engine/diagnostico";
import { PRESETS } from "@/engine/presets";
import { escala, PESOS } from "@/engine/typography";
import { fontFamily } from "@/lib/fuentes";
import { PiezaMuestra } from "./PiezaMuestra";

function Ratio({ valor, minimo }: { valor: number; minimo: number }) {
  const ok = valor >= minimo;
  return (
    <span className={`font-mono text-xs ${ok ? "text-emerald-700" : "text-red-700"}`}>
      {valor.toFixed(1)}:1 {ok ? "✓" : `✗ (mín. ${minimo})`}
    </span>
  );
}

function Muestra({ nombre, color, nota, children }: { nombre: string; color: HSL; nota: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-20 rounded-md border border-black/10" style={{ background: hslCss(color) }} />
      <div className="text-sm font-medium">{nombre}</div>
      <div className="font-mono text-xs text-neutral-600">
        {hslToHex(color).toUpperCase()} · H{color.H} S{color.S} L{color.L}
      </div>
      <div className="text-xs text-neutral-500">{nota}</div>
      {children}
    </div>
  );
}

export function FichaMarca({ marca }: { marca: Marca }) {
  const p = marca.paleta;
  const preset = PRESETS[marca.rubro];
  const A = coloresModo(p, "A");
  const B = coloresModo(p, "B");
  const familia = fontFamily(marca.tipografia.familia_variable);
  const pendientes = pendientesMarca(marca.diagnostico);
  const secuencia = p.invertir_modo
    ? preset.secuencia.map((m) => (m === "A" ? "B" : "A"))
    : preset.secuencia;

  return (
    <div className="flex flex-col gap-10">
      <section className="grid max-w-3xl gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Modo A · claro</h3>
          <PiezaMuestra paleta={p} tipografia={marca.tipografia} rubro={marca.rubro} modo="A" nombre={marca.nombre} logo={marca.logo} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Modo B · bold</h3>
          <PiezaMuestra paleta={p} tipografia={marca.tipografia} rubro={marca.rubro} modo="B" nombre={marca.nombre} logo={marca.logo} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Paleta</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Muestra nombre="Color de marca" color={p.color_marca} nota={marca.color.modo === "heredado" ? "Heredado del cliente" : "Chip optimizado"}>
            <div className="text-xs">vs. fondo: <Ratio valor={contraste(p.color_marca, p.fondo_neutro)} minimo={p.version_funcional ? MIN_GRAFICO : MIN_TEXTO} /></div>
          </Muestra>
          {p.version_funcional && (
            <Muestra nombre="Versión funcional" color={p.version_funcional} nota="Texto, íconos y elementos finos">
              <div className="text-xs">vs. fondo: <Ratio valor={contraste(p.version_funcional, p.fondo_neutro)} minimo={MIN_TEXTO} /></div>
            </Muestra>
          )}
          <Muestra nombre="Tono de apoyo" color={p.tono_apoyo} nota="Masas de forma. Nunca texto ni íconos." />
          <Muestra nombre="Fondo neutro" color={p.fondo_neutro} nota="Base y espacio negativo" />
          <Muestra nombre="Acento" color={p.acento} nota={`${p.tipo_acento === "complementario" ? "Complementario" : "Análogo"} · texto ${p.acento.texto.replaceAll("_", " ")}`}>
            <div className="text-xs">con su texto: <Ratio valor={contraste(p.acento, colorTextoAcento(p))} minimo={MIN_TEXTO} /></div>
            <div className="text-xs">sobre marca: <Ratio valor={contraste(p.acento, p.color_marca)} minimo={MIN_GRAFICO} /></div>
          </Muestra>
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          Secuencia de modo por canal: <strong>{secuencia.join(" → ")}</strong>
          {p.invertir_modo && " (invertida: el color heredado es claro y rinde mejor como fondo)"}.
          Texto en Modo B: <Ratio valor={contraste(B.fondo, B.texto)} minimo={MIN_TEXTO} />. Texto en Modo A: <Ratio valor={contraste(A.fondo, A.texto)} minimo={MIN_TEXTO} />.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Tipografía · {marca.tipografia.familia_variable}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {marca.tipografia.italic_habilitado ? "itálica habilitada (solo body/caption, regular)" : "sin itálica"}
          </span>
        </h2>
        <div className="flex flex-col gap-3 rounded-md border border-black/10 p-6" style={{ fontFamily: familia, color: hslCss(A.texto), background: hslCss(A.fondo) }}>
          {([
            ["H1", "900 → 700 según largo", "Mensaje principal", 900, escala("H1", "feed")],
            ["H2", String(PESOS.H2), "Dato de apoyo o subtítulo", PESOS.H2, escala("H2", "feed")],
            ["Body", String(PESOS.body), "Texto secundario que acompaña al mensaje principal.", PESOS.body, escala("body", "feed")],
            ["Caption", String(PESOS.caption), "Datos mínimos · condiciones · fechas", PESOS.caption, escala("caption", "feed")],
          ] as const).map(([nivel, peso, texto, w, [min, max]]) => (
            <div key={nivel} className="flex items-baseline gap-4">
              <span className="w-28 shrink-0 font-sans text-xs text-neutral-500" style={{ fontFamily: "system-ui" }}>
                {nivel} · {peso}<br />{min}-{max} px
              </span>
              <span style={{ fontWeight: w, fontSize: Math.round(max * 0.6) }}>{texto}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Logo</h2>
        <div className="grid grid-cols-3 gap-4">
          {([
            ["color", "Color · Modo A", p.fondo_neutro],
            ["mono_claro", "Mono claro · Modo B", p.color_marca],
            ["mono_oscuro", "Mono oscuro · fondos claros", p.tono_apoyo],
          ] as const).map(([k, etiqueta, fondo]) => (
            <div key={k} className="flex flex-col gap-2">
              <div className="flex h-28 items-center justify-center rounded-md p-4" style={{ background: hslCss(fondo) }}>
                {marca.logo[k] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marca.logo[k]!} alt={etiqueta} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-neutral-500">sin cargar</span>
                )}
              </div>
              <span className="text-xs text-neutral-600">{etiqueta}</span>
            </div>
          ))}
        </div>
        {pendientes.length > 0 && (
          <ul className="mt-4 list-disc pl-5 text-sm text-amber-800">
            {pendientes.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
