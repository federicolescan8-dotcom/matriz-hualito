"use client";

import { useState } from "react";
import { enviarEnlace, useSesion } from "@/lib/sesion";
import Link from "next/link";

export default function LoginPage() {
  const sesion = useSesion();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado">("idle");
  const [error, setError] = useState<string | null>(null);

  if (sesion.estado === "local") {
    return (
      <Centro>
        <h1 className="mb-2 text-xl font-semibold">Modo local</h1>
        <p className="text-sm text-neutral-600">
          La base de datos todavía no está configurada: las marcas se guardan en este navegador y no hace falta ingresar.
        </p>
      </Centro>
    );
  }

  if (sesion.estado === "conectado") {
    return (
      <Centro>
        <h1 className="mb-2 text-xl font-semibold">Ya ingresaste</h1>
        <p className="mb-4 text-sm text-neutral-600">{sesion.email}</p>
        <Link href="/marcas" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Ir a las marcas</Link>
      </Centro>
    );
  }

  return (
    <Centro>
      <h1 className="mb-1 text-xl font-semibold">Ingresar</h1>
      <p className="mb-6 text-sm text-neutral-600">Te mandamos un enlace a tu email. Sin contraseñas.</p>
      {estado === "enviado" ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          Listo: revisá tu correo ({email}) y abrí el enlace desde este mismo navegador.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setEstado("enviando");
            setError(null);
            const err = await enviarEnlace(email.trim());
            if (err) {
              setError(err);
              setEstado("idle");
            } else setEstado("enviado");
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            autoFocus
          />
          <button type="submit" disabled={estado === "enviando"} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40">
            {estado === "enviando" ? "Enviando…" : "Enviarme el enlace"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      )}
    </Centro>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto mt-24 w-full max-w-sm px-4">{children}</div>;
}
