"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/../libreria/supabase/client";
import { conRolVerificado } from "@/lib/seguridad/usuario";
import TarjetasCarousel from "@/components/home/TarjetasCarousel";
import VideoEmprendedores from "@/components/home/VideoEmprendedores";
import PanelAcademico from "@/components/home/PanelAcademico";
import NoticiasHome from "@/components/home/NoticiasHome";
import MenuSuperior from "@/components/home/menusuperior";
import { SobreNosotrosTeaser } from "@/components/home/SobreNosotros";
import { SOBRE_NOSOTROS } from "@/lib/sobreNosotrosData";

const URL_CUADRO_AMARILLO = "/que-clase-de-emprendedor-soy";
const URL_CUADRO_AZUL = "https://forms.cloud.microsoft/r/zz5CaG15Kq";
const URL_CUADRO_ROJO = "/Eventos";

// Menú superior del home: no lleva a ninguna página, solo despliega información.
// "Ferias" se carga desde Supabase; en las demás cambia los textos de "enlaces".
const MENU_SUPERIOR = [
  {
    id: "ferias",
    label: "Ferias",
    requiereSesion: true,
  },
  {
    id: "mi-proceso",
    label: "Mi proceso",
    requiereSesion: true,
    href: "/mi-proceso",
  },
  {
    id: "tienda-digital",
    label: "Tienda digital",
    enlaces: [
      { titulo: "Próximamente", descripcion: "Aquí encontrarás la tienda digital" },
    ],
  },
];

// Video de intro: intenta sonar; si el navegador lo bloquea, arranca en silencio y muestra un botón
function IntroVideo({ onPlay, onEnded, onError }) {
  const videoRef = useRef(null);
  const [sinSonido, setSinSonido] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      setSinSonido(true);
      video.play().catch(() => onError());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activarSonido = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setSinSonido(false);
  };

  return (
    // Fondo blanco = mismo blanco del video, así no se ven bordes ni barras negras
    <div className="fixed inset-0 w-full h-dvh bg-white z-50 flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src="/videos/ave.mp4"
        className="block bg-white object-contain"
        // El video es vertical (9:16). Se muestra completo, sin recortar ni ampliar de más.
        // Alto máximo 640px (evita verse borroso) y 80% del alto en celulares.
        // Los bordes laterales se desvanecen para que el ave no se "corte" al entrar y salir.
        style={{
          height: "min(80dvh, 640px)",
          aspectRatio: "9 / 16",
          maxWidth: "100%",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        }}
        playsInline
        preload="auto"
        onPlay={onPlay}
        onEnded={onEnded}
        onError={onError}
      />
      {sinSonido && (
        <button
          type="button"
          onClick={activarSonido}
          className="absolute bottom-6 right-6 rounded-full bg-[#020201] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[#020201]/85"
        >
          🔊 Activar sonido
        </button>
      )}
    </div>
  );
}

