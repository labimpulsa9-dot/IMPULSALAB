"use client";

import { useEffect, useState } from "react";
import { createClient } from "@lib/client";

const ROLES = {
  ESTUDIANTE: "ESTUDIANTE",
  PROFESOR: "PROFESOR",
  DIRECTOR: "DIRECTOR",
  ADMINISTRADOR: "ADMINISTRADOR",
};

// Solo las columnas necesarias (minimización de datos: no se trae teléfono ni otros campos)
const COLUMNAS_PERFIL = "id, nombre, apellido, email, rol";

// Nombre completo (nombre + apellido) o, si no hay, el correo
function nombreDe(perfil) {
  const completo = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ").trim();
  return completo || perfil?.email || "—";
}

// Lee una consulta de Supabase y lanza el error si falla
async function leer(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

// Trae los perfiles cuyos ids se le pasen (sin repetidos)
async function perfilesPorIds(supabase, ids) {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return [];
  return leer(supabase.from("perfiles").select(COLUMNAS_PERFIL).in("id", unicos));
}

export default function PanelAcademico({ usuario }) {
  // Rol verificado en la base de datos (no user_metadata, que el usuario puede editar).
  const rol = usuario?.rolVerificado ?? null;
  const usuarioId = usuario?.id ?? null;

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [estudiantes, setEstudiantes] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [directores, setDirectores] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [diagnosticosPorUsuario, setDiagnosticosPorUsuario] = useState({});
  const [asignando, setAsignando] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("");

  const puedeAsignar = rol === ROLES.DIRECTOR || rol === ROLES.ADMINISTRADOR;
  const esProfesor = rol === ROLES.PROFESOR;
  const esEstudiante = rol === ROLES.ESTUDIANTE;

  useEffect(() => {
    if (!usuarioId || !rol) {
      setCargando(false);
      return;
    }

    let cancelado = false;

    const cargar = async () => {
      const supabase = createClient();
      setError("");

      try {
        let listaAsignaciones = [];
        let perfiles = [];

        if (rol === ROLES.ESTUDIANTE) {
          // El estudiante solo necesita sus asignaciones y sus profesores
          listaAsignaciones = await leer(
            supabase.from("asignaciones").select("id, estudiante_id, profesor_id").eq("estudiante_id", usuarioId)
          );
          perfiles = await perfilesPorIds(
            supabase,
            listaAsignaciones.map((a) => a.profesor_id)
          );
        } else if (rol === ROLES.PROFESOR) {
          // El profesor solo necesita sus asignaciones y sus estudiantes
          listaAsignaciones = await leer(
            supabase.from("asignaciones").select("id, estudiante_id, profesor_id").eq("profesor_id", usuarioId)
          );
          perfiles = await perfilesPorIds(
            supabase,
            listaAsignaciones.map((a) => a.estudiante_id)
          );
        } else if (rol === ROLES.DIRECTOR || rol === ROLES.ADMINISTRADOR) {
          perfiles = await leer(supabase.from("perfiles").select(COLUMNAS_PERFIL));
          listaAsignaciones = await leer(supabase.from("asignaciones").select("id, estudiante_id, profesor_id"));
        } else {
          setCargando(false);
          return;
        }

        const listaEstudiantes = perfiles.filter((p) => p.rol === ROLES.ESTUDIANTE);
        const listaProfesores = perfiles.filter((p) => p.rol === ROLES.PROFESOR);
        const listaDirectores = perfiles.filter((p) => p.rol === ROLES.DIRECTOR);

        let mapa = {};
        if (rol !== ROLES.ESTUDIANTE && listaEstudiantes.length > 0) {
          const diagnosticos = await leer(
            supabase
              .from("diagnosticos")
              .select("user_id, creado_en, brechas_prioritarias")
              .in(
                "user_id",
                listaEstudiantes.map((e) => e.id)
              )
              .order("creado_en", { ascending: false })
          );

          // Como vienen del más nuevo al más viejo, nos quedamos con el primero de cada uno
          diagnosticos.forEach((d) => {
            if (!mapa[d.user_id]) {
              const prioridad = Array.isArray(d.brechas_prioritarias) ? d.brechas_prioritarias[0]?.titulo_fase : null;
              mapa[d.user_id] = prioridad ? `Prioridad: ${prioridad}` : "Diagnóstico completado";
            }
          });
        }

        if (cancelado) return;

        setEstudiantes(listaEstudiantes);
        setProfesores(listaProfesores);
        setDirectores(listaDirectores);
        setAsignaciones(listaAsignaciones);
        setDiagnosticosPorUsuario(mapa);
      } catch (e) {
        console.error("Error cargando el panel académico:", e);
        if (!cancelado) setError("No se pudo cargar la información. Intenta de nuevo más tarde.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [usuarioId, rol]);

  const profesoresDe = (estudianteId) =>
    asignaciones
      .filter((a) => a.estudiante_id === estudianteId)
      .map((a) => profesores.find((p) => p.id === a.profesor_id))
      .filter(Boolean);

  const estudiantesDe = (profesorId) =>
    asignaciones
      .filter((a) => a.profesor_id === profesorId)
      .map((a) => estudiantes.find((e) => e.id === a.estudiante_id))
      .filter(Boolean);

  const manejarAsignar = async (estudianteId) => {
    if (!profesorSeleccionado) return;

    const yaAsignado = asignaciones.some(
      (a) => a.estudiante_id === estudianteId && a.profesor_id === profesorSeleccionado
    );

    if (yaAsignado) {
      setError("Ese profesor ya está asignado a este estudiante.");
      return;
    }

    setError("");
    const supabase = createClient();

    const { error: errorAsignar } = await supabase.from("asignaciones").insert({
      estudiante_id: estudianteId,
      profesor_id: profesorSeleccionado,
      asignado_por: usuarioId,
    });

    if (errorAsignar) {
      console.error("Error asignando profesor:", errorAsignar);
      setError("No se pudo asignar el profesor. Intenta de nuevo.");
      return;
    }

    setAsignaciones((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        estudiante_id: estudianteId,
        profesor_id: profesorSeleccionado,
      },
    ]);
    setAsignando(null);
    setProfesorSeleccionado("");
  };

  const manejarQuitarAsignacion = async (estudianteId, profesorId) => {
    setError("");
    const supabase = createClient();

    const { data, error: errorQuitar } = await supabase
      .from("asignaciones")
      .delete()
      .eq("estudiante_id", estudianteId)
      .eq("profesor_id", profesorId)
      .select("estudiante_id");

    if (errorQuitar || !data?.length) {
      console.error("Error quitando asignación:", errorQuitar);
      setError("No se pudo quitar la asignación. Verifica que tengas permisos.");
      return;
    }

    setAsignaciones((prev) =>
      prev.filter((a) => !(a.estudiante_id === estudianteId && a.profesor_id === profesorId))
    );
  };

  if (!usuario || !rol || cargando) return null;

  if (esEstudiante) {
    const misProfesores = profesoresDe(usuarioId);

    return (
      <section className="px-6 py-8 max-w-2xl mx-auto w-full">
        <h3 className="font-montserrat font-bold text-lg text-[#020201] mb-3">
          Tu profesor asignado
        </h3>

        <Aviso mensaje={error} />

        {misProfesores.length === 0 ? (
          <p className="text-sm text-stone-500">
            Todavía no tienes un profesor asignado.
          </p>
        ) : (
          <ul className="space-y-2">
            {misProfesores.map((p) => (
              <li key={p.id} className="bg-white border border-black/10 rounded-xl px-4 py-3">
                <p className="font-semibold text-sm text-[#020201]">{nombreDe(p)}</p>
                <p className="text-xs text-stone-500">{p.email}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  if (esProfesor) {
    const misEstudiantes = estudiantesDe(usuarioId);

    return (
      <section className="px-6 py-8 max-w-4xl mx-auto w-full">
        <h3 className="font-montserrat font-bold text-lg text-[#020201] mb-3">
          Mis estudiantes
        </h3>

        <Aviso mensaje={error} />

        <TablaEstudiantes
          estudiantes={misEstudiantes}
          diagnosticosPorUsuario={diagnosticosPorUsuario}
        />
      </section>
    );
  }

  return (
    <section className="px-6 py-8 max-w-5xl mx-auto w-full space-y-10">
      <Aviso mensaje={error} />

      <div>
        <h3 className="font-montserrat font-bold text-lg text-[#020201] mb-3">
          Estudiantes
        </h3>
        <TablaEstudiantes
          estudiantes={estudiantes}
          diagnosticosPorUsuario={diagnosticosPorUsuario}
          profesoresDe={profesoresDe}
          profesoresDisponibles={profesores}
          puedeAsignar={puedeAsignar}
          asignando={asignando}
          setAsignando={setAsignando}
          profesorSeleccionado={profesorSeleccionado}
          setProfesorSeleccionado={setProfesorSeleccionado}
          onAsignar={manejarAsignar}
          onQuitar={manejarQuitarAsignacion}
        />
      </div>

      <div>
        <h3 className="font-montserrat font-bold text-lg text-[#020201] mb-3">
          Profesores
        </h3>
        <div className="overflow-x-auto rounded-xl border border-black/10">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Correo</th>
                <th className="px-4 py-2 font-medium">Estudiantes asignados</th>
              </tr>
            </thead>
            <tbody>
              {profesores.map((p) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="px-4 py-2">{nombreDe(p)}</td>
                  <td className="px-4 py-2">{p.email}</td>
                  <td className="px-4 py-2">{estudiantesDe(p.id).length}</td>
                </tr>
              ))}
              {profesores.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-stone-400">
                    No hay profesores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rol === ROLES.ADMINISTRADOR && (
        <div>
          <h3 className="font-montserrat font-bold text-lg text-[#020201] mb-3">
            Directores
          </h3>
          <div className="overflow-x-auto rounded-xl border border-black/10">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Correo</th>
                </tr>
              </thead>
              <tbody>
                {directores.map((d) => (
                  <tr key={d.id} className="border-t border-black/5">
                    <td className="px-4 py-2">{nombreDe(d)}</td>
                    <td className="px-4 py-2">{d.email}</td>
                  </tr>
                ))}
                {directores.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-stone-400">
                      No hay directores registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Aviso({ mensaje }) {
  if (!mensaje) return null;
  return <p className="mb-3 text-sm text-[#CE1126]">{mensaje}</p>;
}

function TablaEstudiantes({
  estudiantes,
  diagnosticosPorUsuario,
  profesoresDe,
  profesoresDisponibles = [],
  puedeAsignar,
  asignando,
  setAsignando,
  profesorSeleccionado,
  setProfesorSeleccionado,
  onAsignar,
  onQuitar,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10">
      <table className="w-full text-sm text-left">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            <th className="px-4 py-2 font-medium">Nombre</th>
            <th className="px-4 py-2 font-medium">Emprendimiento</th>
            <th className="px-4 py-2 font-medium">Teléfono</th>
            <th className="px-4 py-2 font-medium">Etapa</th>
            <th className="px-4 py-2 font-medium">Profesor(es)</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((e) => (
            <tr key={e.id} className="border-t border-black/5 align-top">
              <td className="px-4 py-2">{nombreDe(e)}</td>
              <td className="px-4 py-2">{e.nombre_emprendimiento ?? "—"}</td>
              <td className="px-4 py-2">{e.telefono ?? "—"}</td>
              <td className="px-4 py-2">{diagnosticosPorUsuario[e.id] ?? "Sin diagnóstico"}</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1 items-center">
                  {profesoresDe
                    ? profesoresDe(e.id).map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 bg-[#003893]/10 text-[#003893] text-xs px-2 py-1 rounded-full"
                        >
                          {nombreDe(p)}
                          {puedeAsignar && (
                            <button
                              type="button"
                              onClick={() => onQuitar(e.id, p.id)}
                              className="hover:text-[#CE1126]"
                              title="Quitar"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    : null}

                  {puedeAsignar &&
                    (asignando === e.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={profesorSeleccionado}
                          onChange={(ev) => setProfesorSeleccionado(ev.target.value)}
                          className="text-xs border border-black/10 rounded-lg px-2 py-1"
                        >
                          <option value="">Elige...</option>
                          {profesoresDisponibles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {nombreDe(p)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onAsignar(e.id)}
                          className="text-xs font-semibold text-[#003893] hover:underline"
                        >
                          Asignar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAsignando(null);
                            setProfesorSeleccionado("");
                          }}
                          className="text-xs text-stone-400 hover:text-stone-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsignando(e.id)}
                        className="text-xs font-semibold text-[#003893] hover:underline"
                      >
                        + Profesor
                      </button>
                    ))}
                </div>
              </td>
            </tr>
          ))}
          {estudiantes.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-stone-400">
                No hay estudiantes para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}