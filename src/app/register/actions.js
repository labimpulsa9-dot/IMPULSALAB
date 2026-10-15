"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../libreria/supabase/server";

export async function registrarUsuario(prevState, formData) {
  const nombre = formData.get("nombre")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const telefono = formData.get("telefono")?.toString().trim();
  const password = formData.get("password")?.toString() || "";
  const confirmarPassword =
    formData.get("confirmarPassword")?.toString() || "";

  const tieneIdea = formData.get("tieneIdea") === "on";

  const nombreEmprendimiento =
    formData.get("nombreEmprendimiento")?.toString().trim() || "";

  if (!nombre) {
    return { error: "El nombre completo es obligatorio." };
  }

  if (!email) {
    return { error: "El correo electrónico es obligatorio." };
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    return { error: "Escribe un correo electrónico válido." };
  }

  if (!telefono) {
    return { error: "El número de teléfono es obligatorio." };
  }

  if (!password) {
    return { error: "La contraseña es obligatoria." };
  }

  if (password.length < 12) {
    return {
      error: "La contraseña debe tener al menos 12 caracteres.",
    };
  }

  if (password.length > 128) {
    return { error: "La contraseña es demasiado larga." };
  }

  if (nombre.length > 120 || nombreEmprendimiento.length > 200) {
    return { error: "Alguno de los textos es demasiado largo." };
  }

  if (!/^[0-9+()\-\s]{7,20}$/.test(telefono)) {
    return { error: "Escribe un número de teléfono válido." };
  }

  if (password !== confirmarPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (tieneIdea && !nombreEmprendimiento) {
    return {
      error:
        "Debes escribir el nombre del emprendimiento porque marcaste que tienes una idea emprendedora.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        telefono,
        // El rol NO se envía desde aquí: lo fija la base de datos (trigger handle_new_user).
        tieneIdeaNegocio: tieneIdea,
        nombreEmprendimiento: tieneIdea ? nombreEmprendimiento : null,
      },
    },
  });

  if (error) {
    if (
      error.code === "user_already_exists" ||
      error.message?.toLowerCase().includes("already registered")
    ) {
      return {
        error: "Este correo ya se encuentra registrado.",
      };
    }

    // El detalle técnico queda en el log del servidor; al usuario no se le muestra.
    console.error("Error de registro en Supabase:", error);
    return {
      error: "No se pudo completar el registro. Inténtalo de nuevo en unos minutos.",
    };
  }

  if (data?.user && !data.session) {
    return {
      success: `Cuenta creada. Revisa tu correo (${email}) y confirma tu cuenta antes de iniciar sesión.`,
    };
  }

  redirect("/login?registrado=1");
}