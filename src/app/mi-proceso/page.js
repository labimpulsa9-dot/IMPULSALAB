import { redirect } from "next/navigation";
import { createClient } from "@lib/server";
import { esRolAvanzado, obtenerPerfilActual } from "@/lib/proceso/perfil";
import { esUuid } from "@/lib/seguridad/usuario";
import { ROLES_GESTION_DOCENTES, priorizarMentorias } from "@/lib/proceso/mentorias";
import {
  crearPlanSiNoExiste,
  getDiagnostico,
  getPlanMentorias,
  getProfesores,
  getTalleres,
} from "@/lib/supabaseClient";
import MiProceso from "@/components/proceso/MiProceso";

export const metadata = {
  title: "Mi proceso | IMPULSA LAB",
};

// Ejecuta una consulta y, si falla, deja el error en la consola del servidor y devuelve un valor de respaldo.
// Así un problema en una tabla no tumba toda la página con un 500.
async function conRespaldo(descripcion, consulta, respaldo) {
  try {
    return await consulta();
  } catch (error) {
    console.error(`Error ${descripcion}:`, error);
    return respaldo;
  }
}

export default async function MiProcesoPage({ searchParams }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { rol } = await obtenerPerfilActual(supabase, user.id);
  const esGestion = esRolAvanzado(rol);

  // El personal (profesor/director/administrador) abre el proceso de un estudiante concreto
  // desde el panel de control: /mi-proceso?estudiante=<id>. El estudiante solo ve el suyo.
  const { estudiante } = await searchParams;
  const estudianteId = esGestion ? (Array.isArray(estudiante) ? estudiante[0] : estudiante) : user.id;

  // El id viene de la URL: se valida el formato. Que el usuario PUEDA ver a ese estudiante
  // lo decide la base de datos (RLS): si no puede, las consultas devuelven vacío.
  if (!estudianteId || !esUuid(estudianteId)) redirect(esGestion ? "/panel-de-control" : "/");

  const diagnostico = await conRespaldo("cargando el diagnóstico", () => getDiagnostico(supabase, estudianteId), null);

  // Sin diagnóstico no hay proceso que mostrar.
  if (!diagnostico) redirect(esGestion ? "/panel-de-control" : "/que-clase-de-emprendedor-soy");

  // Docentes activos: sirven para asignar uno por defecto al crear el plan y para el selector del director.
  const profesores = await conRespaldo("cargando los docentes", () => getProfesores(supabase), []);

  // Crea el plan la primera vez (regla del puntaje más bajo) o devuelve el que ya existe.
  let plan = await conRespaldo(
    "creando el plan de mentorías",
    () => crearPlanSiNoExiste(supabase, diagnostico, profesores),
    null
  );

  // Si la creación falló (por ejemplo, por permisos), se intenta al menos leer el plan existente.
  if (plan === null) {
    plan = await conRespaldo("leyendo el plan de mentorías", () => getPlanMentorias(supabase, estudianteId), []);
  }

  // Último recurso: se muestra el plan calculado (solo lectura) en vez de romper la página.
  if (plan.length === 0) {
    plan = await conRespaldo(
      "calculando el plan de mentorías",
      async () =>
        priorizarMentorias(diagnostico).map((m) => ({
          ...m,
          id: `sin-guardar-${m.mentoria_num}`,
          profesor_id: null,
          profesor: null,
          fecha_programada: null,
        })),
      []
    );
  }

  const talleres = await conRespaldo("cargando los talleres", () => getTalleres(supabase, diagnostico.id), []);

  return (
    <MiProceso
      diagnostico={diagnostico}
      planInicial={plan}
      profesores={ROLES_GESTION_DOCENTES.includes(rol) ? profesores : []}
      talleresIniciales={talleres}
      rol={rol}
      esGestion={esGestion}
    />
  );
}