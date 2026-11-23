# atelier-ai: función de servidor (Cloudflare Workers AI, gratis)

Convierte una foto de una prenda hecha de cualquier manera en una foto de producto limpia:
1. **Visión** (`llama-3.2-11b-vision-instruct`): identifica la prenda principal y su categoría, aunque haya más cosas en la foto.
2. **Imagen** (`flux-2-klein-4b`): genera esa prenda estirada, de frente y sobre fondo blanco.

El móvil recorta después ese fondo blanco con su propio modelo.

- **Coste: 0 €.** Usa la cuota gratuita de Workers AI (10.000 neuronas al día, unas 75 prendas). Si se acaba, la función responde 429 y la app recorta en el móvil hasta el día siguiente. En el plan gratuito no se cobra nunca: simplemente se para.
- **Sin claves de API:** Workers AI se usa a través del *binding* `AI` de Cloudflare.
- **Privacidad:** la foto llega a la función, se genera la imagen y no se guarda nada.

## Instalarla (una vez, solo con el navegador)

Se usa **Workers Builds**: Cloudflare se conecta al repo de GitHub y redespliega solo con cada push a `main`.

1. Crea una cuenta gratis en https://dash.cloudflare.com/sign-up. No pide tarjeta.
2. Ve a *Workers & Pages → Create → Import a repository* y elige `euZAPUS/Atelier`. El nombre del Worker debe ser **`atelier`**, igual que `name` en `wrangler.toml`.
3. En *Settings → Build*:
   - **Root directory:** `worker`
   - **Build command:** vacío
   - **Deploy command:** `npx wrangler deploy`
4. En *Settings → Variables and Secrets*, añade un **Secret** llamado `ACCESS_KEY` con una contraseña que te inventes.
5. En la app, ve a *Ajustes → Foto de producto con IA*. Pega la URL `https://atelier.<tu-subdominio>.workers.dev` y la contraseña, pulsa *Probar conexión* y activa la IA.

### Alternativa desde el PC (con el repo clonado)

```bash
cd worker && npm install
npx wrangler login && npx wrangler deploy
npx wrangler secret put ACCESS_KEY
```

## Desarrollo

```bash
npm run check     # tipos
npx wrangler dev  # en local (Workers AI se ejecuta en remoto: necesita haber hecho login)
npx wrangler tail # ver los logs en directo
```
