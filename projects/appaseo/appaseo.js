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
