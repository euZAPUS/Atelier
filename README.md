# Atelier

Tu armario, en el bolsillo. PWA para el iPhone, local-first: haces una foto a una prenda, el fondo se quita en el propio dispositivo y queda guardada en menos de 10 segundos.

> Estado: **Fase 4** completada: semana y «Usar hoy».

## Stack

| Pieza | Para qué |
|---|---|
| Vite + React 19 + TypeScript | App |
| Archivo (variable, con eje de anchura) | Titulares condensados y texto |
| Tailwind CSS v4 | Estilos; los tokens viven en `src/index.css` |
| vite-plugin-pwa (Workbox) | Service worker, manifest, uso sin conexión |
| Dexie (IndexedDB) | Datos e imágenes en el dispositivo |
| wouter | Rutas (~2 KB) |
| i18n propio tipado | ES/EN; TypeScript avisa si falta una traducción |
| Vitest + fake-indexeddb | Tests de la lógica |
| @imgly/background-removal + onnxruntime-web | Quitar el fondo en el dispositivo (ISNet; WebGPU o CPU) |

## Desarrollo

```bash
npm install
npm run fetch-model  # una vez: descarga el modelo de recorte (~170 MB) a public/imgly/
npm run dev          # http://localhost:5173 (también en la red local)
npm test
npm run build      # dist/ listo para subir
npm run preview    # sirve dist/ con el service worker activo
npm run icons      # regenera los PNG del icono desde public/favicon.svg
```

## Foto de producto con IA (gratis, sin configurar)

Con una foto hecha de cualquier manera (jersey doblado en la cama, de lado, con las crocs al lado…) la app obtiene una foto de producto limpia. La IA corre en una **función propia** (`worker/`, Cloudflare Workers AI con el plan gratuito: unas 75 prendas al día, sin tarjeta y sin claves de API). Viene configurada: la app ya trae la URL y la IA activada, y la función no pide contraseña a las peticiones que vienen de la web de Atelier.

1. **Identificar** (`/identify`, Mistral Small 3.1, ~1,5 s): categoría, colores con nombre y **dónde está el cuello**. Si la prenda está de lado, la app gira la foto 90° y pregunta otra vez: arriba/abajo lo acierta siempre, izquierda/derecha no.
2. **Generar** (`/garment`, FLUX.2 [klein] 4B): con la foto ya derecha, la prenda estirada, de frente y sobre un **fondo neutro liso** (gris medio; blanco o negro si la prenda es gris). Las instrucciones son de **edición**: «convierte esta foto en…, quita la cama…, no copies texturas del entorno ni inventes logos». Fueron las ganadoras en las pruebas con fotos reales. Si el filtro de seguridad del modelo marca la imagen por error, se reintenta con instrucciones más simples.
3. **Recortar** en el móvil: se mide el color real del fondo en los bordes y se quita lo conectado con ellos, así lo blanco y lo negro de la ropa no desaparecen. Los nombres de color los pone la IA, que ve «verde botella» donde las matemáticas ven casi negro.

En la pantalla de alta, **Girar** y **Repetir** rehacen la foto si algo sale mal. Sin conexión, sin cuota o si la IA falla, se recorta en el móvil como siempre. Las prendas guardadas tienen **Mejorar con IA** en su ficha.

> La IA genera una imagen nueva: puede simplificar detalles. Siempre se guarda tu foto original (ya derecha).

Modo de pruebas de la función, solo con la cabecera `X-Atelier-Key`: campos `prompt`, `model` (`9b`) y `vmodel` para probar instrucciones y modelos sin redesplegar. `/identify` devuelve además la respuesta literal del modelo.

## Alta rápida (fase 1)

1. **+** abre la cámara directamente. A la vez empieza a cargarse el modelo, mientras encuadras.
2. La foto aparece al instante con una línea de escaneo. El recorte (ISNet) se hace en el iPhone: con **WebGPU** usa `isnet_fp16` (88 MB) y, si no hay WebGPU, la **CPU** con `isnet_quint8` (44 MB).
3. El color principal y la paleta salen de un **k-means en Lab** sobre los píxeles del recorte. Las luces y sombras de la misma tela se unen en un solo color.
4. **Eliges la categoría y ya está guardada**, aunque el recorte no haya terminado: se completa en segundo plano. Si cierras la app a medias, se reanuda al abrirla.

También acepta fotos de la galería y recortes pegados: si copias una prenda con «Copiar sujeto» en Fotos, la app detecta la transparencia y se salta el modelo.

El modelo se sirve desde la propia app, no desde el CDN de IMG.LY. No está en git: `npm run fetch-model` lo descarga del paquete oficial y copia solo lo que se usa. La primera vez se descarga una sola vez (unos 110 MB con WebGPU) y el service worker lo guarda para usarlo sin conexión.

