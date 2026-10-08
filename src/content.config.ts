import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

/** Настройки сайта: контакты, цифры, рассрочка, реквизиты */
const settings = defineCollection({
  // Один объект настроек (так его пишет Keystatic), в коллекции он доступен как запись «site»
  loader: file('src/content/settings.json', { parser: (text) => ({ site: JSON.parse(text) }) }),
  schema: z.object({
    brand: z.string(),
    telegramBot: z.url(),
    telegramChannel: z.url().nullish(),
    youtube: z.url().nullish(),
    vk: z.url().nullish(),
    vkVideo: z.url().nullish(),
    yandexMaps: z.url(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    stats: z.object({
      graduates: z.string(),
      years: z.string(),
      videos: z.string(),
      rating: z.string(),
      ratingCount: z.string().nullish(),
      subscribers: z.string(),
    }),
    installment: z.object({
      months: z.number().int().positive(),
      note: z.string(),
    }),
    accessMonths: z.number().int().positive(),
    /** Свой набор курсов: ступени скидки за количество (от min курсов скидка pct %) */
    bundle: z.object({
      tiers: z.array(z.object({ min: z.number().int().min(2), pct: z.number().min(0).max(50) })).min(1),
    }).default({ tiers: [{ min: 2, pct: 15 }, { min: 3, pct: 20 }, { min: 4, pct: 22 }] }),
    requisites: z.string(),
    certificateNote: z.string(),
    publish: z.object({
      /** true: показывать только людей с согласием на публикацию (consent: yes) */
      requireConsent: z.boolean(),
    }),
  }),
});

/** Люди: ученики, выпускники, педагоги */
const people = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/people' }),
  schema: ({ image }) => z.object({
    name: z.string(),
    roles: z.array(z.enum(['student', 'graduate', 'teacher', 'author'])).min(1),
    photo: image().nullish(),
    bio: z.string().nullish(),
    teaches: z.array(z.string()).default([]),
    consent: z.enum(['yes', 'pending', 'no']).default('pending'),
  }),
});

const WORK_CATEGORIES = ['int', 'ext', 'model', 'mentor', 'teach'] as const;

/** Работы учеников и педагогов (галерея и иллюстрации на страницах) */
const works = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/works' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    author: reference('people'),
    image: image(),
    beforeImage: image().nullish(),
    reviewText: z.string().optional(),
    reviewQuote: z.string().optional(),
    processImages: z.array(image()).default([]),
    videos: z.array(z.string()).default([]),
    alt: z.string(),
    categories: z.array(z.enum(WORK_CATEGORIES)).min(1),
    awards: z.array(z.enum(['render-dnya', 'tsar-gory', '3ddd-award'])).default([]),
    sourceUrl: z.url().nullish(),
    focus: z.string().nullish(),
    inGallery: z.boolean().default(true),
    isProcessImage: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

/** Истории выпускников: «было / стало» */
const stories = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/stories' }),
  schema: z.object({
    person: reference('people'),
    headline: z.string(),
    tag: z.string(),
    subtitle: z.string(),
    before: z.string(),
    after: z.string(),
    quote: z.string(),
    highlights: z.array(z.string()).default([]),
    courses: z.string().nullish(),
    works: z.array(reference('works')).default([]),
    extraWorks: z.array(reference('works')).default([]),
    extraNote: z.string().nullish(),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    size: z.enum(['large', 'medium', 'small']).default('small'),
    order: z.number().default(100),
  }),
});

/** Награды: «Царь горы», голосования */
const awards = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/awards' }),
  schema: z.object({
    person: reference('people'),
    title: z.string(),
    text: z.string(),
    kind: z.enum(['student', 'teacher-vote']),
    place: z.number().int().nullish(),
    work: reference('works').nullish(),
    date: z.string().nullish(),
    order: z.number().default(100),
  }),
});

/** Отзывы (без контактов учеников) */
const reviews = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/reviews' }),
  schema: z.object({
    author: z.string(),
    person: reference('people').optional(),
    works: z.array(reference('works')).default([]),
    role: z.string(),
    source: z.enum(['telegram', 'yandex', 'vk', 'site', 'azbuka']),
    sourceUrl: z.url().optional(),
    text: z.string(),
    quote: z.string().optional(),
    topic: z.enum(['money', 'skill', 'career', 'general']).default('general'),
    order: z.number().default(100),
  }),
});

/** Вопросы и ответы */
const faq = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    group: z.enum(['money', 'start', 'study', 'after']),
    pages: z.array(z.string()).default(['viz']),
    order: z.number().default(100),
  }),
});

const COURSE_TYPES = ['course', 'package', 'plugin', 'service', 'free'] as const;

