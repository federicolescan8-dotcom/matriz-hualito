import { Manual } from "./Manual";

// Manual de marca para imprimir a PDF (replanteo, E8). La página la abre /api/manual con la marca inyectada; abierta
// a mano en el navegador toma la marca guardada por id y sirve de vista previa.
export default async function ManualPage({ params }: PageProps<"/manual/[marca]">) {
  const { marca } = await params;
  return <Manual id={decodeURIComponent(marca)} />;
}
