import type { Route } from './+types/home';
import { seo } from '@/lib/seo';
import { Hero } from '@/components/home/hero';
import { PostGrid } from '@/components/home/post-grid';
import { HowItWorks } from '@/components/home/how-it-works';
import { imageUrl, posts } from '@/lib/posts';
export function meta({matches,location}:Route.MetaArgs){return seo({matches,location},{title:'Guias de compra — Aquelas Ofertas',description:'Blog com guias de compra em tecnologia, fitness e casa. Conteúdo para escolher melhor antes de comprar, com links de afiliados sinalizados.',image:imageUrl(posts[0].image),jsonLd:[{'@context':'https://schema.org','@type':'Blog',name:'Aquelas Ofertas'}]});}
export default function GuiasPage(){return <main><Hero/><PostGrid/><HowItWorks/></main>}
