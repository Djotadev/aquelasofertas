import type { Route } from './+types/home';
import { Link } from 'react-router';
import { ArrowDown, ArrowUpRight, Check } from 'lucide-react';
import { seo } from '@/lib/seo';
import { all } from '@/lib/db.server';
import { categories } from '@/lib/categories';
import { imageUrl, posts } from '@/lib/posts';
import { SignupForm } from '@/components/signup-form';
import { OfferCard, type OfferView } from '@/components/offer-card';

export function loader() {
	const offers = all("SELECT id, title, price, old_price, store, category, image, coupon, description FROM offers WHERE status = 'publicada' ORDER BY published_at DESC LIMIT 6") as OfferView[];
	return { offers, telegram: process.env.PUBLIC_TELEGRAM_URL || null, instagram: process.env.PUBLIC_INSTAGRAM_URL || 'https://instagram.com/aquelasofertas' };
}
export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, { title: 'Aquelas Ofertas — ofertas e cupons garimpados', description: 'Ofertas e cupons garimpados todo dia, direto no seu WhatsApp, Telegram e Instagram. Compre melhor. Gaste menos.', image: imageUrl(posts[0].image) });
}
const faq = [
	['É de graça?', 'Sim. Receber as ofertas não custa nada. Alguns links são de afiliados: se você comprar por eles, podemos receber uma comissão sem custo adicional para você.'],
	['Vou receber muita mensagem?', 'Não. Você só recebe as categorias que escolheu e há um limite diário de mensagens por pessoa.'],
	['Como faço para sair?', 'Responda SAIR no próprio WhatsApp a qualquer momento. Você deixa de receber na hora.'],
	['Os cupons funcionam mesmo?', 'A gente confere antes de enviar, mas cupons e preços mudam e podem acabar a qualquer momento. Confira sempre no site da loja.'],
];
const steps = [['Garimpamos', 'Vasculhamos lojas online todos os dias atrás das melhores ofertas.'], ['Conferimos', 'Cada preço e cupom é verificado antes de ir para o canal.'], ['Você decide', 'Recebe só as categorias que escolheu e compra se valer a pena.']];

export default function Home({ loaderData }: Route.ComponentProps) {
	const { offers, telegram, instagram } = loaderData;
	return <main className="lp">
		<section className="lp-hero">
			<div className="lp-copy">
				<div className="eyebrow"><span /> OFERTAS E CUPONS GARIMPADOS</div>
				<h1>Compre melhor.<br />Gaste <span>menos.</span></h1>
				<p>Ofertas de tecnologia, casa, moda e muito mais, conferidas antes de chegar até você. A gente garimpa. Você decide.</p>
				<div className="hero-actions"><a href="#cadastro" className="primary-button">Receber ofertas grátis <ArrowDown size={17} /></a><Link to="/ofertas" className="ghost-button">Ver ofertas de hoje <ArrowUpRight size={16} /></Link></div>
				<ul className="lp-checks"><li><Check size={14} /> Cupons verificados</li><li><Check size={14} /> Links sinalizados</li><li><Check size={14} /> Saia quando quiser</li></ul>
				<div className="lp-socials">{telegram && <a href={telegram} target="_blank" rel="noopener" className="social-chip"><i className="dot blue" /> Canal no Telegram</a>}<a href={instagram} target="_blank" rel="noopener" className="social-chip"><i className="dot pink" /> @aquelasofertas</a></div>
			</div>
			<SignupForm />
		</section>
		<section className="lp-section">
			<div className="eyebrow"><span /> OFERTAS E CUPONS</div>
			<div className="lp-head"><div><h2>Ofertas em destaque.</h2><p className="muted">Os achados mais recentes, já conferidos.</p></div><Link to="/ofertas" className="more-link">Ver todas <ArrowUpRight size={14} /></Link></div>
			{offers.length ? <div className="deal-grid">{offers.map(o => <OfferCard key={o.id} offer={o} />)}</div> : <p className="empty-box">As primeiras ofertas chegam em breve. Cadastre-se para não perder.</p>}
		</section>
		<section className="lp-section">
			<div className="eyebrow"><span /> CATEGORIAS</div>
			<h2>Navegue por categoria.</h2><p className="muted">Escolha o que te interessa.</p>
			<div className="cat-grid">{categories.map(c => <Link key={c.id} to={`/ofertas?categoria=${c.id}`} className="cat-tile"><span aria-hidden="true">{c.emoji}</span>{c.label}</Link>)}</div>
		</section>
		<section className="lp-section">
			<div className="eyebrow"><span /> GUIAS DE COMPRA</div>
			<h2>Top 7 custo-benefício.</h2><p className="muted">Guias com fotos e explicações para escolher melhor.</p>
			<div className="cat-grid guide-links"><Link to="/tecnologia" className="cat-tile"><span aria-hidden="true">💻</span>Tecnologia</Link><Link to="/fitness" className="cat-tile"><span aria-hidden="true">🏃</span>Fitness</Link><Link to="/casa" className="cat-tile"><span aria-hidden="true">🏠</span>Casa</Link><Link to="/guias" className="cat-tile"><span aria-hidden="true">📖</span>Todos os guias</Link></div>
		</section>
		<section className="lp-section steps-row">
			<div><div className="eyebrow"><span /> SEM COMPLICAÇÃO</div><h2>Como a gente garimpa as ofertas.</h2></div>
			<ol className="lp-steps">{steps.map(([t, d], i) => <li key={t}><b>0{i + 1}</b><h3>{t}</h3><p>{d}</p></li>)}</ol>
		</section>
		<section className="lp-section">
			<div className="eyebrow"><span /> DÚVIDAS</div><h2>Perguntas frequentes.</h2>
			<div className="faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
		</section>
	</main>;
}
