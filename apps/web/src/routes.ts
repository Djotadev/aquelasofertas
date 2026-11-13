import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/home.tsx'),
	route('guias', 'routes/guias.tsx'),
	route('ofertas', 'routes/ofertas.tsx'),
	route('termos', 'routes/termos.tsx'),
	route('admin', 'routes/admin.tsx'),
	route('blog/:slug', 'routes/post.tsx'),
	route(':category', 'routes/category.tsx'),
	route('sobre', 'routes/info.tsx', { id: 'sobre' }),
	route('aviso-de-afiliados', 'routes/info.tsx', { id: 'aviso' }),
	route('go/o/:id', 'routes/go.offer.ts'),
	route('go/:id', 'routes/go.ts'),
	route('sitemap.xml', 'routes/sitemap.xml.ts'),
	route('robots.txt', 'routes/robots.txt.ts'),
	route('api/health', 'routes/api.health.ts'),
	route('api/inscrever', 'routes/api.inscrever.ts'),
	route('api/confirmar', 'routes/api.confirmar.ts'),
	route('api/waha/webhook', 'routes/api.waha.webhook.ts'),
	route('api/admin/:op', 'routes/api.admin.ts'),
	route('api/*', 'routes/api.$.ts'),
] satisfies RouteConfig;
