import type { Route } from './+types/category';
import { seo } from '@/lib/seo';
import { PostGrid } from '@/components/home/post-grid';
import { TopGuide, type TopLive } from '@/components/home/top-guide';
import { posts, imageUrl } from '@/lib/posts';
import { techCategories, techUpdated, fitnessCategories, fitnessUpdated, casaCategories, casaUpdated } from '@/lib/tops';
import { productBySlug } from '@/lib/products';
import { getLiveItems } from '@/lib/mercadolivre.server';
const names:Record<string,string>={tecnologia:'Tecnologia',fitness:'Fitness',casa:'Casa'};
const setFor=(category:string)=>category==='Tecnologia'?techCategories:category==='Fitness'?fitnessCategories:category==='Casa'?casaCategories:[];
export async function loader({params}:Route.LoaderArgs){
  const category=names[params.category||''];
  if(!category)throw new Response('Página não encontrada',{status:404});
  const live:TopLive={};
  const registered=setFor(category).flatMap(c=>c.items).map(i=>({slug:i.slug,product:productBySlug(i.slug)})).filter((x):x is {slug:string;product:NonNullable<ReturnType<typeof productBySlug>>}=>!!x.product);
  if(registered.length){
    const ids=registered.map(x=>x.product.itemId).filter((id):id is string=>!!id);
    const items=ids.length?await getLiveItems(ids):{};
    for(const {slug,product} of registered){const l=product.itemId?items[product.itemId]:null;if(l&&!l.available)continue;live[slug]={registered:true,price:l?.price??null,originalPrice:l?.originalPrice??null,image:l?.image??null};}
  }
  return {category,live};
}
const metaText:Record<string,{title:string;description:string}>={
  Tecnologia:{title:'Top 7 custo-benefício: notebooks, celulares, tablets e smartwatches — Aquelas Ofertas',description:'Os 7 melhores custo-benefício de notebooks, celulares, tablets e smartwatches em outubro de 2026, com pontos fortes e fracos de cada um.'},
  Fitness:{title:'Fitness: tênis, roupas de academia e corrida, whey e creatina — Aquelas Ofertas',description:'Seleção de tênis de corrida, roupas para academia e corrida e suplementos como whey e creatina, com pontos fortes e fracos e atalhos para o Mercado Livre.'},
  Casa:{title:'Casa: air fryers, robôs aspiradores, cozinha e conforto — Aquelas Ofertas',description:'Seleção de air fryers, robôs aspiradores, itens de cozinha e conforto para a casa, com pontos fortes e fracos de cada um e atalhos para o Mercado Livre.'}};
export function meta({matches,location,loaderData}:Route.MetaArgs){const c=loaderData?.category||'categoria';const m=metaText[c];return seo({matches,location},{title:m?.title||`Artigos de ${c} — Aquelas Ofertas`,description:m?.description||'Guias e artigos para escolher melhor antes de comprar. Conteúdo original com links de afiliados sinalizados.',image:imageUrl(posts[0].image)});}
export default function Category({loaderData}:Route.ComponentProps){
  const {category,live}=loaderData;
  return <main className="category-page">
    {category==='Tecnologia'&&<TopGuide id="top7" articleSlug="top-7-custo-beneficio-tecnologia" title="Os 7 mais vantajosos de cada categoria" categories={techCategories} updated={techUpdated} live={live} footnote={`Não testamos os aparelhos: reunimos guias de compra e testes de especialistas brasileiros publicados em ${techUpdated}. Preços e versões mudam, confira a configuração exata no anúncio. Alguns links são de afiliados.`}/>}
    {category==='Fitness'&&<TopGuide id="top7" articleSlug="top-7-fitness-tenis-roupas-suplementos" title="Tênis, roupas e suplementos que valem a pena" categories={fitnessCategories} updated={fitnessUpdated} live={live} footnote={`Não testamos os produtos: reunimos guias de compra brasileiros publicados em 2026 e escrevemos com as nossas palavras. Preços, versões e fórmulas mudam, confira no anúncio. Informação sobre suplementos não substitui a orientação de um nutricionista ou médico. Alguns links são de afiliados.`}/>}
    {category==='Casa'&&<TopGuide id="top7" articleSlug="top-7-casa-air-fryer-robo-aspirador" title="Para a casa render mais" categories={casaCategories} updated={casaUpdated} live={live} footnote={`Não testamos os produtos: reunimos guias de compra brasileiros publicados em 2026 e escrevemos com as nossas palavras. Preços, versões e voltagem mudam, confira no anúncio antes de comprar. Alguns links são de afiliados.`}/>}
    <PostGrid key={category} category={category}/>
  </main>}
