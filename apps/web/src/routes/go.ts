import { redirect } from 'react-router';
import type { Route } from './+types/go';
import { affiliateUrl } from '@/lib/posts';
import { productBySlug } from '@/lib/products';
import { topItemBySlug, searchUrl } from '@/lib/tops';
// Só redireciona para domínios do Mercado Livre.
const allowedHost = /(^|\.)(mercadolivre\.com\.br|mercadolivre\.com|mercadolibre\.com|meli\.la)$/;
export function loader({params}:Route.LoaderArgs){
  // Ponto de extensão: registrar cliques aqui.
  const top=topItemBySlug(params.id);
  const target = params.id==='mercadolivre' ? affiliateUrl : productBySlug(params.id)?.affiliateUrl ?? (top ? searchUrl(top.query) : undefined);
  if(!target)throw new Response('Link não encontrado',{status:404});
  const destination=new URL(target);
  if(destination.protocol!=='https:'||!allowedHost.test(destination.hostname))throw new Response('Link indisponível',{status:400});
  return redirect(destination.href,302);
}
