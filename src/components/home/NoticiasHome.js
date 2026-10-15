"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@lib/client";
import { esDirectorOAdministrador } from "@/lib/roles";
import { nombreAleatorio, validarImagen } from "@/lib/seguridad/archivos";
import Reveal from "@/components/ui/Reveal";
import CarruselDeslizable from "@/components/ui/CarruselDeslizable";

function formatearFecha(fecha) {
  if (!fecha) return "";

  return new Date(fecha).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* =========================================================
   PORTAL PARA MODALES
   =========================================================
   Esto hace que el modal se coloque directamente en <body>
   y no quede atrapado dentro de Reveal o de otros elementos.
   ========================================================= */

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;

  return createPortal(children, document.body);
}

/* =========================================================
   NOTICIAS HOME
   ========================================================= */

export default function NoticiasHome({ usuario }) {
  const [noticias, setNoticias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [noticiaAbierta, setNoticiaAbierta] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [indice, setIndice] = useState(0);

  const puedeAdministrar = esDirectorOAdministrador(usuario);

  const total = noticias.length;

  /* =========================================================
     CARGAR NOTICIAS
     ========================================================= */

  const cargarNoticias = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("noticias")
      .select("*")
      .order("creado_en", { ascending: false })
      .limit(12);

    if (!error) {
      setNoticias(data ?? []);
    } else {
      console.error("Error cargando noticias:", error);
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    cargarNoticias();
  }, [cargarNoticias]);

  /* =========================================================
     REINICIAR ÍNDICE
     ========================================================= */

  useEffect(() => {
    setIndice(0);
  }, [total]);

  if (cargando) return null;

  if (!puedeAdministrar && noticias.length === 0) return null;

  return (
    <>
      <Reveal
        as="section"
        className="w-full max-w-4xl mx-auto px-2"
      >
        {/* =====================================================
            ENCABEZADO
            ===================================================== */}

        <div className="flex items-center justify-between gap-3 mb-4 px-2">
          <h2 className="text-2xl md:text-3xl font-extrabold font-montserrat text-[#020201] tracking-tight">
            Noticias
          </h2>

          {puedeAdministrar && (
            <button
              type="button"
              onClick={() => setMostrarFormulario(true)}
              className="il-hover-lift relative z-10 rounded-xl bg-[#CE1126] px-3 py-2 text-white text-xs md:text-sm font-semibold font-montserrat tracking-wide transition hover:bg-[#CE1126]/90"
            >
              + Agregar noticia
            </button>
          )}
        </div>

        {/* =====================================================
            SIN NOTICIAS
            ===================================================== */}

        {noticias.length === 0 ? (
          <p className="text-center text-stone-500 py-6">
            Todavía no hay noticias publicadas.
          </p>
        ) : (
          <div className="relative w-full max-w-2xl mx-auto">

            {/* =================================================
                NOTICIAS (arrastra o desliza para cambiar)
                ================================================= */}

            <CarruselDeslizable
              items={noticias}
              indice={indice}
              onCambiar={setIndice}
              autoMs={10000}
              etiqueta="Noticias"
              renderItem={(noticia) => (
                <button
                  type="button"
                  onClick={() => setNoticiaAbierta(noticia)}
                  className="il-hover-lift text-left w-full bg-white rounded-2xl border-2 border-[#CE1126]/20 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="w-full aspect-video md:aspect-[16/8] bg-stone-100 overflow-hidden">
                    {noticia.imagen_url ? (
                      <img
                        src={noticia.imagen_url}
                        alt={noticia.titulo}
                        loading="lazy"
                        draggable={false}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-sm">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="p-4 md:p-6 space-y-1.5 md:space-y-2">
                    <h3 className="font-montserrat font-bold text-sm md:text-lg text-[#020201] line-clamp-2">
                      {noticia.titulo}
                    </h3>

                    <p className="text-stone-600 text-xs md:text-sm leading-relaxed line-clamp-2">
                      {noticia.contenido}
                    </p>

                    <div className="flex items-center justify-between gap-3 pt-1 md:pt-2">
                      <p className="text-[11px] md:text-xs text-stone-400">
                        {noticia.autor_nombre ?? "IMPULSA LAB"} ·{" "}
                        {formatearFecha(noticia.creado_en)}
                      </p>

                      <span className="shrink-0 inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-[#CE1126]">
                        Leer ahora
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              )}
            />

            {/* =================================================
                INDICADORES (solo informativos)
                ================================================= */}

            {total > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
                {noticias.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === indice
                        ? "w-6 bg-[#CE1126]"
                        : "w-2.5 bg-stone-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Reveal>

      {/* =======================================================
          MODAL PARA VER NOTICIA
          ======================================================= */}

      {noticiaAbierta && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-6 il-fade-in"
            onClick={() => setNoticiaAbierta(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-[100000] bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {noticiaAbierta.imagen_url && (
                <img
                  src={noticiaAbierta.imagen_url}
                  alt={noticiaAbierta.titulo}
                  className="w-full aspect-video md:aspect-[16/8] object-cover rounded-t-2xl"
                />
              )}

              <div className="p-6 md:p-8 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-montserrat font-bold text-lg md:text-2xl text-[#020201]">
                    {noticiaAbierta.titulo}
                  </h3>

                  <button
                    type="button"
                    onClick={() => setNoticiaAbierta(null)}
                    className="relative z-10 text-stone-400 hover:text-[#020201] text-xl leading-none shrink-0"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">
                  {noticiaAbierta.contenido}
                </p>

                <p className="text-xs text-stone-400 pt-2">
                  {noticiaAbierta.autor_nombre ?? "IMPULSA LAB"} ·{" "}
                  {formatearFecha(noticiaAbierta.creado_en)}
                </p>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* =======================================================
          MODAL NUEVA NOTICIA
          ======================================================= */}

      {mostrarFormulario && (
        <ModalPortal>
          <FormularioNoticia
            usuario={usuario}
            onCerrar={() => setMostrarFormulario(false)}
            onPublicada={cargarNoticias}
          />
        </ModalPortal>
      )}
    </>
  );
}

/* =========================================================
   FORMULARIO NUEVA NOTICIA
   ========================================================= */

function FormularioNoticia({
  usuario,
  onCerrar,
  onPublicada,
}) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");

  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     IMAGEN
     ========================================================= */

  const manejarImagen = (e) => {
    const archivo = e.target.files?.[0] ?? null;

    setImagenArchivo(archivo);

    if (archivo) {
      setImagenPreview(URL.createObjectURL(archivo));
    } else {
      setImagenPreview(null);
    }
  };

  /* =========================================================
     PUBLICAR
     ========================================================= */

  const manejarEnvio = async (e) => {
    e.preventDefault();

    setError("");

    if (!titulo.trim() || !contenido.trim()) {
      setError(
        "El título y el contenido son obligatorios."
      );

      return;
    }

    setEnviando(true);

    const supabase = createClient();

    let imagenUrl = null;

    try {
      /* =====================================================
         SUBIR IMAGEN
         ===================================================== */

      if (imagenArchivo) {
        const validacion = await validarImagen(imagenArchivo);
        if (validacion.error) throw new Error(validacion.error);

        const nombreArchivo = nombreAleatorio(validacion.extension);

        const { error: errorSubida } =
          await supabase.storage
            .from("noticias")
            .upload(
              nombreArchivo,
              imagenArchivo,
              {
                upsert: false,
              }
            );

        if (errorSubida) {
          throw errorSubida;
        }

        const { data: urlPublica } =
          supabase.storage
            .from("noticias")
            .getPublicUrl(nombreArchivo);

        imagenUrl =
          urlPublica?.publicUrl ?? null;
      }

      /* =====================================================
         INSERTAR NOTICIA
         ===================================================== */

      const { error: errorInsercion } =
        await supabase
          .from("noticias")
          .insert({
            titulo: titulo.trim(),
            contenido: contenido.trim(),
            imagen_url: imagenUrl,
            autor_id: usuario?.id ?? null,
            autor_nombre:
              usuario?.user_metadata?.usuario ??
              usuario?.email ??
              "IMPULSA LAB",
          });

      if (errorInsercion) {
        throw errorInsercion;
      }

      /* =====================================================
         ACTUALIZAR Y CERRAR
         ===================================================== */

      await onPublicada?.();

      onCerrar?.();

      setTitulo("");
      setContenido("");
      setImagenArchivo(null);
      setImagenPreview(null);
    } catch (err) {
      console.error(
        "Error publicando noticia:",
        err
      );

      setError(
        err?.message ??
          "No se pudo publicar la noticia. Inténtalo de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  };

  /* =========================================================
     MODAL
     ========================================================= */

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-6 il-fade-in"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-[100000] bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* ===================================================
            ENCABEZADO
            =================================================== */}

        <div className="flex items-center justify-between">
          <h3 className="font-montserrat font-bold text-lg text-[#020201]">
            Nueva noticia
          </h3>

          <button
            type="button"
            onClick={onCerrar}
            className="relative z-10 text-stone-400 hover:text-[#020201] text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* ===================================================
            FORMULARIO
            =================================================== */}

        <form
          onSubmit={manejarEnvio}
          className="space-y-4"
        >
          {/* TÍTULO */}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Título
            </label>

            <input
              type="text"
              value={titulo}
              onChange={(e) =>
                setTitulo(e.target.value)
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#003893]"
              placeholder="Título de la noticia"
            />
          </div>

          {/* CONTENIDO */}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Contenido
            </label>

            <textarea
              value={contenido}
              onChange={(e) =>
                setContenido(e.target.value)
              }
              rows={5}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#003893]"
              placeholder="Redacta aquí la noticia..."
            />
          </div>

          {/* IMAGEN */}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Imagen (opcional)
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={manejarImagen}
              className="w-full text-sm"
            />

            {imagenPreview && (
              <img
                src={imagenPreview}
                alt="Vista previa"
                className="mt-3 w-full max-h-48 object-cover rounded-lg border border-stone-200"
              />
            )}
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-[#CE1126]">
                {error}
              </p>
            </div>
          )}

          {/* =================================================
              BOTONES
              ================================================= */}

          <div className="relative z-[100001] flex gap-2 pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="relative z-[100002] il-hover-lift flex-1 rounded-xl bg-[#CE1126] px-4 py-3 text-white font-semibold font-montserrat tracking-wide transition hover:bg-[#CE1126]/90 disabled:opacity-60"
            >
              {enviando
                ? "Publicando..."
                : "Publicar noticia"}
            </button>

            <button
              type="button"
              onClick={onCerrar}
              className="relative z-[100002] rounded-xl px-4 py-3 text-stone-500 font-medium transition hover:text-[#020201]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}