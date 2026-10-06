import { VistaIdentidad } from "./VistaIdentidad";

// Identidad de una marca (replanteo, E1): el sistema visual en una vista dedicada. Las marcas viven en el navegador o
// en Supabase del lado del cliente, así que la página solo pasa el id a la vista.
export default async function IdentidadPage({ params }: PageProps<"/identidad/[marca]">) {
  const { marca } = await params;
  return <VistaIdentidad id={decodeURIComponent(marca)} />;
}
