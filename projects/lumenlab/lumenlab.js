// MENÚ DE NAVEGACIÓN — compartido por la página principal y las subpáginas
(function () {
  const boton = document.getElementById('nav_hamburguesa');
  const menu = document.getElementById('nav_enlaces');
  if (!boton || !menu) return;

  function cerrar() {
    menu.classList.remove('abierto');
    boton.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
  }

  boton.addEventListener('click', event => {
    event.stopPropagation();
    const abierto = menu.classList.toggle('abierto');
    boton.classList.toggle('abierto', abierto);
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  });

  menu.addEventListener('click', event => {
    if (event.target.closest('a')) cerrar();
  });

  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !boton.contains(event.target)) cerrar();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cerrar();
  });
})();

// El idioma lo fija la propia URL: /… en inglés, /es/… en español.
// Cada versión es un HTML estático generado por build.mjs, así que aquí no hay
// nada que conmutar; el botón de idioma es un enlace a la otra URL.


// Boton scroll arriba
const botonArriba = document.getElementById('boton_arriba');

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    botonArriba.classList.add('visible');
  } else {
    botonArriba.classList.remove('visible');
  }
});

botonArriba.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


// AÑO DINÁMICO EN EL FOOTER
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = '\u00A0' + new Date().getFullYear() + '\u00A0';


// LOS VÍDEOS — se reproducen solos mientras están a la vista y se paran al salir.
//
// Cada vídeo ocupa ya media fila, así que no hay nada que ampliar: se comportan igual
// los de las características y el de la escena. Con `preload="metadata"` no se descarga
// ninguno hasta que le toca reproducirse.
//
// Con «reducir movimiento» activado no arranca nada por su cuenta: aparecen los controles
// y decide quien mira.
const videos = document.querySelectorAll('.caracteristica-video');

const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (menosMovimiento) {
    videos.forEach(video => { video.controls = true; });
} else {
    const observador = new IntersectionObserver(entradas => {
        entradas.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting) { target.pause(); return; }

            // play() devuelve una promesa que se rechaza si el navegador lo impide. Si pasa,
            // se dan los controles en vez de dejar un rectángulo congelado sin explicación.
            const intento = target.play();
            if (intento) intento.catch(() => { target.controls = true; });
        });
    }, { threshold: 0.35 });

    videos.forEach(video => observador.observe(video));
}
