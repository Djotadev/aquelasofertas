import { sha256 } from './crypto.server';
/**
 * Shopee Affiliate Open API (GraphQL). Variáveis: SHOPEE_APP_ID e SHOPEE_APP_SECRET.
 * Só funciona para contas de afiliado aprovadas e com acesso à Open API.
 */
const endpoint = () => process.env.SHOPEE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql';
export const shopeeConfigured = () => !!(process.env.SHOPEE_APP_ID && process.env.SHOPEE_APP_SECRET);

export type ShopeeProduct = { itemId: string; title: string; image: string | null; price: number; discount: number; sales: number; rating: number; shop: string | null; link: string };
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

async function gql(query: string): Promise<any> {
	const appId = process.env.SHOPEE_APP_ID, secret = process.env.SHOPEE_APP_SECRET;
	if (!appId || !secret) throw new Error('SHOPEE_APP_ID e SHOPEE_APP_SECRET não estão configurados');
	const payload = JSON.stringify({ query });
	const ts = Math.floor(Date.now() / 1000);
	const signature = sha256(`${appId}${ts}${payload}${secret}`);
	const res = await fetch(endpoint(), { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signature}` }, body: payload, signal: AbortSignal.timeout(20000) });
	const json: any = await res.json().catch(() => ({}));
	if (json.errors?.length) throw new Error(`Shopee: ${String(json.errors[0].message).slice(0, 200)}`);
	if (!res.ok) throw new Error(`Shopee respondeu HTTP ${res.status}`);
	return json.data;
}
/** sortType: 1 relevância, 2 mais vendidos, 3 maior preço, 4 menor preço, 5 maior comissão. */
export async function searchShopee(keyword: string, limit = 20, sortType = 2): Promise<ShopeeProduct[]> {
	const q = `query { productOfferV2(keyword: ${JSON.stringify(keyword)}, sortType: ${Math.round(sortType)}, page: 1, limit: ${Math.min(50, Math.max(1, Math.round(limit)))}) { nodes { itemId productName imageUrl priceMin priceMax priceDiscountRate sales ratingStar shopName offerLink } } }`;
	const data = await gql(q);
	const nodes: any[] = data?.productOfferV2?.nodes ?? [];
	return nodes.filter(n => n?.offerLink && n?.productName).map(n => ({
		itemId: String(n.itemId), title: String(n.productName), image: n.imageUrl || null,
		price: num(n.priceMin) || num(n.priceMax), discount: Math.max(0, num(n.priceDiscountRate)), sales: num(n.sales), rating: num(n.ratingStar), shop: n.shopName || null, link: String(n.offerLink),
	}));
}
