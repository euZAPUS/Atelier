# atelier-ai: función de servidor (Cloudflare Workers AI, gratis)

Convierte una foto de una prenda hecha de cualquier manera en una foto de producto limpia:
1. **Visión** (`llama-3.2-11b-vision-instruct`): identifica la prenda principal y su categoría, aunque haya más cosas en la foto.
2. **Imagen** (`flux-2-klein-4b`): genera esa prenda estirada, de frente y sobre fondo blanco.

El móvil recorta después ese fondo blanco con su propio modelo.

- **Coste: 0 €.** Usa la cuota gratuita de Workers AI (10.000 neuronas al día, unas 75 prendas). Si se acaba, la función responde 429 y la app recorta en el móvil hasta el día siguiente. En el plan gratuito no se cobra nunca: simplemente se para.
- **Sin claves de API:** Workers AI se usa a través del *binding* `AI` de Cloudflare.
- **Privacidad:** la foto llega a la función, se genera la imagen y no se guarda nada.

## Instalarla (una vez, solo con el navegador)

La despliega GitHub Actions (`.github/workflows/worker.yml`), así que no hace falta clonar nada.

1. **Cloudflare:** crea una cuenta gratis en https://dash.cloudflare.com/sign-up (no pide tarjeta).
   - Entra en **Workers & Pages** una vez para que se cree tu subdominio `workers.dev`.
   - Copia tu **Account ID** (sale en la columna derecha de *Workers & Pages* o en la página principal de la cuenta).
2. **Token:** ve a *My Profile → API Tokens → Create Token*, elige la plantilla **Edit Cloudflare Workers**, pulsa *Continue to summary* y luego *Create Token*. Copia el token.
3. **GitHub:** en el repo, *Settings → Secrets and variables → Actions → New repository secret*. Crea tres:
   - `CLOUDFLARE_API_TOKEN`: el token del paso 2
   - `CLOUDFLARE_ACCOUNT_ID`: el Account ID
   - `ATELIER_ACCESS_KEY`: una contraseña que te inventes
4. **Desplegar:** *Actions → Worker IA → Run workflow*. Al terminar, el resumen del workflow muestra la URL `https://atelier-ai.<tu-subdominio>.workers.dev`.
5. **App:** en *Ajustes → Foto de producto con IA*, pega la URL y la contraseña, pulsa *Probar conexión* y activa la IA.

A partir de ahí, cada cambio en `worker/` que llegue a `main` se vuelve a desplegar solo.

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
