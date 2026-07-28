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
