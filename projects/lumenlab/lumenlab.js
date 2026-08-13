// BOTON IDIOMA — EN / ES (el sitio se lanza en inglés por defecto, igual que la página principal)
let currentLang = localStorage.getItem('lang') || 'en';

const langToggle = document.getElementById('boton_idioma');
const langText = document.getElementById('lang-text');

applyLanguage(currentLang);
langText.textContent = currentLang === 'es' ? 'EN' : 'ES';
if (currentLang === 'en') langToggle.classList.add('lang-active');

langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('lang', currentLang);
    applyLanguage(currentLang);
    langText.textContent = currentLang === 'es' ? 'EN' : 'ES';
    langToggle.classList.toggle('lang-active');
});

function applyLanguage(lang) {
    const elements = document.querySelectorAll('[data-es][data-en]');
    elements.forEach(el => {
        el.innerHTML = el.getAttribute(`data-${lang}`);
    });
    document.documentElement.lang = lang;
}


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


// VÍDEOS DE LAS CARACTERÍSTICAS — se pulsan para verlos, y al hacerlo se agrandan
//
// No llevan `autoplay` ni arrancan al pasar el ratón: con la ampliación puesta, el hover
// haría cambiar de tamaño las tarjetas solo con mover el ratón, y la página bailaría sola.
//
// Con `preload="metadata"` solo se piden las cabeceras. El `#t=0.1` del src coloca al
// navegador en el primer fotograma, así que la tarjeta enseña una imagen fija en vez de
// un rectángulo vacío, sin descargar el vídeo entero.
const videosDeTarjeta = document.querySelectorAll('.media_caracteristica.reproducible video');
const tarjetasDeCaracteristica = document.querySelectorAll('.features_grid .feature_card');

const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DURACION = 420;
const CURVA = 'cubic-bezier(.19, 1, .22, 1)';

// Pone las clases que corresponden a lo que los vídeos están haciendo AHORA. No recibe
// parámetros a propósito: se deduce del estado real en vez de llevar la cuenta aparte,
// que es lo que se desincroniza cuando el navegador pausa por su cuenta.
function ajustarTarjetas() {
    videosDeTarjeta.forEach(video => {
        const marco = video.closest('.media_caracteristica');
        const tarjeta = video.closest('.feature_card');

        marco.classList.toggle('reproduciendo', !video.paused);
        if (tarjeta) tarjeta.classList.toggle('ampliada', !video.paused);
    });
}

// La tarjeta pasa de una columna a tres, y con ella se mueven de sitio las otras seis.
// `grid-column` NO se puede animar, así que la animación se hace a mano:
//
//   1. se apunta dónde está cada tarjeta,
//   2. se aplica el cambio —que salta, como siempre—,
//   3. se apunta dónde ha quedado y se la lleva de vuelta a donde estaba,
//   4. se la suelta, y el navegador la trae a su sitio nuevo animándola.
//
// Se anima solo la POSICIÓN, con `translate`. Escalando también el tamaño, el texto de la
// tarjeta se estiraría por el camino y se leería deformado durante medio segundo.
//
// Esto no depende de que el navegador traiga nada moderno: mover con `transform` funciona
// en todos. La versión anterior usaba transiciones de vista, que son más bonitas —animan
// también el cambio de tamaño— pero solo existen en navegadores recientes y, cuando no
// están, no animan ni avisan. Se cambió por esto porque no se movía nada y desde fuera no
// había manera de saber si era eso o el ajuste de «reducir movimiento» del sistema.
function conAnimacion(cambio) {
    if (menosMovimiento) { cambio(); return; }

    const tarjetas = [...tarjetasDeCaracteristica];
    const antes = tarjetas.map(t => t.getBoundingClientRect());

    cambio();

    tarjetas.forEach((tarjeta, i) => {
        const ahora = tarjeta.getBoundingClientRect();
        const dx = antes[i].left - ahora.left;
        const dy = antes[i].top - ahora.top;

        // Las que no se han movido no se animan: animarlas cuesta y no se ve.
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        tarjeta.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: DURACION, easing: CURVA }
        );
    });
}

// Arrancar un vídeo pausa el anterior, así que llegan DOS avisos casi a la vez. Animando
// por aviso, la segunda animación aborta a la primera y se ve un tirón. Esperando al
// siguiente fotograma, los dos cambios entran en una sola animación.
let pendiente = false;

function sincronizar() {
    if (pendiente) return;
    pendiente = true;

    requestAnimationFrame(() => {
        pendiente = false;
        conAnimacion(ajustarTarjetas);
    });
}

videosDeTarjeta.forEach(video => {
    // Se escucha al VÍDEO y no al clic: así el tamaño y el botón de ▶ aciertan también
    // cuando el navegador para por su cuenta —al pasar la pestaña a segundo plano, o
    // porque otro vídeo le quitó el turno— en vez de quedarse ampliado sobre una imagen
    // congelada.
    video.addEventListener('play', sincronizar);
    video.addEventListener('pause', sincronizar);

    video.addEventListener('click', () => {
        if (!video.paused) { video.pause(); video.currentTime = 0.1; return; }

        // Solo uno a la vez: dos tarjetas ampliadas dejarían la rejilla en una columna.
        videosDeTarjeta.forEach(otro => {
            if (otro !== video && !otro.paused) { otro.pause(); otro.currentTime = 0.1; }
        });

        // play() devuelve una promesa que se rechaza si el navegador lo impide. No es un
        // error que haya que enseñar.
        const intento = video.play();
        if (intento) intento.catch(() => {});
    });
});
