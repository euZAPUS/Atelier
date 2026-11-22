import type { Dict } from './es'

export const en: Dict = {
  app: { name: 'Atelier', tagline: 'Your wardrobe, in your pocket.' },
  nav: { wardrobe: 'Wardrobe', outfits: 'Outfits', add: 'Add', week: 'Week', settings: 'Settings' },
  categories: {
    tshirts: 'T-shirts', longsleeves: 'Long sleeves', hoodies: 'Hoodies', jackets: 'Jackets',
    trousers: 'Trousers', footwear: 'Footwear', accessories: 'Accessories',
  },
  status: { clean: 'Clean', worn: 'Worn', dirty: 'Dirty' },
  wardrobe: {
    title: 'Wardrobe', count: '{n} items',
    emptyTitle: 'Empty wardrobe',
    emptyBody: 'Snap a photo of a garment. The background is removed automatically and it is saved in under ten seconds.',
    emptyCta: 'Add the first one',
  },
  outfits: { title: 'Outfits', soon: 'Build outfits as a collage here. Coming in phase 3.' },
  week: { title: 'Week', soon: 'Plan what to wear each day. Coming in phase 4.' },
  add: { title: 'New garment', soon: 'Camera, automatic cutout and colour. Coming in phase 1.' },
  settings: {
    title: 'Settings', appearance: 'Appearance', theme: 'Theme', language: 'Language',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    storage: 'Storage', persisted: 'Persistent: iOS will not evict your data',
    notPersisted: 'Not persistent: add the app to your Home Screen',
    requestPersist: 'Request persistent storage', used: '{used} used',
    about: 'About', version: 'Version', designKit: 'Design system', license: 'Open source · AGPL-3.0',
  },
  update: { ready: 'A new version is available', reload: 'Update', offline: 'Ready to work offline' },
  kit: { title: 'Design system' },
  common: { back: 'Back', close: 'Close', soonTag: 'Under construction' },
}