/** Курсы и пакеты (импорт из Tilda + ручные поля) */
const courses = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/courses' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    short: z.string().default(''),
    legacyPath: z.string().startsWith('/'),
    /** Если курс продаётся на другой странице (например, база на странице направления): туда ведут ссылки, своя страница не создаётся */
    landing: z.string().nullish(),
    status: z.enum(['active', 'hidden', 'archive']).default('active'),
    type: z.enum(COURSE_TYPES),
    /** Текущая цена в рублях; 0 у бесплатных */
    price: z.number().int().nonnegative(),
    /** Цена без поддержки (цена price включает чат поддержки). Пусто: на треть дешевле, до …900 ₽ */
    selfPrice: z.number().int().positive().nullish(),
    /** Только реальная прежняя цена. Придуманные «старые» цены не указываем */
    oldPrice: z.number().int().positive().nullable().default(null),
    professions: z.array(z.string()).default([]),
    software: z.array(z.string()).default([]),
    level: z.string().nullable().default(null),
    cover: image().nullish(),
    isNew: z.boolean().default(false),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).nullish(),
    popularityRank: z.number().int().positive().nullish(),
    lessons: z.number().int().nullish(),
    meta: z.string().nullish(),
    description: z.string().nullish(),
    forWhom: z.array(z.string()).default([]),
    outcomes: z.array(z.string()).default([]),
    blocks: z.array(z.string()).default([]),
    finalProject: z.string().nullish(),
    benefits: z.array(z.object({ title: z.string().min(1), text: z.string() })).default([]),
    prerequisites: z.array(z.string()).default([]),
    modules: z.array(z.object({ title: z.string().min(1), description: z.string().default(''), tools: z.array(z.string()).default([]), topics: z.array(z.string()).default([]), practice: z.string().default(''), result: z.string().default('') })).default([]),
    projects: z.array(z.object({ title: z.string().min(1), description: z.string(), deliverable: z.string().default(''), image: image().nullish() })).default([]),
    learning: z.array(z.object({ title: z.string().min(1), text: z.string() })).default([]),
    included: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    courseFaq: z.array(z.object({ question: z.string().min(1), answer: z.string() })).default([]),
    trialDescription: z.string().default(''),
    studentWorks: z.array(reference('works')).default([]),
    testimonials: z.array(z.object({ author: z.string(), text: z.string(), context: z.string().default(''), consent: z.boolean().default(false) })).default([]),

    includes: z.array(reference('courses')).default([]),
    /** Подарки к курсу, которых нет в каталоге (value: реальная цена или null) */
    gifts: z.array(z.object({ id: z.string(), name: z.string(), value: z.number().int().positive().nullable() })).default([]),
    related: z.array(reference('courses')).default([]),
    teachers: z.array(reference('people')).default([]),
    trial: z.string().nullish(),
    seo: z.object({ title: z.string().default(''), description: z.string().default('') }).default({ title: '', description: '' }),
    getcourse: z.object({ offerCode: z.string().default('') }).default({ offerCode: '' }),
    tildaUid: z.string().nullish(),
  }),
});

/** Тарифы (формат обучения) */
const tariffs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tariffs' }),
  schema: z.object({
    name: z.string(),
    sub: z.string(),
    short: z.string(),
    /** Доплата к базе за формат, ₽ */
    extra: z.number().int().nonnegative(),
    features: z.array(z.object({ ok: z.boolean(), text: z.string() })),
    badge: z.string().nullish(),
    order: z.number(),
    getcourse: z.object({ offerCode: z.string().default('') }).default({ offerCode: '' }),
  }),
});

/** Профессии направления «3D-визуализация» */
const professions = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/professions' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    short: z.string(),
    lead: z.string(),
    income: z.string().nullish(),
    image: image(),
    imageAlt: z.string(),
    imageFit: z.enum(['cover', 'contain']).default('cover'),
    imagePos: z.string().default('50% 50%'),
    path: z.string().startsWith('/'),
    courses: z.array(z.object({
      course: reference('courses'),
      /** включён в пакет по умолчанию */
      default: z.boolean(),
      meta: z.string(),
      description: z.string(),
      final: z.string(),
      blocks: z.array(z.string()),
    })).min(1),
    gift: z.object({ course: reference('courses'), text: z.string() }),
    addons: z.array(z.object({ course: reference('courses'), text: z.string() })),
    portfolio: z.string(),
    seo: z.object({ title: z.string(), description: z.string(), h1: z.string() }),
    order: z.number(),
  }),
});

/** Блог */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    cover: image().nullish(),
    coverAlt: z.string().nullish(),
    related: z.array(reference('courses')).default([]),
    /** Адрес статьи на Tilda (/tpost/…): перенесённая статья собирается по нему */
    legacyPath: z.string().nullish(),
    draft: z.boolean().default(false),
  }),
});

/** Юридические и служебные тексты */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    path: z.string().startsWith('/'),
    updated: z.string().nullish(),
  }),
});

const pageSeo = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/page-seo' }),
  schema: z.object({
    title: z.string().trim().min(1),
    route: z.string().trim().regex(/^\/(?!\/)[^?#]*$/).refine((route) => route === '/' || !route.endsWith('/'), 'Укажите путь без слеша в конце'),
    description: z.string().trim().min(1),
    canonical: z.union([z.literal(''), z.url()]).default(''),
    noindex: z.boolean().default(false),
    ogImage: z.union([z.literal(''), z.url(), z.string().startsWith('/')]).default(''),
  }),
});

const gameProfessions = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/game-professions' }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    lead: z.string(),
    courses: z.array(reference('courses')).min(1),
    trials: z.array(reference('courses')),
    addons: z.array(z.object({ course: reference('courses'), text: z.string(), alternative: reference('courses').nullish() })),
    order: z.number(),
  }),
});

export const collections = { settings, people, works, stories, awards, reviews, faq, courses, tariffs, professions, gameProfessions, blog, legal, pageSeo };
