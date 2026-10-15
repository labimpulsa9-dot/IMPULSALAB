// El rol REAL vive en la tabla `perfiles` (protegida por RLS y por un trigger).
// user_metadata lo puede editar el propio usuario desde la consola del navegador con
// supabase.auth.updateUser({ data: { rol: "ADMINISTRADOR" } }), por eso nunca se usa para permisos.

import { ROLES } from "@/lib/roles";

const VALIDOS = new Set(Object.values(ROLES));

/** Lee el rol del usuario desde la base de datos. Ante cualquier duda: ESTUDIANTE. */
export async function obtenerRolVerificado(supabase, usuarioId) {
  if (!usuarioId) return null;
  const { data } = await supabase.from("perfiles").select("rol, estado").eq("id", usuarioId).maybeSingle();
  const rol = String(data?.rol ?? "").trim().toUpperCase();
  if (String(data?.estado ?? "").toUpperCase() !== "ACTIVO") return null;
  return VALIDOS.has(rol) ? rol : ROLES.ESTUDIANTE;
}

/** Devuelve el usuario de auth con la propiedad `rolVerificado` añadida. */
export async function conRolVerificado(supabase, user) {
  if (!user) return null;
  return { ...user, rolVerificado: await obtenerRolVerificado(supabase, user.id) };
}

/** Valida que un parámetro de URL sea un UUID (evita consultas con basura). */
export function esUuid(valor) {
  return typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}
