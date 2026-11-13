import type { Route } from './+types/ofertas';
import { seo } from '@/lib/seo';
import { all } from '@/lib/db.server';
import { categories, categoryIds } from '@/lib/categories';
import { imageUrl, posts } from '@/lib/posts';
import { OfferCard, type OfferView } from '@/components/offer-card';

export function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
	const cat = url.searchParams.get('categoria') || '';
	const where = ["status = 'publicada'"]; const args: string[] = [];
	if (q) { where.push("title LIKE ? ESCAPE '\\'"); args.push(`%${q.replace(/[\\%_]/g, m => '\\' + m)}%`); }
	if (categoryIds.includes(cat)) { where.push('category = ?'); args.push(cat); }
	const offers = all(`SELECT id, title, price, old_price, store, category, image, coupon, description FROM offers WHERE ${where.join(' AND ')} ORDER BY published_at DESC LIMIT 60`, ...args) as OfferView[];
	return { offers, q, cat: categoryIds.includes(cat) ? cat : '' };
}
export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, { title: 'Todas as ofertas — Aquelas Ofertas', description: 'Ofertas e cupons garimpados e conferidos. Filtre por categoria ou busque pelo produto.', image: imageUrl(posts[0].image) });
}
export default function Ofertas({ loaderData }: Route.ComponentProps) {
	const { offers, q, cat } = loaderData;
	return <main className="lp"><section className="lp-section first">
		<div className="eyebrow"><span /> OFERTAS E CUPONS</div><h1 className="page-title">Todas as ofertas.</h1><p className="muted">Filtre por categoria ou busque pelo produto.</p>
		<form method="get" className="filter-bar" role="search"><input name="q" defaultValue={q} placeholder="Buscar oferta…" aria-label="Buscar oferta" /><select name="categoria" defaultValue={cat} aria-label="Categoria"><option value="">Todas as categorias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><button className="primary-button">Filtrar</button></form>
		{offers.length ? <div className="deal-grid">{offers.map(o => <OfferCard key={o.id} offer={o} />)}</div> : <p className="empty-box">Nenhuma oferta por aqui ainda.</p>}
	</section></main>;
}
