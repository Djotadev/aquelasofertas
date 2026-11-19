import { all } from './db.server';
import { products as jsonProducts, type Product } from './products';

export type WatchItem = Product & { itemId: string; category: string | null };
const slugCategory = (slug: string) => /^(nb|cel|tab|sw)-/.test(slug) ? 'eletronicos' : /^(tn|ra|rc|su)-/.test(slug) ? 'fitness' : 'casa';
const MLB = /MLB-?(\d{3,})/i;
/** Extrai o código MLB de um link de anúncio ou de um código digitado. */
export const parseItemId = (input: unknown): string | null => { const m = MLB.exec(String(input || '')); return m ? `MLB${m[1]}` : null; };
const allowedHost = /(^|\.)(mercadolivre\.com\.br|mercadolivre\.com|mercadolibre\.com|meli\.la)$/;
export const isMlUrl = (value: string): boolean => { try { const u = new URL(value); return u.protocol === 'https:' && allowedHost.test(u.hostname); } catch { return false; } };

/** Produtos cadastrados no painel (ativos), no mesmo formato do produtos.json. */
export const dbProducts = (): Product[] => all('SELECT * FROM ml_products WHERE active = 1 ORDER BY id').map(r => ({ slug: r.slug || `ml-${String(r.item_id).toLowerCase()}`, itemId: r.item_id, affiliateUrl: r.affiliate_url, title: r.title, image: r.image || undefined }));
/** Procura por slug: o painel tem prioridade sobre o produtos.json. */
export const findProduct = (slug?: string): Product | undefined => dbProducts().find(p => p.slug === slug) ?? jsonProducts.find(p => p.slug === slug);
/** Tudo que o monitor de preço deve acompanhar. */
export function watchList(): WatchItem[] {
	const rows = all('SELECT * FROM ml_products WHERE active = 1').map(r => ({ slug: r.slug || `ml-${String(r.item_id).toLowerCase()}`, itemId: r.item_id as string, affiliateUrl: r.affiliate_url as string, title: r.title as string, image: r.image || undefined, category: r.category as string }));
	const seen = new Set(rows.map(r => r.itemId));
	return [...rows, ...jsonProducts.filter(p => p.itemId && !seen.has(p.itemId)).map(p => ({ ...p, itemId: p.itemId!, category: slugCategory(p.slug) }))];
}
