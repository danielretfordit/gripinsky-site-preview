// Четыре стилевых направления (палитра + шрифты + приёмы) на структуре «B Галерея + шаги и формула из C».
// Только для dev-прототипов /design/style-N.

export interface Swatch { name: string; hex: string; role: string }
export interface StyleDef {
  n: number;
  id: string;
  name: string;
  tagline: string;
  keepsLime: boolean;
  /** CSS-переменные корня прототипа */
  vars: Record<string, string>;
  palette: Swatch[];
  fonts: { display: string; body: string; label: string; displayNote: string; bodyNote: string; labelNote: string };
  devices: string[];
  forWhom: string;
  risks: string;
  hero: 'bleed' | 'frame';
}

const DISPLAY = { onest: "'Onest Variable', system-ui, sans-serif", playfair: "'Playfair Display Variable', Georgia, serif", geologica: "'Geologica Variable', system-ui, sans-serif", unbounded: "'Unbounded Variable', system-ui, sans-serif" };
const BODY = { onest: "'Onest Variable', system-ui, sans-serif", golos: "'Golos Text Variable', system-ui, sans-serif", inter: "'Inter Variable', system-ui, sans-serif", manrope: "'Manrope Variable', system-ui, sans-serif" };
const MONO = "'JetBrains Mono Variable', ui-monospace, monospace";

