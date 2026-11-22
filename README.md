# Atelier

Tu armario, en el bolsillo. PWA para el iPhone, local-first: haces una foto a una prenda, el fondo se quita en el propio dispositivo y queda guardada en menos de 10 segundos.

> Estado: **Fase 0** — base del proyecto, PWA instalable, sistema de diseño y despliegue.

## Stack

| Pieza | Para qué |
|---|---|
| Vite + React 19 + TypeScript | App |
| Tailwind CSS v4 | Estilos; los tokens viven en `src/index.css` |
| vite-plugin-pwa (Workbox) | Service worker, manifest, uso sin conexión |
| Dexie (IndexedDB) | Datos e imágenes en el dispositivo |
| wouter | Rutas (~2 KB) |
| i18n propio tipado | ES/EN; TypeScript avisa si falta una traducción |
| Vitest + fake-indexeddb | Tests de la lógica |
| @imgly/background-removal *(fase 1)* | Quitar el fondo en el dispositivo (AGPL-3.0) |

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173 (también en la red local)
npm test
npm run build      # dist/ listo para subir
npm run preview    # sirve dist/ con el service worker activo
npm run icons      # regenera los PNG del icono desde public/favicon.svg
```

## Estructura

```
src/
  db/        esquema Dexie y tipos (Garment, Outfit, DayPlan, WearLog, Settings)
  domain/    reglas puras: categorías, lavado (y más adelante color y recomendador)
  i18n/      es.ts (fuente) y en.ts
  lib/       ajustes, almacenamiento persistente
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

Lavado por defecto: camisetas 1 · manga larga 2 · sudaderas 3 · pantalones 3 (vaqueros 4) · chaquetas 8 · calzado y accesorios nunca.

## Diseño

Misma paleta que [alvaro.sangon.eu](https://alvaro.sangon.eu): tinta `#0c0d0f`/`#eeeeef`, acento ámbar `#ffae00`, Inter + SF Mono para las etiquetas `FIG. 0X`, papel milimetrado, láminas con marcas de corte y barra inferior de cristal líquido (heredada de Zapper AIO). El sistema completo se ve en la app: **Ajustes → Sistema de diseño**.

## Despliegue (Nethosting)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: tests, build y subida por FTPS a la carpeta del subdominio.

1. En el panel de Nethosting, crea el subdominio `atelier.sangon.eu` y activa SSL (Let's Encrypt).
2. Crea una cuenta FTP limitada a la carpeta de ese subdominio.
3. En GitHub → *Settings → Secrets and variables → Actions*, añade `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` y `FTP_DIR` (carpeta del subdominio, acabada en `/`).
4. Haz push a `main`, o lanza el workflow a mano desde *Actions*.

`public/.htaccess` fuerza HTTPS, redirige las rutas a `index.html`, añade cabeceras de seguridad (CSP sin orígenes externos) y controla la caché: `index.html` y `sw.js` siempre se revalidan, y `/assets/` se cachea para siempre.

## Instalar en el iPhone

Safari → `atelier.sangon.eu` → Compartir → **Añadir a pantalla de inicio**. Ábrela desde el icono, no desde Safari: solo así iOS concede el almacenamiento persistente.

## Privacidad y seguridad

- Ningún dato sale del dispositivo. No hay servidor ni analítica.
- Ninguna clave de API en el cliente, nunca. La futura IA irá en una función de servidor.
- iOS puede borrar los datos de una web: la app pide `navigator.storage.persist()` y en la fase 5 tendrá copia de seguridad para exportar e importar.

## Hoja de ruta

- [x] **Fase 0**: base, PWA, sistema de diseño y despliegue
- [ ] **Fase 1**: alta rápida (cámara, recorte, color y categoría) y armario
- [ ] **Fase 2**: estados limpia/usada/sucia y lavadora
- [ ] **Fase 3**: outfits y collage 2D
- [ ] **Fase 4**: calendario semanal y "Usado hoy"
- [ ] **Fase 5**: ajustes, copia de seguridad y pulido

Más adelante: recomendador por reglas de color, IA con función de servidor, maniquí 3D, sincronización cifrada con GitHub y compartir con colegas.

## Licencia

[AGPL-3.0-or-later](LICENSE). Es necesaria porque el motor de recorte (@imgly/background-removal) es AGPL.
