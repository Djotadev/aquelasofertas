import data from '@/data/produtos.json';
/** Produto do Mercado Livre cadastrado em src/data/produtos.json. */
export type Product = {
  /** Nome curto usado nos artigos e em /go/<slug>. Ex.: "fone-xyz" */
  slug: string;
  /** Opcional: ID do anúncio no Mercado Livre (ex.: "MLB1828680414"). Com ele, o site mostra foto e preço atualizados pela API. */
  itemId?: string;
  /** Link de afiliado gerado no painel do Mercado Livre. */
  affiliateUrl: string;
  /** Opcionais: usados só se a consulta automática ao Mercado Livre falhar. */
  title?: string;
  image?: string;
};
export const products = data.products as Product[];
export const productBySlug = (slug?: string) => products.find(p => p.slug === slug);
