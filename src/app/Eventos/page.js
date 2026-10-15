"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@lib/client";
import { esDirectorOAdministrador } from "@/lib/roles";
import { conRolVerificado } from "@/lib/seguridad/usuario";
import { urlHttpsSegura } from "@/lib/seguridad/url";
import Reveal from "@/components/ui/Reveal";
import CarruselDeslizable from "@/components/ui/CarruselDeslizable";
import EventoForm from "./EventoForm";
import GaleriaParticipacion from "./GaleriaParticipacion";

export default function EventosPage() {
  const [usuario, setUsuario] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [eventoEnEdicion, setEventoEnEdicion] = useState(null);
  const [indice, setIndice] = useState(0);

  const cargarEventos = useCallback(async () => {
    setCargando(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("creado_en", { ascending: false });

    if (!error) setEventos(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => conRolVerificado(supabase, data?.user ?? null))
      .then(setUsuario);
    cargarEventos();
  }, [cargarEventos]);

  const puedeAdministrar = esDirectorOAdministrador(usuario);
  const total = eventos.length;

  const manejarEliminar = async (evento) => {
    if (!window.confirm(`¿Eliminar el evento "${evento.titulo}"?`)) return;

    const supabase = createClient();

    if (evento.imagen_url) {
      try {
        const nombreArchivo = evento.imagen_url.split("/").pop();
        await supabase.storage.from("eventos").remove([nombreArchivo]);
      } catch {
        // Si no se puede borrar la imagen del storage, igual eliminamos el registro.
      }
    }

    await supabase.from("eventos").delete().eq("id", evento.id);
    setIndice(0);
    cargarEventos();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-[#020201] font-inter">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-montserrat font-bold text-[#020201] hover:text-[#CE1126] transition-colors">
          ← IMPULSA LAB
        </Link>
        {puedeAdministrar && (
          <button
            onClick={() => {
              setEventoEnEdicion(null);
              setMostrarFormulario(true);
            }}
            className="il-hover-lift rounded-xl bg-[#CE1126] px-4 py-2 text-white text-sm font-semibold font-montserrat tracking-wide transition hover:bg-[#CE1126]/90"
          >
            + Agregar evento
          </button>
        )}
      </header>

      <div className="w-full h-[6px] bg-[#FCC21B]" />
      <div className="w-full h-[4.5px] bg-[#003893]" />
      <div className="w-full h-[4.5px] bg-[#CE1126]" />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-10">
        <Reveal as="div" className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold font-montserrat text-[#020201] mb-2">
            Eventos IMPULSA LAB
          </h1>
          <p className="text-stone-600 text-sm md:text-base max-w-xl mx-auto">
            Entérate de nuestros próximos eventos, regístrate y conoce los eventos en los que hemos participado.
          </p>
        </Reveal>

        {cargando && <p className="text-center text-stone-500">Cargando eventos...</p>}

        {!cargando && eventos.length === 0 && (
          <p className="text-center text-stone-500 py-10">
            Todavía no hay eventos publicados.
          </p>
        )}

        {!cargando && eventos.length > 0 && (
          <div className="relative w-full max-w-3xl mx-auto">
            <CarruselDeslizable
              items={eventos}
              indice={indice}
              onCambiar={setIndice}
              etiqueta="Eventos"
              renderItem={(evento, i, esActual) => (
                <TarjetaEvento
                  evento={evento}
                  esActual={esActual}
                  puedeAdministrar={puedeAdministrar}
                  onEditar={() => {
                    setEventoEnEdicion(evento);
                    setMostrarFormulario(true);
                  }}
                  onEliminar={() => manejarEliminar(evento)}
                />
              )}
            />

            {total > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5" aria-hidden="true">
                {eventos.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === indice ? "w-6 bg-[#CE1126]" : "w-2.5 bg-stone-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <hr className="w-[92%] max-w-6xl mx-auto" />

      <GaleriaParticipacion usuario={usuario} />

      {mostrarFormulario && (
        <EventoForm
          usuario={usuario}
          eventoExistente={eventoEnEdicion}
          onCerrar={() => setMostrarFormulario(false)}
          onGuardado={cargarEventos}
        />
      )}
    </div>
  );
}

function TarjetaEvento({ evento, esActual = true, puedeAdministrar, onEditar, onEliminar }) {
  // Los vecinos (solo visibles mientras se arrastra) no usan el efecto de
  // aparición: al estar fuera de pantalla nunca se activaría y se verían vacíos.
  const Contenedor = esActual ? Reveal : "article";
  const propsContenedor = esActual ? { as: "article" } : {};

  return (
    <Contenedor
      {...propsContenedor}
      className="bg-white border-2 border-[#CE1126]/20 rounded-2xl overflow-hidden shadow-md il-hover-lift"
    >
      <div className="w-full aspect-video md:aspect-[16/8] bg-stone-100 flex items-center justify-center overflow-hidden">
        {evento.imagen_url ? (
          <img
            src={evento.imagen_url}
            alt={evento.titulo}
            draggable={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-stone-300 text-sm">Sin imagen</span>
        )}
      </div>

      <div className="p-5 md:p-8 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-montserrat font-bold text-lg md:text-2xl text-[#020201]">
            {evento.titulo}
          </h2>

          {puedeAdministrar && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onEditar}
                className="text-xs font-semibold text-[#003893] hover:underline"
              >
                Editar
              </button>
              <button
                onClick={onEliminar}
                className="text-xs font-semibold text-[#CE1126] hover:underline"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>

        <p className="text-stone-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
          {evento.descripcion}
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          {urlHttpsSegura(evento.link_oficial) && (
            <a
              href={urlHttpsSegura(evento.link_oficial)}
              target="_blank"
              rel="noopener noreferrer"
              className="il-hover-lift inline-flex items-center gap-1.5 rounded-xl border-2 border-[#003893] px-4 py-2 text-sm font-semibold text-[#003893] transition hover:bg-[#003893] hover:text-white"
            >
              Sitio oficial
            </a>
          )}
          {urlHttpsSegura(evento.link_registro) && (
            <a
              href={urlHttpsSegura(evento.link_registro)}
              target="_blank"
              rel="noopener noreferrer"
              className="il-hover-lift inline-flex items-center gap-1.5 rounded-xl bg-[#CE1126] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#CE1126]/90"
            >
              Regístrate
            </a>
          )}
        </div>
      </div>
    </Contenedor>
  );
}