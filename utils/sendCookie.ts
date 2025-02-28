import type { Response } from 'express';
import jwt from 'jsonwebtoken';

export const generateCookie = (res: Response, userId: string) => {
	const JWT_SECRET: string = process.env.JWT_SECRET!;
	const NODE_ENV: string = process.env.NODE_ENV!;
	const FRONTEND_URL: string = process.env.FRONTEND_URL!;
	const maxAge = 15 * 24 * 60 * 60 * 1000; // 15 days in ms

	const token = jwt.sign({ _id: userId }, JWT_SECRET!, {
		expiresIn: '15d',
	});

	res.cookie('jwt', token, {
		httpOnly: true,
		maxAge,
		sameSite: NODE_ENV === 'DEVELOPMENT' ? 'lax' : 'none',
		secure: NODE_ENV === 'DEVELOPMENT' ? false : true,
		// @ts-ignore
		// origin: FRONTEND_URL,
		source: FRONTEND_URL,
	});
};
