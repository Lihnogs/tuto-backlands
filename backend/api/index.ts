import { buildApp } from "../src/app.js";

let fastifyApp: any;

export default async function handler(req: any, res: any) {
  if (!fastifyApp) {
    fastifyApp = await buildApp();
    await fastifyApp.ready();
  }
  fastifyApp.server.emit("request", req, res);
}
