import { Fraunces, Inter, Manrope, Newsreader, Sora, Space_Grotesk } from "next/font/google";

// Las seis familias variables del sistema (manual cap. 4). Solo se pide itálica a las que la tienen.
const inter = Inter({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--f-manrope" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-fraunces" });
const sora = Sora({ subsets: ["latin"], variable: "--f-sora" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--f-newsreader" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--f-space-grotesk" });

export const variablesFuentes = [inter, manrope, fraunces, sora, newsreader, spaceGrotesk]
  .map((f) => f.variable)
  .join(" ");

const VAR_POR_FAMILIA: Record<string, string> = {
  Inter: "--f-inter",
  Manrope: "--f-manrope",
  Fraunces: "--f-fraunces",
  Sora: "--f-sora",
  Newsreader: "--f-newsreader",
  "Space Grotesk": "--f-space-grotesk",
};

export function fontFamily(familia: string): string {
  const v = VAR_POR_FAMILIA[familia];
  return v ? `var(${v}), system-ui, sans-serif` : "system-ui, sans-serif";
}
