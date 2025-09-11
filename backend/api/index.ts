import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/app.js'; 

let fastifyApp: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!fastifyApp) {
      fastifyApp = await buildApp();
      await fastifyApp.ready();
    }
    fastifyApp.server.emit('request', req, res);
  } catch (err) {
    console.error('Fastify error:', err);
    res.status(500).json({ error: 'Internal Server Error 1' });
  }
}
