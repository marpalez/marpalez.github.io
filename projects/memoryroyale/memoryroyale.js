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


// AÑO DINÁMICO EN EL FOOTER
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = '\u00A0' + new Date().getFullYear() + '\u00A0';
