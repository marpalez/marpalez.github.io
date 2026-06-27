// BOTON IDIOMA — ES / EN
let currentLang = localStorage.getItem('lang') || 'es';

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
    cargarPista(currentLang);
});

function applyLanguage(lang) {
    const elements = document.querySelectorAll('[data-es][data-en]');
    elements.forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
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


// SCROLL ANIMATIONS — entrada desde la derecha


const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.imqiberica, .sgstecnos, .imqtecnocrea, .aidimme, .tarjeta_normtec, .tarj_formacion, .sobremi_parrafo_contenedor, .nombre, .apellido').forEach(el => {
    el.classList.add('slide-in');
    observer.observe(el);
});



// Animación nombre DMP
(function () {
 
  /* ── DATOS ─────────────────────────────────────────────────── */
  const LINES = [
    { selector: '.nombre',    initial: 'D', name: 'avid',     word: 'eveloper.'     },
    { selector: '.apellido1', initial: 'M', name: 'artínez',  word: 'ultiplatform' },
    { selector: '.apellido2', initial: 'P', name: 'alomares', word: 'rojects'      },
  ];
 
  /* ── TIMINGS (ms) ───────────────────────────────────────────── */
  const T = {
    pauseName:   250,  // tiempo que el nombre completo está visible
    pauseWord:   250,  // tiempo que Developer/Multiplatform/Projects está visible
    collapseAll:  1000,  // duración del colapso (debe coincidir con el CSS)
    expandDelay:  600,  // escalonado entre líneas al expandirse
    expandCSS:    1000,  // duración de la expansión (debe coincidir con el CSS)
  };
 
  /* ── HELPERS ────────────────────────────────────────────────── */
  const wait = ms => new Promise(r => setTimeout(r, ms));
 
  /* ── ESTILOS ────────────────────────────────────────────────── */
  function injectStyles() {
    const css = `
      .dmp-initial {
        display: inline-block;
        flex-shrink: 0;
      }
 
      .dmp-suffix {
        display: inline-block;
        overflow: hidden;
        white-space: nowrap;
        max-width: 0;
        opacity: 0;
        transition: max-width ${T.expandCSS}ms cubic-bezier(0.77, 0, 0.18, 1),
                    opacity 0.3s ease;
      }
 
      .dmp-suffix.dmp-name-visible,
      .dmp-suffix.dmp-word-visible {
        max-width: 10em;
        opacity: 1;
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
 
  /* ── REFERENCIAS AL DOM ─────────────────────────────────────── */
  function getElements() {
    LINES.forEach(line => {
      line.elInit   = document.querySelector(line.selector + ' .dmp-initial');
      line.elSuffix = document.querySelector(line.selector + ' .dmp-suffix');
    });
  }
 
  /* ── FASES ──────────────────────────────────────────────────── */
  async function collapseAll() {
    LINES.forEach(line => {
      line.elSuffix.classList.remove('dmp-name-visible', 'dmp-word-visible');
    });
    await wait(T.collapseAll + 80);
  }
 
  async function expandWords() {
    for (const line of LINES) {
      line.elSuffix.textContent = line.word;
      line.elSuffix.classList.add('dmp-word-visible');
      await wait(T.expandDelay);
    }
    await wait(T.expandCSS);
  }
 
  async function expandName() {
    for (const line of LINES) {
      line.elSuffix.textContent = line.name;
      line.elSuffix.classList.add('dmp-name-visible');
      await wait(T.expandDelay);
    }
    await wait(T.expandCSS);
  }
 
  /* ── CICLO PRINCIPAL ────────────────────────────────────────── */
  async function cycle() {
    while (true) {
      await wait(T.pauseName);  // nombre visible
      await collapseAll();      // colapsa → D M P
      await expandWords();      // expande → Developer / Multiplatform / Projects
      await wait(T.pauseWord);  // acrónimo visible
      await collapseAll();      // colapsa → D M P
      await expandName();       // expande → David / Martínez / Palomares
    }
  }


 
  /* ── INIT ───────────────────────────────────────────────────── */
  function init() {
    injectStyles();
    getElements();
    cycle();
  }
 
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
 
})();

// REPRODUCTOR
const pistas = {
  es: './src/david_laboratorio_es.mp3',
  en: './src/david_laboratorio_en.mp3'
};

const audio = document.getElementById('reproductor_audio');
const btnPlay = document.getElementById('reproductor_play');
const progreso = document.getElementById('reproductor_progreso');
const tiempoActual = document.getElementById('reproductor_actual');
const tiempoDuracion = document.getElementById('reproductor_duracion');
const titulo = document.getElementById('reproductor_titulo');

const titulosPista = {
  es: 'Sobre mí, modo canción',
  en: 'About me, song mode'
};

function cargarPista(lang) {
  const estabaSonando = !audio.paused;
  audio.src = pistas[lang];
  titulo.textContent = titulosPista[lang];
  if (estabaSonando) audio.play();
}

function togglePlay() {
  if (audio.paused) {
    audio.play();
    btnPlay.textContent = '⏸';
  } else {
    audio.pause();
    btnPlay.textContent = '▶';
  }
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${seg}`;
}

audio.addEventListener('timeupdate', () => {
  const pct = (audio.currentTime / audio.duration) * 100 || 0;
  progreso.style.width = pct + '%';
  tiempoActual.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  tiempoDuracion.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  btnPlay.textContent = '▶';
  progreso.style.width = '0%';
});

function seekAudio(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
}

// Cargar pista según idioma actual
cargarPista(currentLang);

// Actualizar pista al cambiar idioma — añade esto dentro del langToggle click listener
// cargarPista(currentLang);