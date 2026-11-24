/**
 * Atelier AI — convierte una foto de una prenda hecha de cualquier manera
 * (doblada, sobre la cama, con otras cosas alrededor) en una foto de producto limpia.
 *
 * POST /garment  (multipart: image=<jpeg>, hint?=<categoría>)
 *   1. Un modelo de visión identifica la prenda principal y su categoría.
 *   2. FLUX.2 [klein] genera esa prenda estirada, de frente y sobre un fondo neutro liso
 *      (gris medio, blanco o negro: el que más contraste con la prenda) que la app recorta.
 *   → { image: <base64>, key: <color del fondo>, category, description, colors }
 *
 * Acceso: desde la web de Atelier (Origin permitido) no hace falta contraseña. Cualquier otra
 * llamada (scripts, curl…) necesita la cabecera X-Atelier-Key = ACCESS_KEY.
 *
 * Todo corre en Workers AI (plan gratis: 10.000 neuronas/día ≈ 75 prendas). Sin claves de API.
 * No se guarda nada: la foto entra, sale la imagen generada y se olvida.
 */

export interface Env {
  AI: Ai
  ALLOWED_ORIGINS?: string
  ACCESS_KEY?: string
}

const DEFAULT_ORIGINS = 'https://euzapus.github.io,http://localhost:5173,http://localhost:4173'
const VISION = '@cf/meta/llama-4-scout-17b-16e-instruct'
const IMAGE = '@cf/black-forest-labs/flux-2-klein-4b'
const CATEGORIES = ['tshirts', 'longsleeves', 'hoodies', 'jackets', 'trousers', 'footwear', 'accessories'] as const
type Category = (typeof CATEGORIES)[number]

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  // Si la variable falta (p. ej. se borró en el panel), se usan estos valores en vez de romper la función
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim())
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Atelier-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const json = (data: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

/** 1. ¿Qué prenda es? Devuelve categoría y una descripción corta en inglés para el prompt de imagen. */
type Identity = { category: Category | null; description: string; colors: string[]; rotation: 0 | 90 | 180 | 270 }
async function identify(env: Env, bytes: Uint8Array, hint?: string): Promise<Identity> {
  const prompt = `You are a fashion cataloguer. Look at the photo and find the MAIN garment (the biggest clothing item in focus${hint ? `, probably from the category "${hint}"` : ''}). Ignore beds, floors, hands, shoes in the background and any other objects.
Answer ONLY with JSON, no prose: {"category": one of ${JSON.stringify(CATEGORIES)}, "neckline": "<where the collar/neckline (or the waistband for trousers, the opening for shoes) is in the image: top, bottom, left or right>", "colors": ["<main colour of the garment>", "<other colours, most visible first>"], "description": "<colours, material, garment type and visible details such as collar, stripes, prints or logos, max 18 words>"}
For colours use simple names such as: black, charcoal, grey, light grey, white, cream, beige, camel, brown, khaki, olive, dark green, green, mint, teal, navy, blue, denim blue, light blue, purple, lilac, pink, fuchsia, red, burgundy, orange, mustard, yellow.
Describe only what you can actually see. Do not say "hoodie" unless a hood is clearly visible. The photo may be rotated or the garment may be folded.
Category guide: tshirts = short sleeve tops; longsleeves = thin long sleeve tees and shirts; hoodies = hoodies, sweatshirts (also thick collared rugby/polo sweatshirts) AND knit sweaters/jumpers; jackets = jackets/coats; trousers = trousers/jeans/shorts; footwear = shoes; accessories = caps, bags, belts, etc.`
  // Imagen como data URL dentro del mensaje (formato de chat con imagen)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const dataUrl = `data:image/jpeg;base64,${btoa(bin)}`
  const out = (await env.AI.run(VISION, {
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
    max_tokens: 200,
  } as never)) as { response?: string | object }
  if (typeof out.response === 'object' && out.response) out.response = JSON.stringify(out.response)
  const text = (out.response as string | undefined) ?? ''
  if (!text) throw new Error('vision: respuesta vacía ' + JSON.stringify(out).slice(0, 200))
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { category?: string; description?: string; colors?: unknown; neckline?: unknown }
    // Giro horario para dejar el cuello arriba (los modelos de visión aciertan mejor "dónde está" que "cuántos grados")
    const side = String(parsed.neckline ?? 'top').toLowerCase()
    const rotation = (side.includes('left') ? 90 : side.includes('right') ? 270 : side.includes('bottom') ? 180 : 0) as Identity['rotation']
    const category = CATEGORIES.includes(parsed.category as Category) ? (parsed.category as Category) : null
    const colors = Array.isArray(parsed.colors) ? parsed.colors.filter((c): c is string => typeof c === 'string').slice(0, 4).map((c) => c.toLowerCase().slice(0, 24)) : []
    return { category, description: (parsed.description ?? '').slice(0, 160), colors, rotation }
  } catch {
    return { category: null, description: '', colors: [], rotation: 0 }
  }
}

/**
 * Fondo para la foto de producto: neutro (nada de colores chillones) y que contraste con la prenda,
 * para poder recortarlo después. Gris medio por defecto; blanco si la prenda es gris; negro si es gris y blanca.
 */
function pickKey(colors: string[], description: string): { hex: string; name: string } {
  const d = `${colors.join(' ')} ${description}`.toLowerCase()
  const grey = /\b(grey|gray|charcoal|silver|heather)\b/.test(d)
  const light = /\b(white|cream|ivory|off-white|light grey|light gray)\b/.test(d)
  if (!grey) return { hex: '#808080', name: 'neutral medium grey (#808080)' }
  if (!light) return { hex: '#ffffff', name: 'pure white (#FFFFFF)' }
  return { hex: '#111111', name: 'deep black (#111111)' }
}

