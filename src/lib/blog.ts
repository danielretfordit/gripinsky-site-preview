import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'blog'>;

/** Статья, перенесённая с Tilda, живёт по старому адресу (/tpost/…), новые статьи по /blog/<id> */
export const isLegacyPost = (p: Post) => Boolean(p.data.legacyPath);
export const postHref = (p: Post) => p.data.legacyPath || `/blog/${p.id}`;
