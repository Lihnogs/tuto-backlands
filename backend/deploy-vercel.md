# 🚀 Deploy do Backend na Vercel

## 📋 Pré-requisitos

1. Conta na Vercel (vercel.com)
2. Repositório no GitHub
3. Variáveis de ambiente configuradas

## 🔧 Passos para Deploy

### 1. Preparar o Projeto

```bash
# Instalar dependências
npm install

# Build do projeto
npm run build
```

### 2. Criar Projeto na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe o repositório do GitHub
4. Configure:
   - **Framework Preset**: Node.js
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Configurar Variáveis de Ambiente

Na Vercel, vá em **Settings > Environment Variables** e adicione:

```
DATABASE_URL=postgresql://seu-usuario:sua-senha@seu-host/neondb?sslmode=require
JWT_SECRET=sua-chave-super-secreta-para-producao
NODE_ENV=production
```

### 4. Deploy

1. Clique em "Deploy"
2. Aguarde o build completar
3. Copie a URL gerada (ex: `https://seu-backend.vercel.app`)

### 5. Atualizar Frontend

No arquivo `frontend/.env.local`:

```
VITE_API_URL=https://seu-backend.vercel.app/api
```

## 🔍 Testando o Deploy

1. Acesse: `https://seu-backend.vercel.app/health`
2. Deve retornar: `{"status":"ok","timestamp":"..."}`

## 🐛 Troubleshooting

### Erro de Build
- Verifique se todas as dependências estão no `package.json`
- Confirme se o TypeScript está configurado corretamente

### Erro de Conexão com Banco
- Verifique se a `DATABASE_URL` está correta
- Confirme se o Neon está ativo

### Erro de CORS
- O backend já está configurado para aceitar todas as origens
- Se necessário, ajuste em `src/index.ts`
