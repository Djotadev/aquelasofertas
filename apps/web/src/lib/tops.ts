import tech from '@/data/top-tecnologia.json';
import fitness from '@/data/top-fitness.json';
import casa from '@/data/top-casa.json';
export type TopItem = { slug: string; name: string; badge: string; summary: string; pros: string[]; cons: string[]; query: string; examples?: string[] };
export type TopCategory = { id: string; label: string; intro: string; items: TopItem[] };
export const techCategories = tech.categories as TopCategory[];
export const techUpdated = tech.updated;
export const fitnessCategories = fitness.categories as TopCategory[];
export const fitnessUpdated = fitness.updated;
export const casaCategories = casa.categories as TopCategory[];
export const casaUpdated = casa.updated;
export const allTopItems: TopItem[] = [...techCategories, ...fitnessCategories, ...casaCategories].flatMap(c => c.items);
export const topCategoryById = (id?: string) => [...techCategories, ...fitnessCategories, ...casaCategories].find(c => c.id === id);
export const topItemBySlug = (slug?: string) => allTopItems.find(i => i.slug === slug);
/** Link de busca no Mercado Livre (sem afiliado) usado enquanto o produto não tem link próprio. */
export const searchUrl = (query: string) => `https://lista.mercadolivre.com.br/${query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
