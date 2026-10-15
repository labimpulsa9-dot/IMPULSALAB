"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@lib/client";
import { esDirectorOAdministrador } from "@/lib/roles";
import { urlHttpsSegura } from "@/lib/seguridad/url";

/**
 * Menú superior del home (Ferias, Mi proceso, Tienda digital).
 *
 * - Computador (lg en adelante): barra con desplegables al pasar el mouse.
 * - Celular y tablet: botón de tres líneas (hamburguesa) a la derecha del
 *   encabezado que abre un menú con las mismas opciones (se despliegan al
 *   tocarlas) y, al final, "Iniciar sesión" o los datos del usuario.
 * - "Ferias" y "Mi proceso" (marcadas con `requiereSesion`) solo dan acceso
 *   si el usuario inició sesión; si no, piden iniciar sesión.
 * - Las opciones con `href` (ej.: "Mi proceso") no despliegan nada: llevan
 *   directo a esa página (o al inicio de sesión si no hay sesión).
 * - "Ferias" lee la tabla `ferias` de Supabase. Los usuarios con sesión las
 *   ven (cada una abre su link de registro). Solo DIRECTOR / ADMINISTRADOR
 *   pueden agregar, editar o eliminar.
 */

const FLECHA = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    className="w-3.5 h-3.5"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ICONO_MENU = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    className="h-6 w-6"
    aria-hidden="true"
  >
    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const ICONO_CERRAR = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    className="h-6 w-6"
    aria-hidden="true"
  >
    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function linkSeguro(valor) {
  return Boolean(urlHttpsSegura(valor));
}

// Solo https; rechaza javascript:, data:, credenciales en la URL, etc.
function normalizarLink(valor) {
  return urlHttpsSegura(valor) ?? "";
}

/* =========================================================
   MENÚ SUPERIOR
   ========================================================= */

