import type { Metadata } from "next";
import { variablesFuentes } from "@/lib/fuentes";
import { Navegacion } from "@/components/Navegacion";
import { Guardia } from "@/components/Guardia";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matriz Hualito",
  description: "Sistema de diseño gráfico automatizado para marcas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${variablesFuentes} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        <Navegacion />
        <Guardia>{children}</Guardia>
      </body>
    </html>
  );
}
