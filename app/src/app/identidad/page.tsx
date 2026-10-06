"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarcaActiva, useMarcas } from "@/lib/marcas";

// /identidad sin marca: lleva a la identidad de la marca activa o, si no hay, pide elegir una.
export default function IdentidadSinMarca() {
  const marcas = useMarcas();
  const activa = useMarcaActiva();
  const router = useRouter();
  const marca = marcas.find((m) => m.id === activa) ?? marcas[0] ?? null;

  useEffect(() => {
    if (marca) router.replace(`/identidad/${marca.id}`);
  }, [marca, router]);

  if (marca) return null;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Identidad</h1>
      <p className="mb-6 text-neutral-600">Primero hace falta una marca guardada.</p>
      <Link href="/" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Hacer un diagnóstico</Link>
    </div>
  );
}