export default function MenuSuperior({
  items = [],
  usuario = null,
  onCerrarSesion,
  urlIdeaNegocio,
}) {
  const [abierto, setAbierto] = useState(null); // desplegable de computador
  const [menuMovil, setMenuMovil] = useState(false); // menú hamburguesa
  const [seccionMovil, setSeccionMovil] = useState(null); // sección abierta en el celular
  const [ferias, setFerias] = useState([]);
  const [estadoFerias, setEstadoFerias] = useState("cargando"); // cargando | listo | error
  const [formulario, setFormulario] = useState(null); // null | { feria: null | {...} }
  const contenedorRef = useRef(null);
  const movilRef = useRef(null);

  const puedeAdministrar = esDirectorOAdministrador(usuario);
  const haySesion = Boolean(usuario);

  const cargarFerias = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ferias")
      .select("id, nombre, link_registro")
      .order("creado_en", { ascending: false });

    if (error) {
      console.error("Error cargando ferias:", error);
      setEstadoFerias("error");
      return;
    }

    setFerias(data ?? []);
    setEstadoFerias("listo");
  }, []);

  useEffect(() => {
    if (haySesion) cargarFerias();
  }, [haySesion, cargarFerias]);

  useEffect(() => {
    const manejarClicFuera = (evento) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierto(null);
      }
      if (movilRef.current && !movilRef.current.contains(evento.target)) {
        setMenuMovil(false);
      }
    };
    const manejarTecla = (evento) => {
      if (evento.key === "Escape") {
        setAbierto(null);
        setMenuMovil(false);
      }
    };

    document.addEventListener("mousedown", manejarClicFuera);
    document.addEventListener("touchstart", manejarClicFuera);
    document.addEventListener("keydown", manejarTecla);
    return () => {
      document.removeEventListener("mousedown", manejarClicFuera);
      document.removeEventListener("touchstart", manejarClicFuera);
      document.removeEventListener("keydown", manejarTecla);
    };
  }, []);

  const eliminarFeria = async (feria) => {
    if (!window.confirm(`¿Eliminar la feria "${feria.nombre}"?`)) return;

    const supabase = createClient();

    const { data, error } = await supabase
      .from("ferias")
      .delete()
      .eq("id", feria.id)
      .select("id");

    if (error || !data?.length) {
      console.error("Error eliminando feria:", error);
      window.alert("No se pudo eliminar la feria. Verifica que tengas permisos de director.");
      return;
    }

    cargarFerias();
  };

  // Contenido de una opción (igual en computador y en celular)
  const renderContenido = (item, alAccionar) => {
    if (item.requiereSesion && !haySesion) return <PanelSinSesion />;

    if (item.id === "ferias") {
      return (
        <PanelFerias
          ferias={ferias}
          estado={estadoFerias}
          puedeAdministrar={puedeAdministrar}
          onAgregar={() => {
            alAccionar();
            setFormulario({ feria: null });
          }}
          onEditar={(feria) => {
            alAccionar();
            setFormulario({ feria });
          }}
          onEliminar={eliminarFeria}
        />
      );
    }

    return (item.enlaces || []).map((enlace, indice) => (
      <div
        key={indice}
        role="menuitem"
        className="rounded-xl px-4 py-2.5 transition-colors hover:bg-stone-50"
      >
        <p className="text-sm font-semibold text-[#020201] leading-snug">
          {enlace.titulo}
        </p>
        {enlace.descripcion && (
          <p className="text-xs text-stone-500 leading-snug mt-0.5">
            {enlace.descripcion}
          </p>
        )}
      </div>
    ));
  };

  if (!items.length) return null;

  return (
    <>
      {/* ---------- COMPUTADOR ---------- */}
      <nav
        ref={contenedorRef}
        aria-label="Menú principal"
        className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-8 xl:gap-10 font-inter"
      >
        {items.map((item) => {
          const estaAbierto = abierto === item.id;

          // Opciones con enlace directo (ej.: "Mi proceso"): sin desplegable.
          // Sin sesión, llevan al inicio de sesión.
          if (item.href) {
            const destino = item.requiereSesion && !haySesion ? "/login" : item.href;
            return (
              <Link
                key={item.id}
                href={destino}
                className="flex items-center py-2 text-sm font-semibold whitespace-nowrap text-[#020201] transition-colors duration-200 hover:text-[#8A6508]"
              >
                {item.label}
              </Link>
            );
          }

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setAbierto(item.id)}
              onMouseLeave={() =>
                setAbierto((actual) => (actual === item.id ? null : actual))
              }
            >
              <button
                type="button"
                onClick={() =>
                  setAbierto((actual) => (actual === item.id ? null : item.id))
                }
                aria-expanded={estaAbierto}
                aria-haspopup="true"
                className={`flex items-center gap-1.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                  estaAbierto ? "text-[#8A6508]" : "text-[#020201] hover:text-[#8A6508]"
                }`}
              >
                {item.label}
                <span
                  className={`transition-transform duration-200 ${
                    estaAbierto ? "rotate-180" : ""
                  }`}
                >
                  {FLECHA}
                </span>
              </button>

              {estaAbierto && (
                <div className="absolute left-1/2 top-full z-50 w-80 max-w-[88vw] -translate-x-1/2 pt-2">
                  <div
                    role="menu"
                    className="il-scale-in rounded-2xl border border-black/10 bg-white p-2 text-left shadow-xl"
                  >
                    {renderContenido(item, () => setAbierto(null))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ---------- CELULAR Y TABLET: botón de tres líneas ---------- */}
      <div
        ref={movilRef}
        className="col-start-2 row-start-1 justify-self-end font-inter lg:hidden"
      >
        <button
          type="button"
          onClick={() => setMenuMovil((valor) => !valor)}
          aria-expanded={menuMovil}
          aria-label={menuMovil ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#020201] transition-colors hover:bg-stone-100"
        >
          {menuMovil ? ICONO_CERRAR : ICONO_MENU}
        </button>

        {menuMovil && (
          <div className="il-scale-in absolute inset-x-3 top-full z-50 mt-2 max-h-[calc(100dvh-6.5rem)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 text-left shadow-2xl">
            {items.map((item) => {
              const seccionAbierta = seccionMovil === item.id;

              // Opciones con enlace directo (ej.: "Mi proceso"): se navega sin desplegar nada.
              // Sin sesión, llevan al inicio de sesión.
              if (item.href) {
                const destinoMovil = item.requiereSesion && !haySesion ? "/login" : item.href;
                return (
                  <div key={item.id} className="border-b border-stone-200">
                    <Link
                      href={destinoMovil}
                      onClick={() => setMenuMovil(false)}
                      className="flex w-full items-center justify-between py-4 text-left text-base font-semibold text-[#020201] transition-colors hover:text-[#8A6508]"
                    >
                      {item.label}
                    </Link>
                  </div>
                );
              }

              return (
                <div key={item.id} className="border-b border-stone-200">
                  <button
                    type="button"
                    onClick={() =>
                      setSeccionMovil((actual) => (actual === item.id ? null : item.id))
                    }
                    aria-expanded={seccionAbierta}
                    className={`flex w-full items-center justify-between py-4 text-left text-base font-semibold transition-colors ${
                      seccionAbierta ? "text-[#8A6508]" : "text-[#020201]"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`transition-transform duration-200 ${
                        seccionAbierta ? "rotate-180" : ""
                      }`}
                    >
                      {FLECHA}
                    </span>
                  </button>

                  {seccionAbierta && (
                    <div className="pb-3">
                      {renderContenido(item, () => setMenuMovil(false))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-4">
              {haySesion ? (
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="font-montserrat font-bold text-sm text-[#020201]">
                    {usuario.user_metadata?.nombre ?? "Sin nombre registrado"}
                  </p>
                  <p className="mt-0.5 break-all text-xs text-stone-500">
                    {usuario.email}
                  </p>

                  <div className="mt-3 border-t border-stone-200 pt-3">
                    {usuario.user_metadata?.tieneIdeaNegocio ? (
                      <>
                        <p className="mb-1 text-xs font-medium text-stone-500">
                          Idea de negocio
                        </p>
                        <p className="text-sm font-semibold text-[#003893]">
                          {usuario.user_metadata?.nombreEmprendimiento}
                        </p>
                      </>
                    ) : urlIdeaNegocio ? (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={urlIdeaNegocio}
                        className="block text-sm font-semibold text-[#003893] hover:underline"
                      >
                        ¿Quieres crear una idea de negocio?
                      </a>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuMovil(false);
                      if (onCerrarSesion) onCerrarSesion();
                    }}
                    className="mt-4 w-full text-center text-sm font-medium text-[#CE1126] transition-colors hover:text-[#CE1126]/80"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuMovil(false)}
                  className="block w-full rounded-xl bg-[#003893] px-4 py-3 text-center font-montserrat text-sm font-semibold tracking-wide text-white transition hover:bg-[#003893]/90"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {formulario && puedeAdministrar && (
        <ModalPortal>
          <FormularioFeria
            feria={formulario.feria}
            onCerrar={() => setFormulario(null)}
            onGuardada={cargarFerias}
          />
        </ModalPortal>
      )}
    </>
  );
}

/* =========================================================
   PANEL PARA QUIEN NO HA INICIADO SESIÓN
   ========================================================= */

function PanelSinSesion() {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-semibold text-[#020201] leading-snug">
        Inicia sesión para acceder
      </p>
      <p className="mt-0.5 text-xs leading-snug text-stone-500">
        Esta sección es solo para usuarios registrados.
      </p>
      <Link
        href="/login"
        className="mt-3 block w-full rounded-xl bg-[#003893] px-3 py-2 text-center text-xs font-semibold font-montserrat tracking-wide text-white transition hover:bg-[#003893]/90"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}

/* =========================================================
   PANEL DE FERIAS (contenido del desplegable)
   ========================================================= */

function PanelFerias({
  ferias,
  estado,
  puedeAdministrar,
  onAgregar,
  onEditar,
  onEliminar,
}) {
  return (
    <div>
      {estado === "cargando" && (
        <p className="px-4 py-3 text-xs text-stone-500">Cargando…</p>
      )}

      {estado === "error" && (
        <p className="px-4 py-3 text-xs text-stone-500">
          No se pudieron cargar las ferias.
        </p>
      )}

      {estado === "listo" && ferias.length === 0 && (
        <p className="px-4 py-3 text-xs text-stone-500">
          Aún no hay ferias publicadas.
        </p>
      )}

      {estado === "listo" && ferias.length > 0 && (
        <ul className="max-h-72 overflow-y-auto">
          {ferias.map((feria) => (
            <li
              key={feria.id}
              role="menuitem"
              className="flex items-center gap-1 rounded-xl transition-colors hover:bg-stone-50"
            >
              {linkSeguro(feria.link_registro) ? (
                <a
                  href={urlHttpsSegura(feria.link_registro)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 px-4 py-2.5"
                >
                  <p className="text-sm font-semibold text-[#020201] leading-snug truncate">
                    {feria.nombre}
                  </p>
                  <p className="text-xs text-[#003893] leading-snug mt-0.5">
                    Regístrate aquí →
                  </p>
                </a>
              ) : (
                <div className="min-w-0 flex-1 px-4 py-2.5">
                  <p className="text-sm font-semibold text-[#020201] leading-snug truncate">
                    {feria.nombre}
                  </p>
                </div>
              )}

              {puedeAdministrar && (
                <div className="flex shrink-0 items-center gap-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onEditar(feria)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#003893]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(feria)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#CE1126]"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeAdministrar && (
        <div className="mt-1 border-t border-stone-100 p-2">
          <button
            type="button"
            onClick={onAgregar}
            className="w-full rounded-xl bg-[#CE1126] px-3 py-2 text-xs font-semibold font-montserrat tracking-wide text-white transition hover:bg-[#CE1126]/90"
          >
            + Agregar feria
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FORMULARIO: CREAR / EDITAR FERIA (solo nombre y link)
   ========================================================= */

function FormularioFeria({ feria, onCerrar, onGuardada }) {
  const [nombre, setNombre] = useState(feria?.nombre ?? "");
  const [link, setLink] = useState(feria?.link_registro ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const manejarTecla = (evento) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", manejarTecla);
    return () => document.removeEventListener("keydown", manejarTecla);
  }, [onCerrar]);

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    setError("");

    const nombreLimpio = nombre.trim();
    const linkLimpio = normalizarLink(link);

    if (!nombreLimpio) {
      setError("Escribe el nombre de la feria.");
      return;
    }

    if (!linkLimpio) {
      setError("Escribe un link de registro válido.");
      return;
    }

    setEnviando(true);

    const supabase = createClient();
    const datos = { nombre: nombreLimpio, link_registro: linkLimpio };

    const consulta = feria
      ? supabase.from("ferias").update(datos).eq("id", feria.id).select("id")
      : supabase.from("ferias").insert(datos).select("id");

    const { data, error: errorGuardar } = await consulta;

    setEnviando(false);

    if (errorGuardar || !data?.length) {
      console.error("Error guardando feria:", errorGuardar);
      setError("No se pudo guardar. Verifica que tengas permisos de director.");
      return;
    }

    onGuardada();
    onCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-6 il-fade-in"
      onClick={onCerrar}
    >
      <form
        onSubmit={manejarEnvio}
        onClick={(evento) => evento.stopPropagation()}
        className="relative z-[100000] w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-montserrat font-bold text-lg text-[#020201]">
            {feria ? "Editar feria" : "Agregar feria"}
          </h3>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 text-xl leading-none text-stone-400 hover:text-[#020201]"
          >
            ×
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="feria-nombre" className="text-sm font-medium text-stone-700">
            Nombre de la feria
          </label>
          <input
            id="feria-nombre"
            type="text"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            maxLength={120}
            autoFocus
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-[#003893]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="feria-link" className="text-sm font-medium text-stone-700">
            Link de registro
          </label>
          <input
            id="feria-link"
            type="text"
            inputMode="url"
            value={link}
            onChange={(evento) => setLink(evento.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-[#003893]"
          />
        </div>

        {error && <p className="text-sm text-[#CE1126]">{error}</p>}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-[#003893] px-4 py-3 font-montserrat font-semibold tracking-wide text-white transition hover:bg-[#003893]/90 disabled:opacity-60"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="w-full rounded-xl px-4 py-3 font-medium text-stone-500 transition hover:text-[#020201]"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}