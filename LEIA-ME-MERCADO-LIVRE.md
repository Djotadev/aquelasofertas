# Integração com o Mercado Livre

O blog consulta o Mercado Livre pelo servidor e mostra, dentro dos artigos, cartões de produto com
título, foto e **preço atualizado** (cache de 15 minutos). O botão leva ao seu link de afiliado.

## 1. Credenciais da API (uma vez)
1. Crie um aplicativo em https://developers.mercadolivre.com.br e copie o **Client ID** e o **Client Secret**.
2. Na Hostinger, em "Variáveis de ambiente" do app Node.js, adicione:
   - `ML_CLIENT_ID` = seu Client ID
   - `ML_CLIENT_SECRET` = seu Client Secret
   Sem elas o site funciona, mas os cartões ficam sem preço automático.

## 2. Cadastrar um produto (`apps/web/src/data/produtos.json`)
```json
{
  "products": [
    {
      "slug": "fone-exemplo",
      "itemId": "MLB1234567890",
      "affiliateUrl": "https://www.mercadolivre.com.br/... (link gerado no painel de afiliados)",
      "title": "Nome do produto (reserva)",
      "image": "https://... (reserva, opcional)"
    }
  ]
}
```
- `itemId` (opcional): o código MLB do anúncio. Sem ele, o botão usa o seu link de afiliado normalmente; com ele (e as credenciais da API), o site também mostra foto e preço atualizados.
- `affiliateUrl`: gere sempre no painel de afiliados do Mercado Livre.
- `title` e `image` só são usados se a consulta automática falhar.

## 3. Colocar o produto num artigo (`apps/web/src/data/posts.json`)
No `body` do artigo, adicione o bloco:
```json
{ "type": "product", "id": "fone-exemplo" }
```
Anúncios que não estiverem ativos ou não forem novos são escondidos automaticamente.

## Top 7 das abas Tecnologia, Fitness e Casa
Tecnologia (28 itens) fica em `apps/web/src/data/top-tecnologia.json` Fitness (28 itens) em `apps/web/src/data/top-fitness.json` e Casa (28 itens: air fryers, robôs aspiradores, cozinha e conforto) em `apps/web/src/data/top-casa.json`.
- Sem cadastro, o botão do produto abre a **busca no Mercado Livre** (sem comissão).
- Para ganhar comissão e mostrar o **preço atualizado**, cadastre o produto em `produtos.json` usando
  **o mesmo `slug`** do item do Top 7 (ex.: `cel-galaxy-a57`, `su-creatina` ou `af-britania-bfr50`) com o `itemId` e o seu link de afiliado.
- Para trocar a seleção, edite o arquivo da categoria e atualize o campo `updated`.

## Fotos nos artigos do Top 7
Cada artigo mostra uma foto por produto, nesta ordem:
1. A foto do anúncio no Mercado Livre, quando o produto está cadastrado em `produtos.json` e as credenciais da API estão configuradas.
2. Um arquivo seu em `apps/web/public/produtos/<slug>.jpg` (por exemplo `nb-aspire-5.jpg`).
3. Se não houver nenhuma das duas, um cartão ilustrado com o nome do produto.