/** 2. Foto de producto: la prenda estirada, de frente, sobre un fondo de croma liso. */
// Instrucciones para la foto de producto, de más completas a más simples. Si el filtro de seguridad del
// modelo marca la imagen por error (pasa con algunas fotos de habitaciones), se prueba la siguiente.
function prompts(what: string, keyName: string): string[] {
  // Ganadores de las pruebas con fotos reales: instrucciones de EDICIÓN ("convierte esta foto…"),
  // prohibiendo copiar texturas del entorno e inventar logos o capuchas.
  return [
    `Turn this photo into a professional e-commerce product photo of the ${what}. Keep only that one garment and remove everything else: bed, sheets, blankets, bags, shoes, floor. ` +
      `Lay it perfectly flat and unfolded, upright, front view, symmetrical, centered, whole garment visible. Keep its exact shape, colours, collar and stripes. ` +
      `Do not add logos, text, hoods or pockets. Do not copy patterns or textures from the surroundings onto the garment. Background: plain solid ${keyName}, evenly lit.`,
    `The ${what} from the reference photo, isolated, upright, flat lay, front view, centered, on a plain ${keyName}. Exactly the same garment, nothing added.`,
    `${what}, front view, flat lay, centered, plain ${keyName} background`,
  ]
}

const isFlagged = (e: unknown) => /3030|flagged/i.test(String((e as Error)?.message ?? e))

async function productShot(env: Env, image: Blob, description: string, key: { name: string }, debug?: { prompt?: string; model?: string }): Promise<{ image: string; attempt: number }> {
  const what = description || 'the main garment'
  // Modo de pruebas (solo con contraseña): instrucciones y modelo a medida, sin redesplegar
  const list = debug?.prompt ? [debug.prompt.replaceAll('{what}', what).replaceAll('{bg}', key.name)] : prompts(what, key.name)
  const model = debug?.model === '9b' ? '@cf/black-forest-labs/flux-2-klein-9b' : IMAGE
  let last: unknown
  for (let i = 0; i < list.length; i++) {
    const form = new FormData()
    form.append('prompt', list[i])
    form.append('input_image_0', image)
    form.append('width', '1024')
    form.append('height', '1024')
    // Workers AI recibe el multipart como stream + content-type
    const req = new Request('http://internal/', { method: 'POST', body: form })
    try {
      const out = (await env.AI.run(model as typeof IMAGE, { multipart: { body: req.body, contentType: req.headers.get('content-type')! } } as never)) as { image?: string }
      if (!out.image) throw new Error('El modelo de imagen no devolvió nada')
      return { image: out.image, attempt: i + 1 }
    } catch (e) {
      last = e
      if (!isFlagged(e)) throw e // otros errores (cuota, caída): no tiene sentido reintentar
    }
  }
  throw last
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req, env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
    const url = new URL(req.url)

    // Desde la web de Atelier no hace falta contraseña; desde cualquier otro sitio, sí
    const origin = req.headers.get('Origin') ?? ''
    const fromApp = h['Access-Control-Allow-Origin'] === origin && origin !== ''
    const keyOk = !!env.ACCESS_KEY && req.headers.get('X-Atelier-Key') === env.ACCESS_KEY
    if (env.ACCESS_KEY && !fromApp && !keyOk && url.pathname !== '/health') {
      return json({ error: 'unauthorized' }, 401, h)
    }
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/ping')) {
      return json({ ok: true, auth: url.pathname === '/ping' }, 200, h)
    }
    if (req.method !== 'POST' || (url.pathname !== '/garment' && url.pathname !== '/identify')) return json({ error: 'not found' }, 404, h)

    const form = await req.formData()
    const image = form.get('image')
    if (!(image instanceof File) || image.size > 6_000_000) return json({ error: 'bad image' }, 400, h)
    const hint = (form.get('hint') as string | null) ?? undefined
    try {
      const bytes = new Uint8Array(await image.arrayBuffer())
      let visionError: string | undefined
      const fallbackId: Identity = { category: null, description: '', colors: [], rotation: 0 }
      // /identify: solo visión (rápido). La app gira la foto si hace falta y luego llama a /garment.
      if (url.pathname === '/identify') {
        const id = await identify(env, bytes, hint).catch((e) => { visionError = String((e as Error)?.message ?? e).slice(0, 300); return fallbackId })
        return json({ ...id, visionError }, 200, h)
      }
      // /garment: si la app ya trae la identidad (de /identify), no se repite la visión
      const known = form.get('description') as string | null
      const id: Identity = known
        ? { category: (CATEGORIES as readonly string[]).includes(String(form.get('category'))) ? (form.get('category') as Category) : null, description: known.slice(0, 160), colors: String(form.get('colors') ?? '').split(',').filter(Boolean).slice(0, 4), rotation: 0 }
        : await identify(env, bytes, hint).catch((e) => { visionError = String((e as Error)?.message ?? e).slice(0, 300); return fallbackId })
      const key = pickKey(id.colors, id.description)
      const debug = keyOk ? { prompt: (form.get('prompt') as string | null) ?? undefined, model: (form.get('model') as string | null) ?? undefined } : undefined
      const shot = await productShot(env, image, id.description, key, debug)
      return json({ image: shot.image, attempt: shot.attempt, key: key.hex, category: id.category, description: id.description, colors: id.colors, visionError }, 200, h)
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      // Cuota diaria gratis agotada → el móvil usa el recorte local
      const quota = /neuron|quota|limit|429|capacity/i.test(msg)
      return json({ error: quota ? 'quota' : 'failed', detail: msg.slice(0, 300) }, quota ? 429 : 502, h)
    }
  },
} satisfies ExportedHandler<Env>
