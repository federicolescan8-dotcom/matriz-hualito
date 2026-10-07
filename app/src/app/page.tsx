import { DiagnosticoWizard } from "./diagnostico/Diagnostico";

// `?editar=<id>` vuelve al diagnóstico de una marca guardada (E12).
export default async function Home({ searchParams }: PageProps<"/">) {
  const { editar } = await searchParams;
  return <DiagnosticoWizard key={typeof editar === "string" ? editar : "nueva"} editar={typeof editar === "string" ? editar : null} />;
}
