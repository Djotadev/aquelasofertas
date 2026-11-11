import type { Route } from './+types/post';
import { Link } from 'react-router';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { seo } from '@/lib/seo';
import { findPost, imageUrl, posts, disclosure } from '@/lib/posts';
import { productBySlug } from '@/lib/products';
import { getLiveItems } from '@/lib/mercadolivre.server';
import { ProductCard, type ProductCardData } from '@/components/product-card';
import { TopArticleList } from '@/components/top-article-list';
import type { TopLive } from '@/components/home/top-guide';
import { topCategoryById } from '@/lib/tops';
export async function loader({params}:Route.LoaderArgs){const post=findPost(params.slug);if(!post)throw new Response('Artigo não encontrado',{status:404});
 const items=post.body.filter(b=>b.type==='product').map(b=>productBySlug(b.id)).filter((p):p is NonNullable<typeof p>=>!!p);
 const liveIds=items.map(p=>p.itemId).filter((id):id is string=>!!id);
 const live=liveIds.length?await getLiveItems(liveIds):{};
 const cards:ProductCardData[]=[];
 for(const p of items){const l=p.itemId?live[p.itemId]:null;if(l&&!l.available)continue;cards.push({slug:p.slug,title:l?.title||p.title||'Produto no Mercado Livre',image:l?.image||p.image||null,price:l?.price??null,originalPrice:l?.originalPrice??null});}
 const topLive:TopLive={};
 const topSlugs=post.body.filter(b=>b.type==='toplist').flatMap(b=>topCategoryById(b.id)?.items??[]).map(i=>({slug:i.slug,product:productBySlug(i.slug)})).filter((x):x is {slug:string;product:NonNullable<ReturnType<typeof productBySlug>>}=>!!x.product);
 const topIds=topSlugs.map(x=>x.product.itemId).filter((id):id is string=>!!id);
 if(topSlugs.length){const found=topIds.length?await getLiveItems(topIds):{};for(const {slug,product} of topSlugs){const l=product.itemId?found[product.itemId]:null;if(l&&!l.available)continue;topLive[slug]={registered:true,price:l?.price??null,originalPrice:l?.originalPrice??null,image:l?.image??null};}}
 return {post,cards,topLive};}
export function meta({matches,location,loaderData}:Route.MetaArgs){const p=loaderData?.post;if(!p)return [];return seo({matches,location},{title:`${p.title} — Aquelas Orfetas`,description:p.excerpt,image:imageUrl(p.image),type:'article',jsonLd:{'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,datePublished:p.isoDate,dateModified:p.isoDate,image:imageUrl(p.image),author:{'@type':'Organization',name:'Aquelas Orfetas'}}});}
export default function Post({loaderData}:Route.ComponentProps){
 const {post,cards,topLive}=loaderData; const related=posts.filter(p=>p.slug!==post.slug).slice(0,2);
 return <main className="info-page article"><Link to={`/${post.category.toLowerCase()}`} className="eyebrow blue">{post.category.toUpperCase()}</Link><h1>{post.title}</h1><div className="article-meta"><span><Clock3 size={13}/> {post.minutes} min de leitura</span><span>{post.date}</span></div><img className="article-cover" src={imageUrl(post.image)} alt={post.alt} width="1024" height="1024" fetchPriority="high"/><p className="article-notice">{disclosure}</p>{post.body.map((b,i)=>b.type==='h2'?<h2 key={i}>{b.text}</h2>:b.type==='toplist'?(()=>{const c=topCategoryById(b.id);return c?<TopArticleList key={i} category={c} live={topLive}/>:null;})():b.type==='product'?(()=>{const c=cards.find(x=>x.slug===b.id);return c?<ProductCard key={i} product={c}/>:null;})():b.type==='cta'?<a key={i} className="primary-button article-cta" href={`/go/${b.id}`} target="_blank" rel="sponsored noopener">{b.text} <ArrowUpRight size={17}/></a>:<p key={i}>{b.text}</p>)}<p className="article-notice">Preços, estoque e condições mudam no anúncio. Confira vendedor, frete e política de devolução antes de comprar.</p>{related.length>0&&<><h2>Continue lendo</h2><ul className="related">{related.map(r=><li key={r.slug}><Link to={`/blog/${r.slug}`}>{r.title} <ArrowUpRight size={14}/></Link></li>)}</ul></>}</main>}
