# Atelier

Tu armario, en el bolsillo. PWA para el iPhone, local-first: haces una foto a una prenda, el fondo se quita en el propio dispositivo y queda guardada en menos de 10 segundos.

> Estado: **Fase 1**: alta rápida de prendas y armario.

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

## Foto de producto con IA (opcional y gratis)

Con una foto hecha de cualquier manera (jersey doblado en la cama, con las crocs al lado…), el recorte local no basta: recorta lo que más destaca y deja la prenda tal como estaba. Por eso hay una **función de servidor propia** en `worker/`, en Cloudflare Workers AI con el plan gratuito (unas 75 prendas al día, sin tarjeta y sin claves de API):

1. Un modelo de visión identifica la prenda principal y su categoría, que aparece resaltada al elegir.
2. FLUX.2 [klein] genera esa prenda **estirada, de frente y sobre fondo blanco**.
3. El móvil recorta ese fondo blanco y saca el color.

Sin conexión, sin cuota o sin configurar, la app recorta en el móvil como siempre. Las prendas ya guardadas tienen el botón **Mejorar con IA**, que parte de la foto original guardada. Instalación en [`worker/README.md`](worker/README.md).

> La IA genera una imagen nueva a partir de tu foto: puede simplificar o inventar detalles como logos o texturas. Siempre se guarda tu foto original.

## Alta rápida (fase 1)

1. **+** abre la cámara directamente. A la vez empieza a cargarse el modelo, mientras encuadras.
2. La foto aparece al instante con una línea de escaneo. El recorte (ISNet) se hace en el iPhone: con **WebGPU** usa `isnet_fp16` (88 MB) y, si no hay WebGPU, la **CPU** con `isnet_quint8` (44 MB).
3. El color principal y la paleta salen de un **k-means en Lab** sobre los píxeles del recorte. Las luces y sombras de la misma tela se unen en un solo color.
4. **Eliges la categoría y ya está guardada**, aunque el recorte no haya terminado: se completa en segundo plano. Si cierras la app a medias, se reanuda al abrirla.

También acepta fotos de la galería y recortes pegados: si copias una prenda con «Copiar sujeto» en Fotos, la app detecta la transparencia y se salta el modelo.

El modelo se sirve desde la propia app, no desde el CDN de IMG.LY. No está en git: `npm run fetch-model` lo descarga del paquete oficial y copia solo lo que se usa. La primera vez se descarga una sola vez (unos 110 MB con WebGPU) y el service worker lo guarda para usarlo sin conexión.

## Estructura

```
src/
  db/        esquema Dexie y tipos (Garment, Outfit, DayPlan, WearLog, Settings)
  domain/    reglas puras: categorías, lavado, color (k-means/Lab), nombres automáticos
  features/  capture/ (cola de alta rápida), wardrobe/ (tarjetas)
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

> Los datos se guardan por dominio: lo que metas en la versión de Pages no aparecerá cuando pases a `atelier.sangon.eu`. Para eso estará la copia de seguridad (fase 5).

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
- iOS puede borrar los datos de una web: la app pide `navigator.storage.persist()` y en la fase 5 tendrá copia de seguridad para exportar e importar.

## Hoja de ruta

- [x] **Fase 0**: base, PWA, sistema de diseño y GitHub Pages
- [x] **Fase 1**: alta rápida (cámara, recorte, color y categoría), armario con filtros y ficha editable
- [ ] **Fase 2**: estados limpia/usada/sucia y lavadora
- [ ] **Fase 3**: outfits y collage 2D
- [ ] **Fase 4**: calendario semanal y "Usado hoy"
- [ ] **Fase 5**: ajustes, copia de seguridad y pulido

Más adelante: recomendador por reglas de color, IA con función de servidor, maniquí 3D, sincronización cifrada con GitHub y compartir con colegas.

## Licencia

[AGPL-3.0-or-later](LICENSE). Es necesaria porque el motor de recorte (@imgly/background-removal) es AGPL.
