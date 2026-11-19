# Aquelas Ofertas: configuração no Easypanel (site + WAHA)

## 1. O app do site
No serviço do site (App, origem GitHub, build por Dockerfile):

**Mounts (volume), obrigatório:** adicione um volume com caminho de montagem `/data`.
É lá que fica o banco (inscritos, ofertas, administradores). Sem o volume, os dados somem a cada deploy.

**Environment (variáveis):**
| Variável | Valor |
|---|---|
| `ADMIN_USER` | usuário do painel (ex.: `admin`) |
| `ADMIN_PASSWORD` | senha forte do painel (só é usada na primeira vez, para criar o administrador) |
| `SESSION_SECRET` | texto longo e aleatório (guarde, não mude depois) |
| `PUBLIC_URL` | `https://seudominio.com.br` (usado nos links das mensagens) |
| `WAHA_URL` | endereço interno do WAHA, ex.: `http://NOMEDOPROJETO_waha:3000` |
| `WAHA_API_KEY` | a mesma chave definida no WAHA |
| `WAHA_SESSION` | `default` |
| `WAHA_WEBHOOK_TOKEN` | texto aleatório (usado no webhook, abaixo) |
| `PUBLIC_TELEGRAM_URL` | link do seu canal do Telegram (opcional) |
| `PUBLIC_INSTAGRAM_URL` | link do Instagram (opcional, padrão: instagram.com/aquelasofertas) |
| `PUBLIC_CONTACT_EMAIL` | e-mail para pedidos de exclusão de dados (aparece em /termos) |
| `ML_CLIENT_ID`, `ML_CLIENT_SECRET` | credenciais da API do Mercado Livre (opcional) |

Se você não definir `ADMIN_PASSWORD`, o sistema gera uma senha temporária e escreve no **log** do app na primeira inicialização.
Domínio: porta **80** (a que o Easypanel mostrar no log "Servidor ativo na porta ...").

## 2. O WAHA (modelo do Easypanel)
No serviço do WAHA, confira/defina (os nomes podem variar conforme a versão do modelo):
- `WAHA_API_KEY` = a mesma chave usada no app.
- `WHATSAPP_HOOK_URL` = `http://NOMEDOPROJETO_NOMEDOAPP:80/api/waha/webhook?token=SEU_WAHA_WEBHOOK_TOKEN`
- `WHATSAPP_HOOK_EVENTS` = `message`
- Mantenha um volume no WAHA para a sessão do WhatsApp não se perder.
Não exponha o WAHA na internet sem a chave de API.

## 3. Conectar o WhatsApp
1. Abra `https://seudominio.com.br/admin`, entre e vá na aba **WhatsApp**.
2. Clique em **Iniciar sessão**. Quando o status for `SCAN_QR_CODE`, o QR aparece na tela.
3. No celular do número que enviará: WhatsApp → Aparelhos conectados → Conectar aparelho.
4. O status deve virar `WORKING`. Envie uma **mensagem de teste** para o seu número.

## 4. Como funciona
- **Cadastro:** a pessoa informa o WhatsApp, escolhe as categorias e aceita os termos. O sistema envia um código de 6 dígitos (vale 10 min). Ao confirmar, ela passa a receber as ofertas das categorias escolhidas.
- **Ofertas:** no painel, aprove ou publique uma oferta. Ao publicar, ela entra numa fila e é enviada com intervalo entre as mensagens, respeitando o limite diário por pessoa (aba WhatsApp).
- **Sair:** quem responde SAIR deixa de receber na hora.
- **Cliques:** os links passam por `/go/o/ID`, que conta o clique e leva ao seu link de afiliado.

## 5. Cuidados com o WhatsApp (WAHA não é a API oficial)
- Use um **número dedicado** (chip separado), nunca o seu pessoal.
- Comece devagar: poucos inscritos, poucas ofertas por dia, intervalos de vários segundos.
- Só envie para quem fez o cadastro e confirmou o código.
- O WhatsApp pode restringir ou banir números que enviam mensagens em massa, mesmo com consentimento. O risco existe e é seu.

## 6. Backup
Copie o volume `/data` (arquivo `aquelas.db`) com frequência, ou ative os snapshots da Contabo.

## 7. Automação diária (coleta e envio)
Variáveis novas no app do site:
| Variável | Para quê |
|---|---|
| `SHOPEE_APP_ID`, `SHOPEE_APP_SECRET` | Busca de produtos na Shopee pela API oficial de afiliados (precisa de conta de afiliado aprovada com acesso à Open API) |
| `ML_CLIENT_ID`, `ML_CLIENT_SECRET` | Monitor de preço do Mercado Livre (produtos com `itemId` no `produtos.json`) |
| `PUBLIC_URL` | Obrigatória para a publicação automática (monta os links das mensagens) |

No painel, aba **Fontes e automação**:
1. **+ Nova fonte:** uma busca na Shopee (palavra-chave + categoria) ou o monitor de queda de preço do Mercado Livre.
2. **Testar:** mostra o que a fonte encontraria, sem salvar nada.
3. **Automação:** ligue, escolha o modo (você revisa antes de publicar, ou totalmente automático), a hora da coleta, os horários de publicação, quantas ofertas por horário e os filtros mínimos (desconto, nota, vendas).
4. Comece com o modo "Eu reviso" por alguns dias. Quando as ofertas estiverem boas, passe para "Totalmente automático".

Como funciona: na hora da coleta o sistema busca nas fontes, descarta o que não passa nos filtros e evita repetir o mesmo produto por 14 dias. Nos horários de publicação, publica as melhores da fila (maior pontuação). Cada pessoa continua limitada ao máximo diário da aba WhatsApp. Se o servidor ficou fora do ar, um horário perdido é recuperado até 3 horas depois.

## 8. Produtos do Mercado Livre pelo painel
Aba **Produtos ML** no `/admin`: cadastre cada produto colando (1) o link do anúncio ou o código MLB e (2) o seu link de afiliado gerado no painel do Mercado Livre.
- Com `ML_CLIENT_ID` e `ML_CLIENT_SECRET` configurados, o sistema busca nome, foto e preço sozinho e recusa anúncios inativos ou usados. Sem eles, informe o nome do produto.
- **Criar oferta:** gera uma oferta na fila com o preço de hoje, pronta para publicar.
- **Monitor de preço:** a fonte "Mercado Livre: queda de preço" (aba Fontes e automação) acompanha todos os produtos ativos e cria uma oferta quando o preço cai.
- **Top 7:** no campo "Usar nos guias Top 7", escolha o item do guia. O botão e o preço dele nas páginas Tecnologia, Fitness e Casa e nos artigos passam a usar o seu link de afiliado.
- O arquivo `produtos.json` continua funcionando, mas o painel tem prioridade.