export const STYLES: StyleDef[] = [
  {
    n: 1,
    id: 'signal',
    name: 'Графит и сигнал',
    tagline: 'Фирменный лайм остаётся, но только как сигнал: одна точка внимания на экран.',
    keepsLime: true,
    vars: {
      '--bg': '#0E1112', '--surface': '#161A1B', '--ink': '#ECECE6', '--muted': '#8C9391', '--line': 'rgb(236 236 230 / 0.12)', '--line-strong': 'rgb(236 236 230 / 0.32)',
      '--accent': '#F8F61A', '--accent-ink': '#0E1112', '--h1-accent': '#8C9391', '--num': '#ECECE6',
      '--cta-bg': '#F8F61A', '--cta-ink': '#0E1112', '--sel-bg': 'rgb(236 236 230 / 0.05)', '--sel-line': '#ECECE6',
      '--f-display': DISPLAY.onest, '--f-body': BODY.onest, '--f-label': MONO,
      '--d-weight': '800', '--d-track': '-0.035em', '--h2-weight': '750', '--label-case': 'uppercase', '--label-size': '12px', '--label-track': '0.04em',
      '--r-card': '6px', '--r-img': '4px', '--r-btn': '6px',
    },
    palette: [
      { name: 'Графит', hex: '#0E1112', role: 'фон' },
      { name: 'Поверхность', hex: '#161A1B', role: 'карточки, поля' },
      { name: 'Мел', hex: '#ECECE6', role: 'текст, заголовки' },
      { name: 'Пепел', hex: '#8C9391', role: 'подписи, вторая строка H1' },
      { name: 'Лайм', hex: '#F8F61A', role: 'только кнопка и активный шаг' },
    ],
    fonts: { display: 'Onest', body: 'Onest', label: 'JetBrains Mono', displayNote: 'H1 800, H2 750 капсом', bodyNote: 'текст 400, 17 px', labelNote: 'подписи, цены, метаданные' },
    devices: ['Работа ученика на весь экран, поверх неё моноширинные «метаданные рендера»', 'Лайм только у главной кнопки, активного шага и линии под итогом', 'Вторая строка H1 серая вместо жёлтой', 'Тонкие линии вместо карточек, радиусы 4–6 px'],
    forWhom: 'Сохранить узнаваемость (тёмный фон и лайм) и сразу убрать «пестроту».',
    risks: 'Держится на дисциплине: стоит снова раскрасить заголовки и цифры лаймом, и вернётся прежнее.',
    hero: 'bleed',
  },
  {
    n: 2,
    id: 'wall',
    name: 'Белая стена',
    tagline: 'Сайт как галерея: светлый фон цвета бумаги, работы в паспарту, антиква в заголовках.',
    keepsLime: false,
    vars: {
      '--bg': '#F1EFEA', '--surface': '#E7E4DD', '--ink': '#0D2023', '--muted': '#5C6A69', '--line': 'rgb(13 32 35 / 0.14)', '--line-strong': 'rgb(13 32 35 / 0.4)',
      '--accent': '#1C6E68', '--accent-ink': '#F1EFEA', '--h1-accent': '#1C6E68', '--num': '#0D2023',
      '--cta-bg': '#0D2023', '--cta-ink': '#F1EFEA', '--sel-bg': 'rgb(28 110 104 / 0.08)', '--sel-line': '#0D2023',
      '--f-display': DISPLAY.playfair, '--f-body': BODY.golos, '--f-label': BODY.golos,
      '--d-weight': '500', '--d-track': '-0.02em', '--h2-weight': '600', '--label-case': 'uppercase', '--label-size': '12px', '--label-track': '0.12em',
      '--r-card': '2px', '--r-img': '0px', '--r-btn': '999px',
    },
    palette: [
      { name: 'Бумага', hex: '#F1EFEA', role: 'фон (оттенок Cloud Dancer)' },
      { name: 'Камень', hex: '#E7E4DD', role: 'поверхности' },
      { name: 'Глубокая бирюза', hex: '#0D2023', role: 'текст и кнопка (бывший фон бренда)' },
      { name: 'Бирюза 2026', hex: '#1C6E68', role: 'акцент, ссылки, выбор' },
      { name: 'Графитовый серый', hex: '#5C6A69', role: 'подписи' },
    ],
    fonts: { display: 'Playfair Display', body: 'Golos Text', label: 'Golos Text', displayNote: 'H1 500, H2 600 капсом', bodyNote: 'текст 400, 17 px', labelNote: 'подписи капсом с разрядкой' },
    devices: ['Работа в белом паспарту с подписью как в музее', 'Антиква в заголовках, гротеск в тексте', 'Бывший фон бренда #0D2023 становится цветом текста и кнопки', 'Никаких подложек: только поля и линии'],
    forWhom: 'Дизайнеры интерьеров и архитекторы, кому важен вкус. Сразу выделяет среди тёмных CG-школ.',
    risks: 'Самый большой отход от нынешнего бренда. Тёмные вечерние рендеры на светлом фоне выглядят спокойнее.',
    hero: 'frame',
  },
  {
    n: 3,
    id: 'brass',
    name: 'Бирюза и латунь',
    tagline: 'Фирменная бирюза остаётся (это цвет 2026 года по WGSN), лайм заменён тёплой латунью.',
    keepsLime: false,
    vars: {
      '--bg': '#0D2023', '--surface': '#12292D', '--ink': '#F1EFEA', '--muted': '#A3B4B3', '--line': 'rgb(241 239 234 / 0.12)', '--line-strong': 'rgb(241 239 234 / 0.34)',
      '--accent': '#D8B36A', '--accent-ink': '#0D2023', '--h1-accent': '#D8B36A', '--num': '#D8B36A',
      '--cta-bg': '#D8B36A', '--cta-ink': '#0D2023', '--sel-bg': 'rgb(146 186 190 / 0.12)', '--sel-line': '#F1EFEA',
      '--f-display': DISPLAY.geologica, '--f-body': BODY.inter, '--f-label': BODY.inter,
      '--d-weight': '700', '--d-track': '-0.03em', '--h2-weight': '700', '--label-case': 'uppercase', '--label-size': '12px', '--label-track': '0.1em',
      '--r-card': '20px', '--r-img': '20px', '--r-btn': '999px',
    },
    palette: [
      { name: 'Бирюза бренда', hex: '#0D2023', role: 'фон' },
      { name: 'Глубина', hex: '#12292D', role: 'поверхности' },
      { name: 'Молочный', hex: '#F1EFEA', role: 'текст (теплее, чем #E7E7E7)' },
      { name: 'Латунь', hex: '#D8B36A', role: 'кнопка, цифры, акцент заголовка' },
      { name: 'Sea', hex: '#92BABE', role: 'подписи, выбор' },
    ],
    fonts: { display: 'Geologica', body: 'Inter', label: 'Inter', displayNote: 'H1 и H2 700 капсом', bodyNote: 'текст 400, 17 px', labelNote: 'подписи капсом' },
    devices: ['Тот же тёмно-бирюзовый фон, но тёплый белый текст и латунь вместо лайма', 'Крупные латунные цифры цен и шагов', 'Мягкие скругления картинок 20 px', 'Sea только для подписей и выбранного состояния'],
    forWhom: 'Сохранить фон бренда и сделать сайт дороже и спокойнее без смены айдентики.',
    risks: 'Латунь легко превратить в «золото»: только один оттенок, без градиентов. Энергии меньше, чем с лаймом.',
    hero: 'bleed',
  },
  {
    n: 4,
    id: 'studio',
    name: 'Тёплая студия',
    tagline: 'Тёплый тёмный фон, широкий гротеск и терракота: мастерская, а не IT-курс.',
    keepsLime: false,
    vars: {
      '--bg': '#16130F', '--surface': '#211C17', '--ink': '#F2EADF', '--muted': '#B0A493', '--line': 'rgb(242 234 223 / 0.12)', '--line-strong': 'rgb(242 234 223 / 0.34)',
      '--accent': '#E8643A', '--accent-ink': '#16130F', '--h1-accent': '#E8643A', '--num': '#F2EADF',
      '--cta-bg': '#E8643A', '--cta-ink': '#16130F', '--sel-bg': 'rgb(232 100 58 / 0.08)', '--sel-line': '#F2EADF',
      '--f-display': DISPLAY.unbounded, '--f-body': BODY.manrope, '--f-label': BODY.manrope,
      '--d-weight': '600', '--d-track': '-0.02em', '--h2-weight': '600', '--label-case': 'uppercase', '--label-size': '12px', '--label-track': '0.08em',
      '--r-card': '16px', '--r-img': '12px', '--r-btn': '12px',
    },
    palette: [
      { name: 'Эспрессо', hex: '#16130F', role: 'фон' },
      { name: 'Орех', hex: '#211C17', role: 'поверхности' },
      { name: 'Слоновая кость', hex: '#F2EADF', role: 'текст' },
      { name: 'Терракота', hex: '#E8643A', role: 'кнопка, акцент заголовка' },
      { name: 'Песок', hex: '#B0A493', role: 'подписи' },
    ],
    fonts: { display: 'Unbounded', body: 'Manrope', label: 'Manrope', displayNote: 'H1 и H2 600 капсом, широкий', bodyNote: 'текст 400, 17 px', labelNote: 'подписи капсом' },
    devices: ['Широкий гротеск капсом в заголовках', 'Тёплая палитра «дерево, глина, бумага» подчёркивает интерьерные рендеры', 'Лёгкое зерно плёнки на фоне', 'Кнопки-плитки со скруглением 12 px'],
    forWhom: 'Сделать школу человечнее и отличить от холодных IT-школ; аудитория интерьеров и дизайнеров.',
    risks: 'Полная смена бренда. Широкий шрифт занимает много места на телефоне, Unbounded уже часто встречается в рунете.',
    hero: 'bleed',
  },
];
