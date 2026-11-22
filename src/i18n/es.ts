export const es = {
  app: { name: 'Atelier', tagline: 'Tu armario, en el bolsillo.' },
  nav: { wardrobe: 'Armario', outfits: 'Outfits', add: 'Añadir', week: 'Semana', settings: 'Ajustes' },
  categories: {
    tshirts: 'Camisetas', longsleeves: 'Manga larga', hoodies: 'Sudaderas', jackets: 'Chaquetas',
    trousers: 'Pantalones', footwear: 'Calzado', accessories: 'Accesorios',
  },
  status: { clean: 'Limpia', worn: 'Usada', dirty: 'Sucia' },
  wardrobe: {
    title: 'Armario', count: '{n} prendas',
    emptyTitle: 'Armario vacío',
    emptyBody: 'Haz una foto a una prenda. El fondo se quita solo y en menos de diez segundos está guardada.',
    emptyCta: 'Añadir la primera',
  },
  outfits: { title: 'Outfits', soon: 'Aquí montarás outfits como collage. Llega en la fase 3.' },
  week: { title: 'Semana', soon: 'Planifica qué te pones cada día. Llega en la fase 4.' },
  add: { title: 'Nueva prenda', soon: 'Cámara, recorte automático y color. Llega en la fase 1.' },
  settings: {
    title: 'Ajustes', appearance: 'Apariencia', theme: 'Tema', language: 'Idioma',
    themes: { system: 'Sistema', light: 'Claro', dark: 'Oscuro' },
    storage: 'Almacenamiento', persisted: 'Persistente: iOS no borrará tus datos',
    notPersisted: 'No persistente: instala la app en la pantalla de inicio',
    requestPersist: 'Pedir almacenamiento persistente', used: '{used} usados',
    about: 'Acerca de', version: 'Versión', designKit: 'Sistema de diseño', license: 'Código abierto · AGPL-3.0',
  },
  update: { ready: 'Hay una versión nueva', reload: 'Actualizar', offline: 'Lista para usar sin conexión' },
  kit: { title: 'Sistema de diseño' },
  common: { back: 'Volver', close: 'Cerrar', soonTag: 'En obras' },
}

// Misma forma en todos los idiomas; TypeScript avisa si falta una clave.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Dict = Widen<typeof es>
