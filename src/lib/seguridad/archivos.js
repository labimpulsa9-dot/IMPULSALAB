// Validación de imágenes antes de subirlas a Storage.
// No se confía en la extensión ni en file.type (los controla el usuario): se leen los
// primeros bytes del archivo ("magic bytes"). SVG no se permite: puede contener scripts.

export const TAMANO_MAXIMO_IMAGEN_MB = 5;

const TIPOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function detectarTipo(archivo) {
  const b = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const texto = String.fromCharCode(...b);
  if (texto.startsWith("RIFF") && texto.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Devuelve { error } o { extension, tipo }.
 * El nombre final del archivo debe construirse con nombreAleatorio(), nunca con file.name.
 */
export async function validarImagen(archivo) {
  if (!archivo) return { error: "Selecciona una imagen." };
  if (archivo.size > TAMANO_MAXIMO_IMAGEN_MB * 1024 * 1024) {
    return { error: `La imagen supera los ${TAMANO_MAXIMO_IMAGEN_MB} MB.` };
  }
  const tipo = await detectarTipo(archivo);
  if (!tipo || !TIPOS[tipo]) return { error: "Formato no permitido. Usa JPG, PNG o WEBP." };
  return { tipo, extension: TIPOS[tipo] };
}

/** Nombre impredecible y sin caracteres del usuario (evita colisiones y rutas manipuladas). */
export function nombreAleatorio(extension) {
  return `${crypto.randomUUID()}.${extension}`;
}