import { categoryLabel } from './categories';
const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const codeText = (code: string) => `Seu código de confirmação da *Aquelas Ofertas* é *${code}*.\nEle vale por 10 minutos. Se não foi você, é só ignorar esta mensagem.`;
export const welcomeText = (cats: string[]) => `✅ Cadastro confirmado!\nVocê vai receber ofertas de: ${cats.map(categoryLabel).join(', ')}.\n\nPara parar de receber, responda *SAIR* a qualquer momento.`;
export const leftText = () => 'Pronto, você não vai mais receber nossas ofertas. Se quiser voltar, é só se cadastrar de novo no site. 👋';
export function offerText(o: Record<string, any>, baseUrl: string): string {
	const lines = [`🔥 *${o.title}*`];
	if (typeof o.price === 'number') {
		const off = typeof o.old_price === 'number' && o.old_price > o.price ? ` (de ~R$ ${brl(o.old_price)}~, -${Math.round((1 - o.price / o.old_price) * 100)}%)` : '';
		lines.push(`💰 R$ ${brl(o.price)}${off}`);
	}
	if (o.coupon) lines.push(`🎟️ Cupom: *${o.coupon}*`);
	if (o.store) lines.push(`🛒 ${o.store}`);
	lines.push(`👉 ${baseUrl}/go/o/${o.id}`, '', '_Link de afiliado. Preço e estoque podem mudar. Responda *SAIR* para parar._');
	return lines.join('\n');
}
