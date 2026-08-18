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

const currentLang = document.documentElement.lang;



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





// Animación nombre DMP — colapso y reescritura LETRA POR LETRA
(function () {
 
  /* ── DATOS ─────────────────────────────────────────────────── */
  const LINES = [
    { selector: '.nombre',    initial: 'D', name: 'avid',     word: 'eveloper.'     },
    { selector: '.apellido1', initial: 'M', name: 'artínez',  word: 'ultiplatform' },
    { selector: '.apellido2', initial: 'P', name: 'alomares', word: 'rojects'      },
  ];
 
  /* ── TIMINGS (ms) ───────────────────────────────────────────── */
  const T = {
    pauseName:      250,  // tiempo que el nombre completo está visible
    pauseWord:      250,  // tiempo que Developer/Multiplatform/Projects está visible
    expandDelay:    600,  // escalonado entre líneas (D, M, P) al empezar a escribirse
    letterStep:      45,  // ms entre el inicio de cada letra al APARECER
    letterDuration: 220,  // duración de la transición de cada letra (debe coincidir con el CSS)
    collapseStep:    30,  // ms entre el inicio de cada letra al DESAPARECER (más rápido que al escribir)
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
      }
 
      .dmp-letter {
        display: inline-block;
        opacity: 0;
        transform: translateY(0px);
        transition: opacity ${T.letterDuration}ms ease, transform ${T.letterDuration}ms ease;
      }
 
      .dmp-letter.dmp-letter-visible {
        opacity: 1;
        transform: translateY(0);
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
      line.elSuffix.textContent = ''; // arranca vacío: JS toma el control desde aquí
    });
  }
 
  /* ── ESCRIBIR / BORRAR letra a letra ─────────────────────────── */
 
  // Sustituye el contenido por un <span> por letra (todos ocultos al principio)
  function buildLetters(el, text) {
    el.innerHTML = '';
    return [...text].map(ch => {
      const span = document.createElement('span');
      span.className = 'dmp-letter';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      el.appendChild(span);
      return span;
    });
  }
 
  // Aparecen en cascada, de izquierda a derecha
  async function typeIn(el, text) {
    const letters = buildLetters(el, text);
    letters.forEach((span, i) => {
      setTimeout(() => span.classList.add('dmp-letter-visible'), i * T.letterStep);
    });
    const total = (letters.length - 1) * T.letterStep + T.letterDuration;
    await wait(total);
  }
 
  // Desaparecen en cascada, de derecha a izquierda (efecto "borrado")
  async function typeOut(el) {
    const letters = Array.from(el.querySelectorAll('.dmp-letter')).reverse();
    letters.forEach((span, i) => {
      setTimeout(() => span.classList.remove('dmp-letter-visible'), i * T.collapseStep);
    });
    const total = letters.length
      ? (letters.length - 1) * T.collapseStep + T.letterDuration
      : 0;
    await wait(total);
    el.innerHTML = ''; // limpio para la próxima palabra
  }
 
  /* ── FASES ──────────────────────────────────────────────────── */
  async function collapseAll() {
    await Promise.all(LINES.map(line => typeOut(line.elSuffix)));
    await wait(80);
  }
 
  async function expandWords() {
    for (const line of LINES) {
      typeIn(line.elSuffix, line.word);
      await wait(T.expandDelay);
    }
    const lastLetters = LINES[LINES.length - 1].word.length;
    await wait((lastLetters - 1) * T.letterStep + T.letterDuration);
  }
 
  async function expandName() {
    for (const line of LINES) {
      typeIn(line.elSuffix, line.name);
      await wait(T.expandDelay);
    }
    const lastLetters = LINES[LINES.length - 1].name.length;
    await wait((lastLetters - 1) * T.letterStep + T.letterDuration);
  }
 
  /* ── CICLO PRINCIPAL ────────────────────────────────────────── */
  async function cycle() {
    while (true) {
      await wait(T.pauseName);  // nombre visible
      await collapseAll();      // colapsa → D M P
      await expandWords();      // escribe → Developer / Multiplatform / Projects
      await wait(T.pauseWord);  // acrónimo visible
      await collapseAll();      // colapsa → D M P
      await expandName();       // escribe → David / Martínez / Palomares
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






// CV SEGÚN IDIOMA
// Si existe assets/DavidMartinezCVes.pdf, el botón lo ofrece cuando el
// idioma es español; si no existe, siempre se descarga la versión en inglés.
const cvLink = document.querySelector('.boton_descargar');
const CV_FILES = { en: '/assets/DavidMartinezCVen.pdf', es: '/assets/DavidMartinezCVes.pdf' };
let cvEsDisponible = false;

function actualizarCV(lang) {
  if (!cvLink) return;
  const file = (lang === 'es' && cvEsDisponible) ? CV_FILES.es : CV_FILES.en;
  cvLink.href = file;
  cvLink.setAttribute('download', file.split('/').pop());
}

fetch(CV_FILES.es, { method: 'HEAD' })
  .then(r => {
    cvEsDisponible = r.ok;
    actualizarCV(currentLang);
  })
  .catch(() => {});


// AÑO DINÁMICO EN EL FOOTER
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = ' ' + new Date().getFullYear() + ' ';
