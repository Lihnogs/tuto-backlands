#!/bin/bash

echo "🚀 Preparando deploy do backend para Vercel..."

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 2. Build do projeto
echo "🔨 Fazendo build do projeto..."
npm run build

# 3. Verificar se o build foi gerado
if [ -f "dist/index.js" ]; then
    echo "✅ Build gerado com sucesso!"
    echo "📁 Arquivos gerados em dist/:"
    ls -la dist/
else
    echo "❌ Erro: Build não foi gerado"
    exit 1
fi

echo ""
echo "🎉 Backend pronto para deploy!"
echo ""
echo "📋 Próximos passos:"
echo "1. Acesse https://vercel.com"
echo "2. Crie um novo projeto"
echo "3. Configure:"
echo "   - Framework: Node.js"
echo "   - Root Directory: backend"
echo "   - Build Command: npm run build"
echo "   - Output Directory: dist"
echo "4. Configure as variáveis de ambiente:"
echo "   - DATABASE_URL"
echo "   - JWT_SECRET"
echo "   - NODE_ENV=production"
echo "5. Deploy!"
echo ""
echo "🔗 Após o deploy, atualize o frontend/.env.local com a URL do backend"
