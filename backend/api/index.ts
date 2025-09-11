import fastifyApp from "../src/index";

// Handler para Vercel (converte Fastify em função serverless)
export default async function handler(req: any, res: any) {
  await fastifyApp.ready(); // garante que o app inicializou
  fastifyApp.server.emit('request', req, res);
}
