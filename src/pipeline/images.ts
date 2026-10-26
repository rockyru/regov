import sharp from "sharp";

/** Screenshot → JPEG data URL sized for a vision model (keeps tokens sane). */
export async function toDataUrl(file: string, maxHeight = 3200, quality = 72): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = sharp(file);
  const meta = await img.metadata();
  const h = Math.min(meta.height ?? maxHeight, maxHeight);
  const buf = await img.extract({ left: 0, top: 0, width: meta.width ?? 1280, height: h }).jpeg({ quality }).toBuffer();
  return { dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}`, width: meta.width ?? 1280, height: h };
}

export async function pngDataUrl(file: string): Promise<string> {
  const buf = await sharp(file).png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}
