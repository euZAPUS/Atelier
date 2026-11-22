# atelier-ai: función de servidor (Cloudflare Workers AI, gratis)

Convierte una foto de una prenda hecha de cualquier manera en una foto de producto limpia:
1. **Visión** (`llama-3.2-11b-vision-instruct`): identifica la prenda principal y su categoría, aunque haya más cosas en la foto.
2. **Imagen** (`flux-2-klein-4b`): genera esa prenda estirada, de frente y sobre fondo blanco.

El móvil recorta después ese fondo blanco con su propio modelo.

- **Coste: 0 €.** Usa la cuota gratuita de Workers AI (10.000 neuronas al día, unas 75 prendas). Si se acaba, la función responde 429 y la app recorta en el móvil hasta el día siguiente. En el plan gratuito no se cobra nunca: simplemente se para.
- **Sin claves de API:** Workers AI se usa a través del *binding* `AI` de Cloudflare.
- **Privacidad:** la foto llega a la función, se genera la imagen y no se guarda nada.

## Instalarla (una vez, desde el PC)

1. Crea una cuenta gratis en https://dash.cloudflare.com/sign-up. No pide tarjeta.
2. En una terminal:
   ```bash
   cd worker
   npm install
   npx wrangler login        # abre el navegador para autorizar
   npx wrangler deploy       # al final imprime la URL: https://atelier-ai.<tu-subdominio>.workers.dev
   ```
   La primera vez puede pedirte que elijas un subdominio `workers.dev`.
3. Pon una contraseña para que nadie más gaste tu cuota:
   ```bash
   npx wrangler secret put ACCESS_KEY
   ```
4. En la app: **Ajustes → Foto de producto con IA**. Pega la URL y la contraseña, pulsa *Probar conexión* y activa la IA.

## Desarrollo

```bash
npm run check     # tipos
npx wrangler dev  # en local (Workers AI se ejecuta en remoto: necesita haber hecho login)
npx wrangler tail # ver los logs en directo
```
