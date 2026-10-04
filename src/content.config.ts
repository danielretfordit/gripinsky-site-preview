import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

/** Настройки сайта: контакты, цифры, рассрочка, реквизиты */
const settings = defineCollection({
  loader: file('src/content/settings.json'),
  schema: z.object({
    brand: z.string(),
    telegramBot: z.url(),
    telegramChannel: z.url().optional(),
    youtube: z.url().optional(),
    vk: z.url().optional(),
    vkVideo: z.url().optional(),
    yandexMaps: z.url(),
    email: z.string().optional(),
    phone: z.string().optional(),
    stats: z.object({
      graduates: z.string(),
      years: z.string(),
      videos: z.string(),
      rating: z.string(),
      ratingCount: z.string().optional(),
      subscribers: z.string(),
    }),
    installment: z.object({
      months: z.number().int().positive(),
      note: z.string(),
    }),
    accessMonths: z.number().int().positive(),
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
    photo: image().optional(),
    bio: z.string().optional(),
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
    beforeImage: image().optional(),
    alt: z.string(),
    categories: z.array(z.enum(WORK_CATEGORIES)).min(1),
    awards: z.array(z.enum(['render-dnya', 'tsar-gory', '3ddd-award'])).default([]),
    sourceUrl: z.url().optional(),
    focus: z.string().optional(),
    inGallery: z.boolean().default(true),
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
    courses: z.string().optional(),
    works: z.array(reference('works')).default([]),
    extraWorks: z.array(reference('works')).default([]),
    extraNote: z.string().optional(),
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
    place: z.number().int().optional(),
    work: reference('works').optional(),
    date: z.string().optional(),
    order: z.number().default(100),
  }),
});

/** Отзывы (без контактов учеников) */
const reviews = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/reviews' }),
  schema: z.object({
    author: z.string(),
    role: z.string(),
    source: z.enum(['telegram', 'yandex', 'vk', 'site']),
    text: z.string(),
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
    status: z.enum(['active', 'hidden', 'archive']).default('active'),
    type: z.enum(COURSE_TYPES),
    /** Текущая цена в рублях; 0 у бесплатных */
    price: z.number().int().nonnegative(),
    /** Только реальная прежняя цена. Придуманные «старые» цены не указываем */
    oldPrice: z.number().int().positive().nullable().default(null),
    professions: z.array(z.string()).default([]),
    software: z.array(z.string()).default([]),
    level: z.string().nullable().default(null),
    cover: image().optional(),
    lessons: z.number().int().optional(),
    meta: z.string().optional(),
    description: z.string().optional(),
    forWhom: z.array(z.string()).default([]),
    outcomes: z.array(z.string()).default([]),
    blocks: z.array(z.string()).default([]),
    finalProject: z.string().optional(),
    includes: z.array(reference('courses')).default([]),
    related: z.array(reference('courses')).default([]),
    teachers: z.array(reference('people')).default([]),
    trial: z.string().optional(),
    seo: z.object({ title: z.string().default(''), description: z.string().default('') }).default({ title: '', description: '' }),
    getcourse: z.object({ offerCode: z.string().default('') }).default({ offerCode: '' }),
    tildaUid: z.string().optional(),
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
    badge: z.string().optional(),
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
    income: z.string().optional(),
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
    cover: image().optional(),
    coverAlt: z.string().optional(),
    related: z.array(reference('courses')).default([]),
    draft: z.boolean().default(false),
  }),
});

/** Юридические и служебные тексты */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    path: z.string().startsWith('/'),
    updated: z.string().optional(),
  }),
});

export const collections = { settings, people, works, stories, awards, reviews, faq, courses, tariffs, professions, blog, legal };
