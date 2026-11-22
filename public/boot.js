// Aplica el tema guardado antes de pintar (evita el destello claro/oscuro).
// Va en un fichero aparte (no inline) para que la CSP no necesite 'unsafe-inline'.
try {
  var b = JSON.parse(localStorage.getItem('atelier:boot') || '{}')
  if (b.theme === 'light' || b.theme === 'dark') document.documentElement.setAttribute('data-theme', b.theme)
} catch (e) {}