// Vive mientras la pestaña no se recargue: evita repetir el video al volver al inicio sin recargar
let introReproducida = false;

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // null = decidiendo | "video" = intro del ave (solo al abrir/recargar) | "frases" = navegación interna
  const [modoIntro, setModoIntro] = useState(null);
  const [frase, setFrase] = useState({ texto: "", autor: "" });
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [avisoLogin, setAvisoLogin] = useState(false);
  const [mostrarTarjetaUsuario, setMostrarTarjetaUsuario] = useState(false);

  const menuUsuarioRef = useRef(null);

  const frasesMotivadoras = [
    { texto: "El único modo de hacer un gran trabajo es amar lo que haces.", autor: "Steve Jobs" },
    { texto: "Estar preparado es importante, saber esperarlo lo es aún más.", autor: "Arthur Schnitzler" },
    { texto: "No todos los que trabajan duro son recompensados, pero todos los que son alguien han trabajado duro.", autor: "Genji Kamogawa" }
  ];

  const infoDesplegable = SOBRE_NOSOTROS.map((item) => ({
    id: item.id,
    label: `¿${item.titulo}?`,
    titulo: item.titulo,
    resumen: item.resumen,
  }));

  const tarjetas = [
    {
      href: URL_CUADRO_AMARILLO,
      img: "imagenes/nuevaidea.jpeg",
      alt: "¿Qué clase de emprendedor soy?",
      badgeBg: "bg-[#FCC21B]",
      badgeText: "text-[#020201]",
      cardBg: "bg-[#FCC21B]/10",
      cardBorder: "border-[#FCC21B]",
      title: "¿Qué clase de emprendedor soy?",
      desc: "Descubre tu perfil emprendedor y las fortalezas que puedes aprovechar."
    },
    {
      href: URL_CUADRO_AZUL,
      img: "imagenes/emprendedor.jpeg",
      alt: "Mi idea comienza aquí",
      badgeBg: "bg-[#003893]",
      badgeText: "text-white",
      cardBg: "bg-[#003893]/10",
      cardBorder: "border-[#003893]",
      title: "Mi idea comienza aquí",
      desc: "Da el primer paso para convertir tu idea en un proyecto real.",
      publica: true,
      target: "_blank"
    },
    {
      href: URL_CUADRO_ROJO,
      img: "imagenes/Eventos.jpeg",
      alt: "Eventos IMPULSA LAB",
      badgeBg: "bg-[#CE1126]",
      badgeText: "text-white",
      cardBg: "bg-[#CE1126]/10",
      cardBorder: "border-[#CE1126]",
      title: "Eventos",
      desc: "Descubre nuestros próximos eventos y los eventos en los que hemos participado.",
      publica: true
    }
  ];

  useEffect(() => {
    const autor = "JULIAN";
    const marca = "magick";

    console.log(
      `%c🚀 Impulsa Web - Desarrollado por ${autor} (${marca})`,
      "color: #FCC21B; font-size: 16px; font-weight: bold; background-color: #020201; padding: 8px; border-radius: 4px;"
    );

    const fraseAleatoria = frasesMotivadoras[Math.floor(Math.random() * frasesMotivadoras.length)];
    setFrase(fraseAleatoria);

    // El video del ave se ve solo al abrir la página (pestaña nueva) o al recargar el inicio.
    // Si el usuario vuelve al inicio desde otra página, se muestran las frases.
    let yaVioVideo = false;
    let esRecarga = false;
    try {
      yaVioVideo = sessionStorage.getItem("impulsa_video_visto") === "1";
      const nav = performance.getEntriesByType("navigation")[0];
      esRecarga = nav?.type === "reload";
    } catch {}

    if (introReproducida) {
      setModoIntro("frases");
    } else if (!yaVioVideo || esRecarga) {
      setModoIntro("video");
    } else {
      setModoIntro("frases");
    }
  }, []);

  // Las frases se muestran 3 segundos y luego entra a la página
  useEffect(() => {
    if (modoIntro !== "frases") return;
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [modoIntro]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      setUsuario(await conRolVerificado(supabase, data?.user ?? null));
      setCargandoSesion(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      // setTimeout: evita llamar a Supabase dentro del callback de auth (riesgo de bloqueo).
      setTimeout(async () => setUsuario(await conRolVerificado(supabase, session?.user ?? null)), 0);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const manejarClicFuera = (evento) => {
      if (menuUsuarioRef.current && !menuUsuarioRef.current.contains(evento.target)) {
        setMostrarTarjetaUsuario(false);
      }
    };

    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  const manejarClicTarjeta = (evento, tarjeta) => {
    if (tarjeta?.publica) return;
    if (!usuario) {
      evento.preventDefault();
      setAvisoLogin(true);
    }
  };

  const manejarCerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUsuario(null);
    setMostrarTarjetaUsuario(false);
    router.push("/");
  };

  const verificarDerechos = () => {
    const k1 = "magick";
    const k2 = "julian";
    return Boolean(k1 && k2);
  };

  if (!verificarDerechos()) {
    if (typeof window !== "undefined") {
      window.location.replace("https://google.com");
    }
    return null;
  }

  if (loading && modoIntro === null) {
    return <div className="fixed inset-0 w-full h-dvh bg-white z-50" aria-hidden="true" />;
  }

  if (loading && modoIntro === "video") {
    return (
      <IntroVideo
        onPlay={() => {
          introReproducida = true;
          try { sessionStorage.setItem("impulsa_video_visto", "1"); } catch {}
        }}
        onEnded={() => setLoading(false)}
        onError={() => setModoIntro("frases")}
      />
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-dvh bg-white grid place-items-center z-50 p-6 font-inter">
        <div className="max-w-2xl w-full text-center space-y-6 flex flex-col items-center justify-center">
          <p className="text-2xl md:text-3xl font-montserrat font-semibold italic text-[#020201] leading-relaxed">
            "{frase.texto}"
          </p>

          <p className="text-sm md:text-base tracking-widest text-[#CE1126] uppercase font-bold font-montserrat">
            — {frase.autor}
          </p>

          <div className="mt-4 w-10 h-10 border-4 border-stone-200 border-t-[#003893] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-[#020201] font-inter flex flex-col">
      <div className="hidden pointer-events-none opacity-0 select-none" data-creator="julian-magick">
        IMPULSA LAB 2026 - Todos los derechos reservados.
      </div>

      <div
        className="sticky top-0 z-50 w-full shadow-md"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="w-full h-1 md:h-5 bg-white" aria-hidden="true"></div>

        <header
          className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5 px-4 py-2 md:px-8 md:py-3 lg:flex lg:justify-between lg:gap-4"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="col-start-1 row-start-1 flex items-center shrink-0">
            <a 
              href="https://universitariadecolombia.edu.co/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:opacity-80 flex items-center shrink-0 -mt-[6px] md:-mt-[10px]"
            >
              <img
                src="/imagenes/universitaria.png"
                alt="Institución Universitaria de Colombia"
                className="h-[26px] w-auto object-contain sm:h-[34px] md:h-[40px]"
              />
            </a>

            <div className="w-2 shrink-0 sm:w-5" aria-hidden="true" />

            <div 
              className="h-5 sm:h-7 bg-[#020201] rounded-full shrink-0" 
              style={{ width: "2px", minWidth: "2px" }}
            />

            <div className="w-2 shrink-0 sm:w-5" aria-hidden="true" />

            <div className="flex items-center shrink-0">
              <img
                src="/imagenes/logoIMPULSALAB.png"
                alt="Logo Impulsa Lab"
                className="h-[26px] w-auto object-contain sm:h-[34px] md:h-[40px]"
              />
            </div>
          </div>

          <MenuSuperior
            items={MENU_SUPERIOR}
            usuario={usuario}
            onCerrarSesion={manejarCerrarSesion}
            urlIdeaNegocio={URL_CUADRO_AZUL}
          />

          {usuario ? (
            <div className="relative hidden lg:block col-start-2 row-start-1 min-w-0 justify-self-end" ref={menuUsuarioRef}>
              <button
                onClick={() => setMostrarTarjetaUsuario((valor) => !valor)}
                className="block max-w-full truncate text-xs sm:text-sm font-semibold text-[#020201] hover:text-[#003893] transition-colors"
              >
                Hola, {usuario.user_metadata?.nombre ?? usuario.email}
              </button>

              {mostrarTarjetaUsuario && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-black/10 p-4 z-50 text-left">
                  <p className="font-montserrat font-bold text-sm text-[#020201]">
                    {usuario.user_metadata?.nombre ?? "Sin nombre registrado"}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 break-all">
                    {usuario.email}
                  </p>

                  <div className="mt-3 pt-3 border-t border-stone-100">
                    {usuario.user_metadata?.tieneIdeaNegocio ? (
                      <>
                        <p className="text-xs font-medium text-stone-500 mb-1">
                          Idea de negocio
                        </p>
                        <p className="text-sm font-semibold text-[#003893]">
                          {usuario.user_metadata?.nombreEmprendimiento}
                        </p>
                      </>
                    ) : (
                      <a 
                        target="_blank" 
                        rel="noreferrer" 
                        href={URL_CUADRO_AZUL}
                        className="block text-sm font-semibold text-[#003893] hover:underline"
                      >
                        ¿Quieres crear una idea de negocio?
                      </a>
                    )}
                  </div>

                  <button
                    onClick={manejarCerrarSesion}
                    className="mt-4 w-full text-sm font-medium text-[#CE1126] hover:text-[#CE1126]/80 transition-colors text-center"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              aria-label="Iniciar sesión"
              className="col-start-2 row-start-1 justify-self-end hidden lg:flex items-center gap-1.5 sm:gap-2 shrink-0 group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7 sm:w-9 sm:h-9 text-stone-400 group-hover:text-[#003893] transition-colors"
              >
                <path
                  fillRule="evenodd"
                  d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-stone-500 group-hover:text-[#003893] transition-colors whitespace-nowrap max-[359px]:hidden">
                ¿Iniciar sesión?
              </span>
            </Link>
          )}
        </header>

        <div className="w-full flex flex-col">
          <div className="w-full h-[6px] bg-[#FCC21B]"></div>
          <div className="w-full h-[4.5px] bg-[#003893]"></div>
          <div className="w-full h-[4.5px] bg-[#CE1126]"></div>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center px-6 py-8 gap-10">
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold font-montserrat text-[#020201] tracking-tight leading-tight">
            Bienvenidos a IMPULSA LAB
          </h1>

          <p className="text-stone-600 text-base md:text-lg leading-relaxed font-inter max-w-xl mx-auto text-center">
            Transformamos ideas estudiantiles en negocios reales, sostenibles y conectados con el entorno empresarial.
          </p>
        </section>

        <section className="w-full">
          <SobreNosotrosTeaser items={infoDesplegable} />
        </section>

        <section className="w-full">
          <NoticiasHome usuario={usuario} />
        </section>

        <section className="w-full">
          <TarjetasCarousel tarjetas={tarjetas} onClickTarjeta={manejarClicTarjeta} />
        </section>
      </main>

      <PanelAcademico usuario={usuario} />

      <section id="Nuestros-emprendedores">
        <div className="px-6 py-8">
          <VideoEmprendedores usuario={usuario} />
        </div>
      </section>

      <hr className="w-[98%] mx-auto my-6"/>
      <footer className="mt-auto border-t border-stone-200/50 bg-white">
        <div className="px-6 py-8 text-center">
          <h4 className="font-montserrat font-bold text-base text-[#020201] mb-2">
            Contáctenos
          </h4>
          <p className="text-stone-600 text-sm leading-relaxed font-inter max-w-md mx-auto">
            Escríbenos a{" "}
            <a href="mailto:impulsalab@universitariadecolombia.edu.co" className="text-[#003893] font-medium hover:underline">
              impulsalab@universitariadecolombia.edu.co
            </a>{" "}
            o comunícate con nosotros a través de nuestras redes sociales.
          </p>

          <div className="mt-5 flex items-center justify-center gap-4">
            <a
              href="https://www.instagram.com/somosimpulsalab/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de IMPULSA LAB"
              title="Instagram de IMPULSA LAB"
              className="il-hover-lift flex w-11 h-11 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-[#003893] hover:text-[#003893]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </a>

            <a
              href="https://www.tiktok.com/@somos_impulsalab"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok de IMPULSA LAB"
              title="TikTok de IMPULSA LAB"
              className="il-hover-lift flex w-11 h-11 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-[#003893] hover:text-[#003893]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M14.5 2.5c.35 2.35 1.9 4.1 4.3 4.4v2.6c-1.55.02-2.98-.46-4.3-1.35v6.34a5.28 5.28 0 11-4.7-5.25v2.68a2.7 2.7 0 102.3 2.67V2.5h2.4z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="py-4 text-center text-xs text-stone-400 font-inter border-t border-stone-200/50">
          © 2026 IMPULSA LAB — Institución Universitaria de Colombia
        </div>
      </footer>

      {avisoLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#003893]/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[#003893]">
                <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-montserrat font-bold text-lg text-[#020201]">
              Debes iniciar sesión
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Para continuar necesitas iniciar sesión o crear una cuenta en IMPULSA LAB.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-xl bg-[#003893] px-4 py-3 text-white font-semibold font-montserrat tracking-wide transition hover:bg-[#003893]/90"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => setAvisoLogin(false)}
                className="w-full rounded-xl px-4 py-3 text-stone-500 font-medium transition hover:text-[#020201]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}