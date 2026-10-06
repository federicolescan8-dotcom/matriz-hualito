import { Presentacion } from "./Presentacion";

// Presentación de la identidad al cliente (replanteo, E13): pantalla completa, sin jerga técnica, con mockups en
// contexto y la aprobación. `?version=<id>` presenta una versión guardada; sin parámetro, la identidad actual.
export default async function PresentacionPage({ params, searchParams }: PageProps<"/presentacion/[marca]">) {
  const { marca } = await params;
  const { version } = await searchParams;
  return <Presentacion id={decodeURIComponent(marca)} version={typeof version === "string" ? version : null} />;
}
