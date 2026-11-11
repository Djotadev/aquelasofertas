/**
 * Integração com a API do Mercado Livre (somente servidor).
 * Consulta título, preço, imagem e disponibilidade dos anúncios cadastrados.
 * Precisa das variáveis ML_CLIENT_ID e ML_CLIENT_SECRET; sem elas, os cartões
 * usam os dados de reserva do produtos.json e não mostram preço.
 */
const API = process.env.ML_API_BASE || 'https://api.mercadolibre.com';
const TTL_OK = 15 * 60_000;
const TTL_FAIL = 2 * 60_000;

export type LiveItem = {
	id: string;
	title: string;
	price: number | null;
	originalPrice: number | null;
	image: string | null;
	available: boolean;
};

let token: { value: string; expires: number } | null = null;

async function getToken(): Promise<string | null> {
	const id = process.env.ML_CLIENT_ID;
	const secret = process.env.ML_CLIENT_SECRET;
	if (!id || !secret) return null;
	if (token && token.expires > Date.now() + 60_000) return token.value;
	const res = await fetch(`${API}/oauth/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
		body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
		signal: AbortSignal.timeout(6000),
	});
	if (!res.ok) {
		console.error('[mercadolivre] falha ao obter token:', res.status);
		return null;
	}
	const json = (await res.json()) as { access_token: string; expires_in: number };
	token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
	return token.value;
}

const cache = new Map<string, { at: number; ttl: number; item: LiveItem | null }>();

type RawItem = {
	id: string; title?: string; price?: number; original_price?: number | null; status?: string;
	condition?: string; item_condition?: string; thumbnail?: string; secure_thumbnail?: string;
};

function toLiveItem(raw: RawItem): LiveItem {
	const condition = raw.item_condition ?? raw.condition;
	const thumb = (raw.secure_thumbnail || raw.thumbnail || '').replace(/^http:/, 'https:').replace('-I.jpg', '-O.jpg');
	return {
		id: raw.id,
		title: raw.title ?? '',
		price: typeof raw.price === 'number' ? raw.price : null,
		originalPrice: typeof raw.original_price === 'number' ? raw.original_price : null,
		image: thumb || null,
		// Regra do programa: só anúncios novos e ativos.
		available: raw.status === 'active' && (condition === undefined || condition === 'new'),
	};
}

export async function getLiveItems(ids: string[]): Promise<Record<string, LiveItem | null>> {
	const out: Record<string, LiveItem | null> = {};
	const missing: string[] = [];
	for (const id of new Set(ids)) {
		const hit = cache.get(id);
		if (hit && Date.now() - hit.at < hit.ttl) out[id] = hit.item;
		else missing.push(id);
	}
	if (missing.length) {
		try {
			const bearer = await getToken();
			if (bearer) {
				for (let i = 0; i < missing.length; i += 20) {
					const chunk = missing.slice(i, i + 20);
					const attrs = 'id,title,price,original_price,status,condition,item_condition,thumbnail,secure_thumbnail';
					const res = await fetch(`${API}/items?ids=${chunk.join(',')}&attributes=${attrs}`, {
						headers: { Authorization: `Bearer ${bearer}`, accept: 'application/json' },
						signal: AbortSignal.timeout(6000),
					});
					if (!res.ok) { console.error('[mercadolivre] consulta falhou:', res.status); continue; }
					const rows = (await res.json()) as { code: number; body: RawItem }[];
					for (const row of rows) {
						if (row.code === 200 && row.body?.id) {
							const item = toLiveItem(row.body);
							cache.set(row.body.id, { at: Date.now(), ttl: TTL_OK, item });
							out[row.body.id] = item;
						}
					}
				}
			}
		} catch (error) {
			console.error('[mercadolivre] erro na consulta:', error);
		}
	}
	for (const id of missing) {
		if (!(id in out)) {
			out[id] = null;
			cache.set(id, { at: Date.now(), ttl: TTL_FAIL, item: null });
		}
	}
	return out;
}
