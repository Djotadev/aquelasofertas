import { all, one, run, now, getText, getSetting } from './db.server';
import { searchShopee, shopeeConfigured, type ShopeeProduct } from './shopee.server';
import { getLiveItems } from './mercadolivre.server';
import { products } from './products';
import { categoryIds } from './categories';

export type Source = { id: number; name: string; type: 'shopee' | 'ml_watch'; category: string; config: Record<string, any>; enabled: number };
export type Filters = { min_discount: number; min_rating: number; min_sales: number };
export const loadFilters = (): Filters => ({ min_discount: getSetting('min_discount', 15), min_rating: getSetting('min_rating', 4.5), min_sales: getSetting('min_sales', 50) });
export const parseSource = (r: Record<string, any>): Source => ({ ...(r as any), config: (() => { try { return JSON.parse(r.config || '{}'); } catch { return {}; } })() });

/** Pontuação simples para decidir a ordem de publicação: desconto, popularidade e nota. */
export const scoreOf = (p: { discount: number; sales: number; rating: number }) => Math.round((p.discount + Math.log10(p.sales + 1) * 10 + p.rating * 5) * 10) / 10;
export const passes = (p: { discount: number; sales: number; rating: number }, f: Filters) => p.discount >= f.min_discount && p.rating >= f.min_rating && p.sales >= f.min_sales;
const fourteenDaysAgo = () => new Date(Date.now() - 14 * 86_400_000).toISOString();

function insertOffer(o: { title: string; price: number | null; old_price: number | null; store: string; category: string; url: string; image: string | null; external_id: string; score: number; source: string }): 'fila' | 'nova' | 'duplicada' {
	if (one('SELECT id FROM offers WHERE external_id = ? AND created_at > ?', o.external_id, fourteenDaysAgo())) return 'duplicada';
	const status = getText('auto_mode', 'revisar') === 'automatico' ? 'fila' : 'nova';
	run('INSERT INTO offers (title, price, old_price, store, category, url, image, external_id, score, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', o.title.slice(0, 140), o.price, o.old_price, o.store, o.category, o.url, o.image, o.external_id, o.score, status, o.source, now());
	return status;
}
const mlCategory = (slug: string) => /^(nb|cel|tab|sw)-/.test(slug) ? 'eletronicos' : /^(tn|ra|rc|su)-/.test(slug) ? 'fitness' : /^(af|ro|co|cf)-/.test(slug) ? 'casa' : 'casa';

type Preview = { title: string; price: number | null; discount: number; rating?: number; sales?: number; ok: boolean };

async function shopeeItems(src: Source) {
	const found = await searchShopee(String(src.config.keyword || ''), Number(src.config.limit) || 20, Number(src.config.sortType) || 2);
	return found;
}
const toOffer = (p: ShopeeProduct, src: Source) => ({ title: p.title, price: p.price || null, old_price: p.discount > 0 && p.price ? Math.round((p.price / (1 - p.discount / 100)) * 100) / 100 : null, store: 'Shopee', category: src.category, url: p.link, image: p.image, external_id: `shopee:${p.itemId}`, score: scoreOf(p), source: `shopee:${src.id}` });

/** Mostra o que a fonte encontraria, sem salvar nada. */
export async function testSource(src: Source): Promise<Preview[]> {
	const f = loadFilters();
	if (src.type === 'shopee') return (await shopeeItems(src)).slice(0, 8).map(p => ({ title: p.title, price: p.price, discount: p.discount, rating: p.rating, sales: p.sales, ok: passes(p, f) }));
	const watch = products.filter(p => p.itemId);
	if (!watch.length) throw new Error('Nenhum produto com itemId em produtos.json');
	const live = await getLiveItems(watch.map(p => p.itemId!), { fresh: true });
	return watch.slice(0, 8).map(p => { const l = live[p.itemId!]; return { title: l?.title || p.slug, price: l?.price ?? null, discount: 0, ok: !!l?.available }; });
}

async function runSource(src: Source): Promise<{ novas: number; fila: number }> {
	const f = loadFilters(); let novas = 0, fila = 0;
	const count = (r: string) => { if (r === 'fila') fila++; if (r === 'nova') novas++; };
	if (src.type === 'shopee') {
		if (!shopeeConfigured()) throw new Error('Configure SHOPEE_APP_ID e SHOPEE_APP_SECRET');
		if (!src.config.keyword) throw new Error('Fonte sem palavra-chave');
		for (const p of await shopeeItems(src)) if (passes(p, f)) count(insertOffer(toOffer(p, src)));
	} else {
		const watch = products.filter(p => p.itemId);
		if (!watch.length) throw new Error('Nenhum produto com itemId em produtos.json');
		const live = await getLiveItems(watch.map(p => p.itemId!), { fresh: true });
		for (const p of watch) {
			const l = live[p.itemId!];
			if (!l || !l.available || l.price == null) continue;
			const seen = one('SELECT last_price, min_price FROM price_watch WHERE item_id = ?', p.itemId);
			if (seen && seen.last_price > l.price) {
				const drop = (1 - l.price / seen.last_price) * 100;
				if (drop >= f.min_discount) count(insertOffer({ title: l.title || p.title || p.slug, price: l.price, old_price: seen.last_price, store: 'Mercado Livre', category: mlCategory(p.slug), url: p.affiliateUrl, image: l.image, external_id: `ml:${p.itemId}:${Math.round(l.price)}`, score: scoreOf({ discount: drop, sales: 100, rating: 5 }), source: `ml:${src.id}` }));
			}
			run('INSERT INTO price_watch (item_id, last_price, min_price, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(item_id) DO UPDATE SET last_price = excluded.last_price, min_price = MIN(min_price, excluded.min_price), updated_at = excluded.updated_at', p.itemId, l.price, l.price, now());
		}
	}
	return { novas, fila };
}

/** Roda todas as fontes ativas. Erros de uma fonte não impedem as outras. */
export async function collectAll(): Promise<{ novas: number; fila: number; erros: string[] }> {
	const total = { novas: 0, fila: 0, erros: [] as string[] };
	for (const row of all('SELECT * FROM sources WHERE enabled = 1 ORDER BY id')) {
		const src = parseSource(row);
		try {
			const r = await runSource(src);
			total.novas += r.novas; total.fila += r.fila;
			run('UPDATE sources SET last_run = ?, last_status = ?, last_count = ? WHERE id = ?', now(), 'ok', r.novas + r.fila, src.id);
		} catch (error) {
			const msg = String((error as Error).message).slice(0, 200);
			total.erros.push(`${src.name}: ${msg}`);
			run('UPDATE sources SET last_run = ?, last_status = ?, last_count = 0 WHERE id = ?', now(), `erro: ${msg}`, src.id);
		}
	}
	return total;
}
export const validCategory = (c: unknown) => typeof c === 'string' && categoryIds.includes(c);