## Subida en bloque

En *Añadir → Galería* puedes elegir **varias fotos a la vez**. Vuelves al armario al momento y:
- cada foto se guarda enseguida como prenda «en proceso» (con su original), así que si cierras la app no se pierde nada: se retoma al abrirla;
- se procesan **de una en una** en segundo plano (IA si hay cuota; si no, recorte en el móvil) con una barra «Añadiendo 3 de 10»;
- la categoría y el tipo los pone la IA y la prenda queda **Por revisar**: en su ficha, «¿Es correcto? Sí», o cambias la categoría. El aviso del armario filtra las que faltan.

## Outfits (fase 3)

- **Nuevo outfit** → **Añadir**: hoja con tu armario por categorías. Tocar añade o quita. Si un color chocaría con lo que ya llevas, la prenda sale marcada («choca con rojo»), y las sucias también.
- Cada prenda se **coloca sola** según su categoría, como extendida en la cama: gorra arriba, parte de arriba, pantalón, zapatillas abajo y accesorios a un lado.
- En el lienzo, **un dedo mueve** y **dos dedos escalan y giran**. Tocar una prenda la trae delante, y tienes los botones *Delante*, *Detrás* y *Quitar*. En el PC: rueda para escalar y Mayús + rueda para girar.
- **Veredicto de color** con las reglas de `harmony.ts`, incluidas las tuyas: «Combina bien», «Sin choques», «Mucho color» o «Rojo y verde chocan». Los neutros (negro, blanco, grises, beige, vaquero, marino…) van con todo.
- **Usar hoy**: suma un uso a todas las prendas del outfit y deja una entrada en el registro ligada al outfit (para la semana y las estadísticas). Se puede deshacer.
- Se guarda solo. Un outfit que dejas vacío no se queda guardado. Eliminar se puede deshacer.

## Semana (fase 4)

- **Hoy** arriba: el outfit planeado en grande, con **Usar hoy** (suma un uso a cada prenda) y **Cambiar**. Si no hay plan: «¿Qué te pones hoy?».
- Los 7 días, de lunes a domingo: toca uno para elegir outfit o quitar el plan (con deshacer). Con ‹ › cambias de semana; «Esta semana» vuelve a la actual.
- Avisos: si una prenda del outfit está sucia, el día dice «Lava antes: Chaqueta negra». Los días pasados muestran si lo pusiste o las prendas sueltas que anotaste.
- «Usar hoy» (aquí o en el editor) deja el día como **Puesto** en `DayPlan` y el registro (`WearLog`) ligado al outfit. Al borrar un outfit se quitan sus planes futuros, y vuelven si deshaces.

## Copia de seguridad (fase 5)

*Ajustes → Copia de seguridad*:
- **Exportar copia** crea un solo `.json` con todo: prendas, fotos (en base64), outfits, semana y registro de usos. En el iPhone abre la hoja de compartir (*Guardar en Archivos*, iCloud, AirDrop…) y en el PC se descarga. Los ajustes del dispositivo (tema, idioma, IA) no van en la copia.
- **Restaurar una copia** comprueba el archivo, te dice qué vas a sustituir y pide confirmación antes de tocar nada.
- Sirve también para pasar el armario de GitHub Pages a tu dominio cuando la subas allí.

## Gestos de iOS

- **Barra de pestañas**: mantén pulsado y desliza; la píldora se vuelve una lente que sigue al dedo, se estira con la velocidad y rebota con muelle (`lib/spring.ts`) al soltar.
- **Deslizar desde el borde izquierdo** para volver en la ficha, la lavadora, el editor de outfits y el kit.
- El **título grande se pliega** en una barra compacta al hacer scroll, y las filas de los grupos se iluminan al pulsar.

## Estructura

```
src/
  db/        esquema Dexie y tipos (Garment, Outfit, DayPlan, WearLog, Settings)
  domain/    reglas puras: categorías, lavado, color (k-means/Lab), nombres automáticos
  features/  capture/ (cola de alta rápida), wardrobe/ (tarjetas), outfits/ (collage)
  i18n/      es.ts (fuente) y en.ts
  lib/       ajustes, almacenamiento, imagen (canvas), recorte (imgly), navegación con transiciones
  ui/        sistema de diseño: Button, Chip, Icon, PageHeader, TabBar…
  pages/     pantallas
public/      icono, .htaccess, boot.js (tema antes de pintar)
```

## Modelo de datos

- **Garment**: el estado (limpia/usada/sucia) **no se guarda**, se calcula con `wearsSinceWash` frente a `washAfter` (`null` = nunca se ensucia) y `manualDirty`. El color va en hex, nombre y Lab (para el futuro recomendador).
- **GarmentImage**: tabla aparte (recorte, miniatura y original opcional), así la cuadrícula solo carga miniaturas.
- **Outfit**: posiciones del collage relativas (0–1), escala, rotación y capa.
- **DayPlan**: la clave es la fecha `YYYY-MM-DD`.
- **WearLog**: copia los ids de las prendas usadas ese día, para que las estadísticas no cambien si editas el outfit.

