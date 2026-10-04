import type { CollectionEntry } from 'astro:content';

type Course = CollectionEntry<'courses'>['data'];

export interface Category { slug: string; name: string; h1: string; lead: string; match: (c: Course) => boolean }

const soft = (s: string) => (c: Course) => c.software.includes(s);
const prof = (...p: string[]) => (c: Course) => c.professions.some((x) => p.includes(x));

/** Страницы категорий старого каталога (/courses-page/<slug>). Профессии визуализации оформлены отдельно. */
export const CATEGORIES: Category[] = [
  { slug: '3ds-max', name: '3ds Max', h1: 'Курсы 3ds Max онлайн', lead: 'Моделирование и визуализация в 3ds Max: от первого запуска программы до коммерческих проектов.', match: soft('3DS MAX') },
  { slug: 'corona-renderer', name: 'Corona Renderer', h1: 'Курсы Corona Renderer', lead: 'Фотореалистичный рендер интерьеров, экстерьеров и предметов в Corona.', match: soft('CORONA RENDERER') },
  { slug: 'blender', name: 'Blender', h1: 'Курсы Blender онлайн', lead: 'Моделирование, визуализация и игровая графика в Blender.', match: soft('BLENDER') },
  { slug: 'unreal-engine', name: 'Unreal Engine', h1: 'Курсы Unreal Engine', lead: 'Окружение и визуализация в реальном времени на Unreal Engine.', match: soft('UNREAL ENGINE') },
  { slug: 'zbrush', name: 'ZBrush', h1: 'Курсы ZBrush', lead: 'Скульптинг персонажей, портретов и предметов в ZBrush.', match: soft('ZBRUSH') },
  { slug: 'photoshop', name: 'Photoshop', h1: 'Курсы Adobe Photoshop для 3D', lead: 'Постобработка рендера, коллажи и подача работ.', match: soft('ADOBE PHOTOSHOP') },
  { slug: 'modeling', name: 'Моделирование', h1: 'Курсы 3D-моделирования', lead: 'Полигональное, SDS и сложное моделирование для визуализации, игр и стоков.', match: prof('Моделирование') },
  { slug: 'residential-complexes', name: 'ЖК', h1: 'Курсы визуализации ЖК', lead: 'Масштабные сцены: жилые комплексы, посёлки и кварталы.', match: prof('ЖК') },
  { slug: 'sculpting', name: 'Скульпт', h1: 'Курсы 3D-скульптинга', lead: 'Цифровая скульптура персонажей и предметов.', match: prof('Скульпт') },
  { slug: 'animation', name: 'Анимация', h1: 'Курсы 3D-анимации', lead: 'Анимация в архвизе и игровой графике.', match: prof('Анимация') },
  { slug: 'characters', name: 'Персонажи', h1: 'Курсы 3D-персонажей', lead: 'Персонажи для игр и кино: от скульпта до текстур.', match: prof('Персонажи') },
  { slug: 'props', name: 'Props', h1: 'Курсы 3D-моделирования предметов для игр', lead: 'Игровые пропсы: моделирование, развёртка и текстурирование.', match: prof('Props', 'Props Artist') },
  { slug: 'environment', name: 'Environment', h1: 'Курсы 3D-окружения для игр', lead: 'Игровые локации и окружение.', match: prof('Environment', 'Environment Artist', 'Level Artist') },
  { slug: 'gamedev', name: 'GameDev', h1: 'Курсы 3D для игр', lead: 'Игровая 3D-графика: предметы, локации, персонажи и движки.', match: prof('GameDev') },
  { slug: '3ds-max-scripts', name: 'Скрипты 3ds Max', h1: 'Скрипты и плагины для 3ds Max', lead: 'Плагины и скрипты, которые ускоряют работу в 3ds Max.', match: (c) => c.type === 'plugin' },
];

export const TYPE_LABEL: Record<Course['type'], string> = { course: 'Курс', package: 'Пакет', plugin: 'Плагин', service: 'Услуга', free: 'Бесплатно' };

/** Куда ведёт карточка курса */
export const courseHref = (id: string, c: Course) => c.landing ?? (id === 'ai' ? '/ai' : c.legacyPath);

export const isListed = (c: Course) => c.status === 'active';
