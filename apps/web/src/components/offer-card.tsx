import { ArrowUpRight, Tag } from 'lucide-react';
import { categoryLabel } from '@/lib/categories';
import { money } from '@/lib/format';
export type OfferView = { id: number; title: string; price: number | null; old_price: number | null; store: string | null; category: string; image: string | null; coupon: string | null; description: string | null };
export function OfferCard({ offer }: { offer: OfferView }) {
	const off = offer.price && offer.old_price && offer.old_price > offer.price ? Math.round((1 - offer.price / offer.old_price) * 100) : 0;
	return <article className="deal-card">
		<div className="deal-image">{offer.image ? <img src={offer.image} alt={offer.title} loading="lazy" referrerPolicy="no-referrer" /> : <Tag size={34} />}{off > 0 && <span className="deal-off">−{off}%</span>}</div>
		<div className="deal-body">
			<div className="deal-meta"><span>{categoryLabel(offer.category)}</span>{offer.store && <span>{offer.store}</span>}</div>
			<h3>{offer.title}</h3>
			{offer.description && <p className="deal-desc">{offer.description}</p>}
			{offer.price !== null && <p className="deal-price">{offer.old_price && off > 0 && <del>{money(offer.old_price)}</del>}<strong>{money(offer.price)}</strong></p>}
			{offer.coupon && <p className="deal-coupon">Cupom: <b>{offer.coupon}</b></p>}
			<a className="primary-button" href={`/go/o/${offer.id}`} target="_blank" rel="sponsored noopener">Ver oferta <ArrowUpRight size={16} /></a>
		</div>
	</article>;
}
