// Iconos de línea fina dibujados a mano (24×24, trazo 1.5). Sin librería.
const paths: Record<string, string> = {
  hanger: 'M12 6.5a1.9 1.9 0 1 1 1.9-1.9c0 1-.9 1.4-1.9 2.2v1.4M12 8.2 3.2 14.6c-.8.6-.4 1.9.6 1.9h16.4c1 0 1.4-1.3.6-1.9L12 8.2',
  outfit: 'M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z',
  plus: 'M12 5v14M5 12h14',
  calendar: 'M4 6.5h16v13H4zM4 10.5h16M8.5 4v4M15.5 4v4',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  camera: 'M4 8h3.2l1.6-2.5h6.4L16.8 8H20v11H4zM12 16.5a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6',
  washer: 'M5 3.5h14v17H5zM5 7.5h14M8 5.5h.01M11 5.5h.01M12 18a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10',
  auto: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16M12 4v16',
  tshirt: 'M8.5 4 4 6.5l1.8 3.8 2.2-1V20h8V9.3l2.2 1L20 6.5 15.5 4c-.4 1.5-1.8 2.5-3.5 2.5S8.9 5.5 8.5 4',
  longsleeve: 'M8.5 4 5 6l-2 12h2.6L8 10v10h8V10l2.4 8H21L19 6l-3.5-2c-.4 1.5-1.8 2.5-3.5 2.5S8.9 5.5 8.5 4',
  hoodie: 'M9 4.5C9 3 10.3 2.5 12 2.5s3 .5 3 2l3.5 2L21 18h-2.6L16 10.5V20H8v-9.5L5.6 18H3L5.5 6.5zM9 4.5c.3 2 1.4 3.2 3 3.2s2.7-1.2 3-3.2M10 16h4',
  jacket: 'M8.5 4 5 6 3 18h2.6L8 10v10h3.5V7L8.5 4M15.5 4 19 6l2 12h-2.6L16 10v10h-3.5V7zM12 7v13',
  trousers: 'M7 3.5h10l1.5 17h-4L12 9.5l-2.5 11h-4zM7 6.5h10',
  shoe: 'M3 16.5V10l4 .5 2.5 2.5 4 1 6 1.2c1 .2 1.5 1 1.5 1.8V18H3zM3 18h18M10.5 13.5l1-1.2M13 14.2l1-1.2',
  cap: 'M4 15.5c0-4.6 3.6-8 8-8s8 3.4 8 8M4 15.5h13.5c1.6 0 3 .4 3.5 1.5M12 7.5V6',
  gallery: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5h.01',
  paste: 'M8 4.5H6v16h12v-16h-2M9 3h6v3H9zM9 11h6M9 15h4',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5',
  archive: 'M3.5 4.5h17v4h-17zM5 8.5v11h14v-11M10 12.5h4',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4.5H15',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  minus: 'M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  scan: 'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M8 12h8',
  sparkle: 'M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6L12 16.5l-1.6-4.9-4.9-1.6 4.9-1.6zM18.5 15.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17M12 11v5M12 7.8h.01',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17M12 7.5V12l3 2',
  tag: 'M3.5 12.5V4.5h8l9 9-8 8zM8 8.5h.01',
  palette: 'M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.6-1-2.7 0-1 .8-1.8 1.8-1.8h2.2a4 4 0 0 0 4-4c0-3.8-3.8-7-8.5-7M7.5 12h.01M9.5 8h.01M14.5 8h.01',
  ruler: 'M3 16.5 16.5 3 21 7.5 7.5 21zM7 12.5l1.5 1.5M9.5 10l2 2M12 7.5l1.5 1.5',
}

export type IconName = keyof typeof paths

export function Icon({ name, size = 24, className = '', strokeWidth = 1.5 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
