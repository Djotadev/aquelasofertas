import type { Route } from './+types/termos';
import { seo } from '@/lib/seo';
import { imageUrl, posts } from '@/lib/posts';
export function loader() { return { email: process.env.PUBLIC_CONTACT_EMAIL || null }; }
export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, { title: 'Termos e privacidade — Aquelas Ofertas', description: 'Como usamos seu número de WhatsApp, como receber e como sair das mensagens da Aquelas Ofertas.', image: imageUrl(posts[0].image) });
}
export default function Termos({ loaderData }: Route.ComponentProps) {
	return <main className="info-page"><div className="eyebrow blue">AQUELAS OFERTAS · TRANSPARÊNCIA</div><h1>Termos e privacidade</h1>
		<h2>Quais dados coletamos</h2><p>Coletamos o seu número de WhatsApp, o seu nome (se você informar) e as categorias de oferta que escolheu. Também guardamos a data do seu aceite e do cadastro.</p>
		<h2>Para que usamos</h2><p>Usamos esses dados apenas para confirmar o seu cadastro com um código e para enviar as ofertas e cupons das categorias que você escolheu. Não vendemos os seus dados.</p>
		<h2>Como funciona o envio</h2><p>As mensagens são enviadas pelo WhatsApp. Há um limite diário de mensagens por pessoa, e você só recebe as categorias escolhidas.</p>
		<h2>Como sair</h2><p>Responda <b>SAIR</b> a qualquer mensagem e você deixa de receber ofertas imediatamente. Para pedir a exclusão dos seus dados{loaderData.email ? <>, escreva para <a href={`mailto:${loaderData.email}`}>{loaderData.email}</a></> : ', entre em contato pelos nossos canais'}.</p>
		<h2>Links de afiliados</h2><p>Alguns links levam a lojas parceiras. Se você comprar por eles, podemos receber uma comissão sem custo adicional para você. Preços, cupons e estoque são de responsabilidade das lojas e podem mudar.</p>
		<h2>Seus direitos</h2><p>Você pode pedir acesso, correção ou exclusão dos seus dados e retirar o consentimento quando quiser, conforme a Lei Geral de Proteção de Dados (LGPD).</p>
	</main>;
}
