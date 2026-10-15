// Validación de enlaces escritos por usuarios. Solo se aceptan URLs https.
// Bloquea javascript:, data:, vbscript:, file:, etc. Es una capa más: la base de datos
// también lo exige con un CHECK, así que saltarse el formulario no sirve.

/** Devuelve la URL normalizada (https) o null si no es segura. Agrega https:// si falta. */
export function urlHttpsSegura(valor) {
  const limpio = String(valor ?? "").trim();
  if (!limpio || limpio.length > 2000 || /\s/.test(limpio)) return null;

  const conProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(limpio) ? limpio : `https://${limpio}`;

  try {
    const url = new URL(conProtocolo);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null; // evita https://confiable.com@sitio-malo.com
    return url.toString();
  } catch {
    return null;
  }
}

const HOSTS_YOUTUBE = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const ID_YOUTUBE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Convierte un enlace de YouTube o Vimeo en una URL de embed.
 * Cualquier otro sitio devuelve null: no se incrusta contenido de dominios arbitrarios.
 */
export function urlEmbedPermitida(valor) {
  const segura = urlHttpsSegura(valor);
  if (!segura) return null;

  const url = new URL(segura);

  if (HOSTS_YOUTUBE.has(url.hostname)) {
    const partes = url.pathname.split("/").filter(Boolean);
    let id = null;
    if (url.hostname === "youtu.be") id = partes[0];
    else if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(partes[0])) id = partes[1];
    return id && ID_YOUTUBE.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com" || url.hostname === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).find((p) => /^\d+$/.test(p));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}

export function esVideoDirectoSeguro(valor) {
  const segura = urlHttpsSegura(valor);
  return Boolean(segura) && /\.(mp4|webm|ogg)$/i.test(new URL(segura).pathname);
}