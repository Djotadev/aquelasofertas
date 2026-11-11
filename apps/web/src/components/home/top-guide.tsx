import { useState } from 'react';
import { ArrowUpRight, Check, Minus, Trophy } from 'lucide-react';
import type { TopCategory } from '@/lib/tops';
import { money } from '@/lib/format';
export type TopLive = Record<string, { registered: boolean; price: number | null; originalPrice: number | null; image: string | null }>;
type Props = { id: string; title: string; categories: TopCategory[]; updated: string; live: TopLive; footnote: string; articleSlug?: string };
export function TopGuide({ id, title, categories, updated, live, footnote, articleSlug }: Props) {
	const [selected, setSelected] = useState(categories[0].id);
	const category = categories.find(c => c.id === selected) ?? categories[0];
	return <section id={id} className="offers-section top-section">
		<div className="section-heading"><div><div className="eyebrow blue"><Trophy size={15} /> TOP 7 CUSTO-BENEFÍCIO</div><h2>{title}<span className="heading-dot">.</span></h2><p>Seleção de {updated}. A ordem não é uma nota: o melhor depende do seu uso.</p></div></div>
		<div className="filter-row"><div className="filters" aria-label="Escolher categoria">{categories.map(c => <button key={c.id} onClick={() => setSelected(c.id)} aria-pressed={selected === c.id} className={selected === c.id ? 'selected' : ''}>{c.label}</button>)}</div></div>
		<p className="top-intro">{category.intro}</p>
		{articleSlug && <p className="top-article-link"><a href={`/blog/${articleSlug}`}>Ler o artigo completo, com fotos e explicações <ArrowUpRight size={14} /></a></p>}
		<ol className="top-list" key={category.id}>
			{category.items.map((item, index) => {
				const info = live[item.slug];
				return <li className="top-card" key={item.slug}>
					<span className="top-rank">{index + 1}</span>
					<div className="top-body">
						<div className="top-head"><h3>{item.name}</h3><span className="top-badge">{item.badge}</span></div>
						<p>{item.summary}</p>
						<div className="top-points">
							<ul className="pros">{item.pros.map(p => <li key={p}><Check size={13} />{p}</li>)}</ul>
							<ul className="cons">{item.cons.map(p => <li key={p}><Minus size={13} />{p}</li>)}</ul>
						</div>
						{item.examples && <p className="top-examples">Marcas muito citadas nos guias: {item.examples.join(', ')}.</p>}
					</div>
					<div className="top-action">
						{info?.price != null && <div className="product-price"><strong>{money(info.price)}</strong></div>}
						<a className="primary-button" href={`/go/${item.slug}`} target="_blank" rel="sponsored noopener">{info?.registered ? 'Ver no Mercado Livre' : 'Buscar no Mercado Livre'} <ArrowUpRight size={16} /></a>
						<small>{info?.price != null ? 'Preço atualizado automaticamente. Confira no anúncio.' : 'Compare preços e vendedores.'}</small>
					</div>
				</li>;
			})}
		</ol>
		<p className="top-note-bottom">{footnote}</p>
	</section>;
}
