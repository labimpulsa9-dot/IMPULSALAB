export const ROLES = {
  ESTUDIANTE: "ESTUDIANTE",
  PROFESOR: "PROFESOR",
  DIRECTOR: "DIRECTOR",
  ADMINISTRADOR: "ADMINISTRADOR",
};

// IMPORTANTE: esto solo decide qué botones MOSTRAR. No es seguridad.
// La seguridad real está en las políticas RLS y triggers de Supabase (supabase/01_*.sql).
//
// `usuario.rolVerificado` lo agrega conRolVerificado() (src/lib/seguridad/usuario.js) leyendo la
// tabla `perfiles`. NO se lee de user_metadata, que cualquier usuario puede modificar.
export function obtenerRol(usuario) {
  return usuario?.rolVerificado ?? ROLES.ESTUDIANTE;
}

export function esDirectorOAdministrador(usuario) {
  const rol = obtenerRol(usuario);

  return rol === ROLES.DIRECTOR || rol === ROLES.ADMINISTRADOR;
}