export const categories = [
	{ id: 'eletronicos', label: 'Eletrônicos', emoji: '📱' },
	{ id: 'casa', label: 'Casa', emoji: '🏠' },
	{ id: 'fitness', label: 'Fitness', emoji: '💪' },
	{ id: 'moda', label: 'Moda', emoji: '👗' },
	{ id: 'beleza', label: 'Beleza', emoji: '💄' },
	{ id: 'mercado', label: 'Mercado', emoji: '🛒' },
	{ id: 'games', label: 'Games', emoji: '🎮' },
	{ id: 'viagem', label: 'Viagem', emoji: '✈️' },
	{ id: 'restaurantes', label: 'Restaurantes', emoji: '🍔' },
	{ id: 'locais', label: 'Locais', emoji: '📍' },
] as const;
export const categoryIds: string[] = categories.map(c => c.id);
export const categoryLabel = (id: string) => categories.find(c => c.id === id)?.label ?? id;