Nombre automático con concordancia: «Sudadera negra», «Pantalón vaquero», «Black hoodie». Se recalcula si cambias el idioma, y uno puesto a mano tiene prioridad.

Lavado por defecto: camisetas 1 · manga larga 2 · sudaderas 3 · pantalones 3 (vaqueros 4) · chaquetas 8 · calzado y accesorios nunca.

## Diseño

Estética streetwear: blanco roto o negro, acento **lima ácido** `#c8ff00`, titulares en **Archivo** condensada y negra, y etiquetas tipo SKU en mono (`N.º 001`, códigos de barras).

Animaciones:
- cinta de texto en movimiento;
- entrada escalonada de la cuadrícula;
- transiciones entre pantallas con View Transitions; la foto de la tarjeta se transforma en la de la ficha;
- escaneo mientras se recorta;
- recorte que aparece como una pegatina con borde blanco.

**Liquid Glass** (`src/ui/LiquidGlass.tsx`), solo en controles flotantes: barra inferior, barra de filtros, botón de volver y avisos. El contenido va siempre sobre fondo sólido.
- En Chromium, un filtro SVG con `feDisplacementMap` refracta lo que pasa por debajo cerca de los bordes. El mapa se genera una vez por tamaño y como máximo hay 4 elementos con refracción a la vez.
- Safari (también iOS) y Firefox no aplican filtros SVG en `backdrop-filter`, así que usan `blur(12px) saturate(160%)`.
- En todos los navegadores lleva borde especular y brillo superior.

Todos los colores están definidos en `src/index.css`, así que cambiar de estética no obliga a tocar las pantallas. El sistema completo se ve en *Ajustes → Sistema de diseño*.

## Probarla

**En el PC:**

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Con las herramientas de desarrollo en vista iPhone se ve igual que en el móvil.

**En el iPhone: GitHub Pages** → https://euzapus.github.io/Atelier/

Cada push a `main` ejecuta `.github/workflows/pages.yml`: tests, descarga del modelo, build con `BASE_PATH=/Atelier/` y publicación en Pages. Antes hay que activarlo una vez en *Settings → Pages → Source: GitHub Actions*.

Para instalarla: Safari → la URL → Compartir → **Añadir a pantalla de inicio**. Ábrela desde el icono, no desde Safari: solo así iOS concede el almacenamiento persistente.

> Los datos se guardan por dominio: lo que metas en la versión de Pages no aparecerá cuando pases a `atelier.sangon.eu`. Para eso está la copia de seguridad (Ajustes → Copia de seguridad).

## Despliegue en tu dominio (más adelante)

`.github/workflows/deploy.yml` (solo se lanza a mano) sube la build por FTPS a Nethosting:

1. Crea el subdominio `atelier.sangon.eu` en el panel y activa SSL.
2. Crea una cuenta FTP limitada a su carpeta.
3. Añade los secretos `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` y `FTP_DIR` en GitHub.
4. Lanza *Actions → Deploy Nethosting*.

`public/.htaccess` fuerza HTTPS, redirige las rutas a `index.html`, añade cabeceras de seguridad (CSP sin orígenes externos) y controla la caché.

## Privacidad y seguridad

- Ningún dato sale del dispositivo. No hay servidor ni analítica.
- Ninguna clave de API en el cliente, nunca. La futura IA irá en una función de servidor.
- iOS puede borrar los datos de una web: la app pide `navigator.storage.persist()` y tiene copia de seguridad en Ajustes para exportar y restaurar.

## Hoja de ruta

- [x] **Fase 0**: base, PWA, sistema de diseño y GitHub Pages
- [x] **Fase 1**: alta rápida (cámara, recorte, color y categoría), armario con filtros y ficha editable
- [x] **Fase 2**: estados limpia/usada/sucia (automáticos por usos), «Usada hoy», marcar sucia a mano, lavadora con selección y deshacer
- [x] **Fase 3**: outfits con collage 2D (mover, escalar, girar), colocación automática, avisos de color y «Usar hoy»
- [x] **Fase 4**: semana con plan por día, «Usar hoy», avisos de prendas sucias
- [ ] **Fase 5**: ajustes, copia de seguridad y pulido

Más adelante: recomendador por reglas de color, IA con función de servidor, maniquí 3D, sincronización cifrada con GitHub y compartir con colegas.

## Licencia

[AGPL-3.0-or-later](LICENSE). Es necesaria porque el motor de recorte (@imgly/background-removal) es AGPL.
