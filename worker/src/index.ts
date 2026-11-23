/**
 * Atelier AI — convierte una foto de una prenda hecha de cualquier manera
 * (doblada, sobre la cama, con otras cosas alrededor) en una foto de producto limpia.
 *
 * POST /garment  (multipart: image=<jpeg>, hint?=<categoría>)
 *   1. Un modelo de visión identifica la prenda principal y su categoría.
 *   2. FLUX.2 [klein] genera esa prenda estirada, de frente y sobre fondo blanco.
 *   → { image: <base64 jpeg/png>, category, description }
 *
 * Todo corre en Workers AI (plan gratis: 10.000 neuronas/día ≈ 75 prendas). Sin claves de API.
 * No se guarda nada: la foto entra, sale la imagen generada y se olvida.
 */

export interface Env {
  AI: Ai
  ALLOWED_ORIGINS: string
  ACCESS_KEY?: string
}

const VISION = '@cf/meta/llama-4-scout-17b-16e-instruct'
const IMAGE = '@cf/black-forest-labs/flux-2-klein-4b'
const CATEGORIES = ['tshirts', 'longsleeves', 'hoodies', 'jackets', 'trousers', 'footwear', 'accessories'] as const
type Category = (typeof CATEGORIES)[number]

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
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
async function identify(env: Env, bytes: Uint8Array, hint?: string): Promise<{ category: Category | null; description: string }> {
  const prompt = `You are a fashion cataloguer. Look at the photo and find the MAIN garment (the biggest clothing item in focus${hint ? `, probably from the category "${hint}"` : ''}). Ignore beds, floors, hands, shoes in the background and any other objects.
Answer ONLY with JSON, no prose: {"category": one of ${JSON.stringify(CATEGORIES)}, "description": "<colour, material, type and visible details such as prints or logos, max 18 words>"}
Category guide: tshirts = short sleeve tops; longsleeves = long sleeve tees/shirts; hoodies = sweatshirts, hoodies AND knit sweaters/jumpers; jackets = jackets/coats; trousers = trousers/jeans/shorts; footwear = shoes; accessories = caps, bags, belts, etc.`
  // Imagen como data URL dentro del mensaje (formato de chat con imagen)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const dataUrl = `data:image/jpeg;base64,${btoa(bin)}`
  const out = (await env.AI.run(VISION, {
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
    max_tokens: 160,
  } as never)) as { response?: string | object }
  if (typeof out.response === 'object' && out.response) out.response = JSON.stringify(out.response)
  const text = (out.response as string | undefined) ?? ''
  if (!text) throw new Error('vision: respuesta vacía ' + JSON.stringify(out).slice(0, 200))
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { category?: string; description?: string }
    const category = CATEGORIES.includes(parsed.category as Category) ? (parsed.category as Category) : null
    return { category, description: (parsed.description ?? '').slice(0, 160) }
  } catch {
    return { category: null, description: '' }
  }
}

/** 2. Foto de producto: la prenda estirada, de frente, sobre blanco. */
async function productShot(env: Env, image: Blob, description: string): Promise<string> {
  const what = description || 'the main garment'
  const prompt = `E-commerce product photo of ${what}, exactly the same garment as in the reference image. ` +
    `Laid out flat and fully unfolded, front view, symmetrical, sleeves spread, the whole garment visible and centered, ` +
    `on a pure white seamless background, soft even studio light, no shadows on the background. ` +
    `Keep the exact colour, fabric texture, print, logos and details of the original. ` +
    `Only that single garment: no bed, no floor, no shoes, no hands, no people, no hanger, no other objects.`
  const form = new FormData()
  form.append('prompt', prompt)
  form.append('input_image_0', image)
  form.append('width', '1024')
  form.append('height', '1024')
  // Workers AI recibe el multipart como stream + content-type
  const req = new Request('http://internal/', { method: 'POST', body: form })
  const out = (await env.AI.run(IMAGE, { multipart: { body: req.body, contentType: req.headers.get('content-type')! } } as never)) as { image?: string }
  if (!out.image) throw new Error('El modelo de imagen no devolvió nada')
  return out.image
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req, env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
    const url = new URL(req.url)

    if (env.ACCESS_KEY && req.headers.get('X-Atelier-Key') !== env.ACCESS_KEY && url.pathname !== '/health') {
      return json({ error: 'unauthorized' }, 401, h)
    }
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/ping')) {
      return json({ ok: true, auth: url.pathname === '/ping' }, 200, h)
    }
    if (req.method !== 'POST' || url.pathname !== '/garment') return json({ error: 'not found' }, 404, h)

    const form = await req.formData()
    const image = form.get('image')
    if (!(image instanceof File) || image.size > 6_000_000) return json({ error: 'bad image' }, 400, h)
    const hint = (form.get('hint') as string | null) ?? undefined
    try {
      const bytes = new Uint8Array(await image.arrayBuffer())
      let visionError: string | undefined
      const id = await identify(env, bytes, hint).catch((e) => { visionError = String((e as Error)?.message ?? e).slice(0, 300); return { category: null, description: '' } })
      const shot = await productShot(env, image, id.description)
      return json({ image: shot, category: id.category, description: id.description, visionError }, 200, h)
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      // Cuota diaria gratis agotada → el móvil usa el recorte local
      const quota = /neuron|quota|limit|429|capacity/i.test(msg)
      return json({ error: quota ? 'quota' : 'failed', detail: msg.slice(0, 300) }, quota ? 429 : 502, h)
    }
  },
} satisfies ExportedHandler<Env>
