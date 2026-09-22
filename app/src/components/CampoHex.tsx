"use client";

import { useState } from "react";
import { normalizarHex } from "@/engine/color";

/**
 * Selector de color + campo HEX sincronizados. Se puede escribir un HEX incompleto sin perder lo tipeado; cada vez
 * que el texto es un HEX válido se aplica, y el selector se actualiza al instante.
 */
export function CampoHex({ valor, onChange }: { valor: string; onChange: (hex: string) => void }) {
  const [borrador, setBorrador] = useState<string | null>(null);
  const texto = borrador ?? valor;
  const invalido = borrador != null && normalizarHex(borrador) == null;
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={valor}
        onChange={(e) => {
          setBorrador(null);
          onChange(e.target.value);
        }}
        className="h-9 w-12 shrink-0 cursor-pointer"
      />
      <input
        value={texto}
        onChange={(e) => {
          setBorrador(e.target.value);
          const hex = normalizarHex(e.target.value);
          if (hex) onChange(hex);
        }}
        onBlur={() => setBorrador(null)}
        spellCheck={false}
        className={`w-24 rounded-md border px-2 py-1 font-mono text-sm ${invalido ? "border-red-400" : "border-neutral-300"}`}
      />
    </div>
  );
}
