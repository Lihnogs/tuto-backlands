export const swaggerOptions = {
  swagger: {
    info: {
      title: 'Code Tutor API',
      description: 'API completa para a plataforma Code Tutor',
      version: '1.0.0',
      contact: {
        name: 'Code Tutor Team',
        email: 'support@codetutor.com',
      },
    },
    host: process.env.API_HOST || 'localhost:3000',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey' as const,
        name: 'Authorization',
        in: 'header' as const,
        description: 'JWT token no formato: Bearer <token>',
      },
    },
    tags: [
      {
        name: 'auth',
        description: 'Endpoints de autenticação',
      },
      {
        name: 'users',
        description: 'Gerenciamento de usuários',
      },
      {
        name: 'chat',
        description: 'Sistema de chat',
      },
      {
        name: 'code-analysis',
        description: 'Análise de código',
      },
    ],
  },
};

export const swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full' as const,
    deepLinking: false,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
  uiHooks: {
    onRequest: function (_request: any, _reply: any, next: any) {
      next();
    },
    preHandler: function (_request: any, _reply: any, next: any) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header: string) => header,
  transformSpecification: (swaggerObject: any, _request: any, _reply: any) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
};
