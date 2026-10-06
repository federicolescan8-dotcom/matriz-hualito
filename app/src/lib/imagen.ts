// Utilidades de imagen del lado del navegador.

export interface ImagenRecortada {
  dataUrl: string;
  /** Lado mayor de la imagen original, antes de recortar. */
  ladoMayorOriginal: number;
}

function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/**
 * Recorta los márgenes transparentes de un PNG. Muchos logos vienen con aire alrededor y en la pieza se ven chicos;
 * así el tamaño del logo lo decide el slot y no el archivo.
 */
export async function recortarTransparencia(dataUrl: string): Promise<ImagenRecortada> {
  const img = await cargar(dataUrl);
  const { naturalWidth: w, naturalHeight: h } = img;
  const ladoMayorOriginal = Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx || !w || !h) return { dataUrl, ladoMayorOriginal };
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  // Sin transparencia o sin nada visible: se deja como está.
  if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) return { dataUrl, ladoMayorOriginal };

  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return { dataUrl: out.toDataURL("image/png"), ladoMayorOriginal };
}

/**
 * Reduce una foto a `max` px de lado mayor y la pasa a JPEG. Las fotos de celular pesan varios MB y viajan dentro de
 * la pieza hasta el render; con 1600 px alcanza para cualquier formato de la matriz.
 */
export async function reducirFoto(file: File, max = 1600): Promise<string> {
  const original = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await cargar(original);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * k);
  canvas.height = Math.round(img.naturalHeight * k);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Píxeles de una imagen reducida a `lado` px de lado mayor, para extraer sus colores (laboratorio de color, E3). */
export async function pixelesDeImagen(src: string, lado = 72): Promise<{ rgb: [number, number, number]; alfa: number }[]> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const k = Math.min(1, lado / Math.max(img.naturalWidth || lado, img.naturalHeight || lado));
  const w = Math.max(1, Math.round((img.naturalWidth || lado) * k));
  const h = Math.max(1, Math.round((img.naturalHeight || lado) * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const salida: { rgb: [number, number, number]; alfa: number }[] = [];
  for (let i = 0; i < d.length; i += 4) salida.push({ rgb: [d[i], d[i + 1], d[i + 2]], alfa: d[i + 3] });
  return salida;
}
