import { ArrowUpRight } from 'lucide-react';
import { money } from '@/lib/format';
export type ProductCardData = { slug: string; title: string; image: string | null; price: number | null; originalPrice: number | null };
export function ProductCard({ product }: { product: ProductCardData }) {
	const discount = product.price && product.originalPrice && product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
	return <aside className="product-box">
		{product.image && <img src={product.image} alt={product.title} width="200" height="200" loading="lazy" />}
		<div>
			<span className="product-store">MERCADO LIVRE</span>
			<h3>{product.title}</h3>
			{product.price !== null && <p className="product-price">{discount > 0 && <del>{money(product.originalPrice!)}</del>}<strong>{money(product.price)}</strong>{discount > 0 && <em>−{discount}%</em>}</p>}
			<a className="primary-button" href={`/go/${product.slug}`} target="_blank" rel="sponsored noopener">{product.price !== null ? 'Ver no Mercado Livre' : 'Ver preço no Mercado Livre'} <ArrowUpRight size={16} /></a>
			<small>Link de afiliado. O preço muda no anúncio, confira antes de comprar.</small>
		</div>
	</aside>;
}
