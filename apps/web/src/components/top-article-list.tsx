import { ArrowUpRight, Check, Minus, Laptop, Smartphone, Tablet, Watch, Footprints, Shirt, Pill, CookingPot, Bot, UtensilsCrossed, Armchair, Package, type LucideIcon } from 'lucide-react';
import type { TopCategory } from '@/lib/tops';
import type { TopLive } from '@/components/home/top-guide';
import { money } from '@/lib/format';
const icons: Record<string, LucideIcon> = { notebooks: Laptop, celulares: Smartphone, tablets: Tablet, smartwatches: Watch, tenis: Footprints, 'roupas-academia': Shirt, 'roupas-corrida': Shirt, suplementos: Pill, 'air-fryers': CookingPot, robos: Bot, cozinha: UtensilsCrossed, conforto: Armchair };
/** Lista detalhada de uma categoria do Top 7, com foto. A foto vem do Mercado Livre (produto cadastrado) ou de /produtos/<slug>.jpg; sem elas, aparece um cartão ilustrado. */
export function TopArticleList({ category, live }: { category: TopCategory; live: TopLive }) {
	const Icon = icons[category.id] ?? Package;
	return <ol className="art-top">
		{category.items.map((item, index) => {
			const info = live[item.slug];
			const src = info?.image || `/produtos/${item.slug}.jpg`;
			return <li className="art-card" key={item.slug}>
				<div className="art-photo">
					<div className="art-placeholder"><Icon size={40} /><span>{item.name}</span></div>
					<img src={src} alt={item.name} loading="lazy" width="200" height="200" ref={el => { if (el && el.complete && el.naturalWidth === 0) el.style.display = 'none'; }} onError={e => { e.currentTarget.style.display = 'none'; }} />
					<span className="art-rank">{index + 1}</span>
				</div>
				<div className="art-body">
					<div className="top-head"><h3>{item.name}</h3><span className="top-badge">{item.badge}</span></div>
					<p>{item.summary}</p>
					<div className="top-points">
						<ul className="pros">{item.pros.map(p => <li key={p}><Check size={13} />{p}</li>)}</ul>
						<ul className="cons">{item.cons.map(p => <li key={p}><Minus size={13} />{p}</li>)}</ul>
					</div>
					{item.examples && <p className="top-examples">Marcas muito citadas nos guias: {item.examples.join(', ')}.</p>}
					{info?.price != null && <div className="product-price"><strong>{money(info.price)}</strong></div>}
					<a className="primary-button art-button" href={`/go/${item.slug}`} target="_blank" rel="sponsored noopener">{info?.registered ? 'Ver no Mercado Livre' : 'Buscar no Mercado Livre'} <ArrowUpRight size={16} /></a>
				</div>
			</li>;
		})}
	</ol>;
}
