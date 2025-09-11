import { User } from '../models/User.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: Omit<User, 'password'>;
  }
  
  interface FastifyInstance {
    authenticate: any;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: Omit<User, 'password'>;
  }
}
