import crypto from 'node:crypto';
export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const appSecret = () => process.env.SESSION_SECRET || 'troque-este-segredo-em-producao';
export function hashPassword(password: string) {
	const salt = crypto.randomBytes(16);
	const hash = crypto.scryptSync(password, salt, 64);
	return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const candidate = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 64);
	const expected = Buffer.from(hash, 'hex');
	return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
export const randomCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const codeHash = (phone: string, code: string) => sha256(`${appSecret()}:${phone}:${code}`);
export const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
