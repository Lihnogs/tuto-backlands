import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/app.js';

let fastifyApp: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!fastifyApp) {
      console.log("⚡ Inicializando Fastify app...");
      fastifyApp = await buildApp();
      await fastifyApp.ready();
      console.log("✅ Fastify pronto!");
    }

    fastifyApp.server.emit('request', req, res);
  } catch (err: any) {
    console.error("🔥 Fastify error:", err);

    res.status(500).json({
      error: "Internal Server Error 2",
      message: err?.message,
      stack: err?.stack
    });
  }
}
