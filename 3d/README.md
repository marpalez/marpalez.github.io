# David Martínez Palomares · A world within

Prueba **local** del portfolio low poly con ocho mundos anidados. El portfolio original sigue en `/`; esta propuesta está en `/3d/`.

## Abrir

En la raíz del proyecto:

```powershell
node .\3d\serve.mjs
```

Visita **http://127.0.0.1:4173/3d/**. El servidor escucha únicamente en este ordenador. No está publicado en Internet y la dirección no funciona desde otro teléfono.

Si faltan las dependencias: `npm.cmd ci --prefix .\3d --ignore-scripts`.

## Recorrido

1. Escritorio con el nombre completo y las dos frases ampliadas. El cubo compacto es la mitad del tamaño de v01.
2. AIDIMME: técnico y esfera integradora de Ulbricht, dentro de la cara oculta del cubo.
3. IMQ TECNOCREA: luminaria vial abierta, placas LED, driver y herramientas, dentro de la esfera.
4. SGS TECNOS: ensayo de rigidez dieléctrica sobre un equipo de rayos X, dentro del compartimento de la luminaria.
5. IMQ IBÉRICA: proyectos como bloques Tetris/Jenga en la bancada reutilizada, dentro del cabezal de rayos X.
6. València: Torres de Serranos, pin y taza con español, valenciano e inglés, entre los bloques.
7. Proyectos: busto y brazo doblado con un holograma cuadrado; el scroll selecciona APPASEO, MEMORY ROYALE, PÁGINA WEB HUELLA y PROGRAMA LUMENLAB. Está dentro del arco de las torres.
8. Avión e invitación “I’m ready, and you?”, dentro de la lente del reloj. Su ventanilla contiene de nuevo el escritorio.

La rueda, el trackpad, el gesto táctil y el teclado conservan el scroll nativo. El menú Chapters permite saltar entre capítulos. Las cuatro portadas son imágenes existentes del portfolio y tienen enlaces a sus proyectos. El botón final abre el correo de contacto.

## Cómo está construido

Los modelos provienen de `../blender/build_nested.py`, exportados a `../assets/3d/*.glb`. `worlds.json` incluye las posiciones, las escalas de cada interior y los recorridos de cámara para escritorio y móvil.

Cada interior es geometría real, colocada mediante una transformación dentro del objeto anterior. Al llegar a la escala del siguiente mundo, se cambia el sistema de coordenadas de cámara, objetos y luces juntos. Así se evita la pérdida de precisión al reducir ocho escalas sucesivas y se puede repetir el bucle. No hay pantallas negras ni fundidos entre escenarios.

El motor mantiene el mundo actual, el contenedor anterior y dos niveles interiores. Agrupa mallas estáticas por material y limita la resolución en móvil. Deja de dibujar cuando el scroll se detiene. Los textos HTML mantienen la lectura y los enlaces fuera del canvas; el portfolio original es la alternativa accesible.

## Verificación y alcance

```powershell
node .\3d\validate.mjs
```

Se comprueban los ocho GLB, las cuatro portadas, la continuidad geométrica en las ocho transiciones, el bucle en ambos sentidos y la proyección de cámara a 1440×900, 390×844 y 360×640. Blender comprueba el recorrido contra las mallas evaluadas en `../blender/validate_nested.py` y genera los renders horizontales, verticales y de entradas.

Esta entrega es una maqueta de composición y navegación. El personaje es genérico y editable. La radiografía es una ilustración geométrica original. El cubo y las torres son interpretaciones low poly, no réplicas técnicas exactas. Los encuadres móviles tienen verificación geométrica y renders; queda por medir la fluidez en un smartphone físico y revisar visualmente la interfaz web allí antes de publicar.

No se han modificado los datos ni el HTML de la web original. La publicación y la sustitución de la portada principal no forman parte de esta prueba local.
