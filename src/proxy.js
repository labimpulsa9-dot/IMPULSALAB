import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const RUTAS_PUBLICAS = ["/", "/login", "/register", "/Eventos", "/Nosotros"];

// Rutas que exigen un rol concreto. Aquí es solo la "puerta"; los datos los protege RLS.
const RUTAS_POR_ROL = [{ prefijo: "/panel-de-control", roles: ["PROFESOR", "DIRECTOR", "ADMINISTRADOR"] }];

function esRutaPublica(pathname) {
  return RUTAS_PUBLICAS.some((ruta) =>
    ruta === "/" ? pathname === "/" : pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Redirige conservando las cookies de sesión que Supabase haya renovado.
  const redirigir = (pathname, params = {}) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const respuesta = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => respuesta.cookies.set(c));
    return respuesta;
  };

  // getUser() valida el token contra el servidor de Supabase (getSession() NO lo hace).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publica = esRutaPublica(pathname);

  if (!user && !publica) return redirigir("/login");

  if (user && (pathname === "/login" || pathname === "/register")) return redirigir("/");

  if (user && !publica) {
    // Rol y estado REALES desde la base de datos (no desde user_metadata, que el usuario controla).
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, estado")
      .eq("id", user.id)
      .maybeSingle();

    // Cuenta suspendida o sin perfil: se cierra la sesión.
    if (!perfil || String(perfil.estado).toUpperCase() !== "ACTIVO") {
      await supabase.auth.signOut();
      return redirigir("/login", { error: "cuenta_inactiva" });
    }

    const regla = RUTAS_POR_ROL.find((r) => pathname === r.prefijo || pathname.startsWith(`${r.prefijo}/`));
    if (regla && !regla.roles.includes(String(perfil.rol).toUpperCase())) return redirigir("/");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|imagenes|videos|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg|mov)$).*)",
  ],
};