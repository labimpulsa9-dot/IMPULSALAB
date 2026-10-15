"use client";
import { useState } from "react";
import { createClient } from "@lib/client";
import { urlHttpsSegura } from "@/lib/seguridad/url";
import { nombreAleatorio, validarImagen } from "@/lib/seguridad/archivos";

export default function EventoForm({ usuario, eventoExistente, onCerrar, onGuardado }) {
  const esEdicion = Boolean(eventoExistente);

  const [titulo, setTitulo] = useState(eventoExistente?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(eventoExistente?.descripcion ?? "");
  const [linkOficial, setLinkOficial] = useState(eventoExistente?.link_oficial ?? "");
  const [linkRegistro, setLinkRegistro] = useState(eventoExistente?.link_registro ?? "");
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(eventoExistente?.imagen_url ?? null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const manejarImagen = (e) => {
    const archivo = e.target.files?.[0] ?? null;
    setImagenArchivo(archivo);
    if (archivo) setImagenPreview(URL.createObjectURL(archivo));
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");

    if (!titulo.trim() || !descripcion.trim()) {
      setError("El nombre y la descripción son obligatorios.");
      return;
    }

    if (titulo.trim().length > 200 || descripcion.trim().length > 10000) {
      setError("El título o la descripción son demasiado largos.");
      return;
    }

    // Enlaces opcionales: si se escriben, deben ser https válidos.
    const oficialSeguro = linkOficial.trim() ? urlHttpsSegura(linkOficial) : null;
    const registroSeguro = linkRegistro.trim() ? urlHttpsSegura(linkRegistro) : null;
    if ((linkOficial.trim() && !oficialSeguro) || (linkRegistro.trim() && !registroSeguro)) {
      setError("Los enlaces deben ser direcciones https válidas.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    let imagenUrl = eventoExistente?.imagen_url ?? null;

    try {
      if (imagenArchivo) {
        const validacion = await validarImagen(imagenArchivo);
        if (validacion.error) throw new Error(validacion.error);

        const nombreArchivo = nombreAleatorio(validacion.extension);
        const { error: errorSubida } = await supabase.storage
          .from("eventos")
          .upload(nombreArchivo, imagenArchivo, { upsert: false });

        if (errorSubida) throw errorSubida;

        const { data: urlPublica } = supabase.storage
          .from("eventos")
          .getPublicUrl(nombreArchivo);

        imagenUrl = urlPublica?.publicUrl ?? null;
      }

      const datosEvento = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagen_url: imagenUrl,
        link_oficial: oficialSeguro,
        link_registro: registroSeguro,
      };

      if (esEdicion) {
        const { error: errorActualizar } = await supabase
          .from("eventos")
          .update(datosEvento)
          .eq("id", eventoExistente.id);
        if (errorActualizar) throw errorActualizar;
      } else {
        const { error: errorInsercion } = await supabase.from("eventos").insert({
          ...datosEvento,
          autor_id: usuario?.id ?? null,
          autor_nombre: usuario?.user_metadata?.usuario ?? usuario?.email ?? "IMPULSA LAB",
        });
        if (errorInsercion) throw errorInsercion;
      }

      onGuardado?.();
      onCerrar?.();
    } catch (err) {
      console.error("Error guardando el evento:", err);
      setError("No se pudo guardar el evento. Verifica la imagen y tus permisos e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 il-fade-in">
      <div className="il-scale-in bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-montserrat font-bold text-lg text-[#020201]">
            {esEdicion ? "Editar evento" : "Nuevo evento"}
          </h3>
          <button
            type="button"
            onClick={onCerrar}
            className="text-stone-400 hover:text-[#020201] text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Nombre del evento</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#CE1126]"
              placeholder="Nombre del evento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#CE1126]"
              placeholder="Descripción breve del evento"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Link oficial</label>
              <input
                type="url"
                value={linkOficial}
                onChange={(e) => setLinkOficial(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#003893]"
                placeholder="https://sitio-oficial-del-evento.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Link de registro</label>
              <input
                type="url"
                value={linkRegistro}
                onChange={(e) => setLinkRegistro(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#003893]"
                placeholder="https://formulario-de-registro.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Imagen del evento</label>
            <input type="file" accept="image/*" onChange={manejarImagen} className="w-full text-sm" />
            {imagenPreview && (
              <img
                src={imagenPreview}
                alt="Vista previa"
                className="mt-3 w-full max-h-48 object-cover rounded-lg border border-stone-200"
              />
            )}
          </div>

          {error && <p className="text-sm text-[#CE1126]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="il-hover-lift flex-1 rounded-xl bg-[#CE1126] px-4 py-3 text-white font-semibold font-montserrat tracking-wide transition hover:bg-[#CE1126]/90 disabled:opacity-60"
            >
              {enviando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Publicar evento"}
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl px-4 py-3 text-stone-500 font-medium transition hover:text-[#020201]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}