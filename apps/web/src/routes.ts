import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/home.tsx'),
	route('blog/:slug', 'routes/post.tsx'),
	route(':category', 'routes/category.tsx'),
	route('sobre', 'routes/info.tsx', { id: 'sobre' }),
	route('aviso-de-afiliados', 'routes/info.tsx', { id: 'aviso' }),
	route('go/:id', 'routes/go.ts'),
	route('sitemap.xml', 'routes/sitemap.xml.ts'),
	route('robots.txt', 'routes/robots.txt.ts'),
	route('api/health', 'routes/api.health.ts'),
	route('api/*', 'routes/api.$.ts'),
] satisfies RouteConfig;
