# Correção de Upload para Vercel

## Problema Identificado
O Vercel é um ambiente **serverless** e **read-only**, ou seja, não permite:
- Criar pastas no sistema de arquivos
- Escrever arquivos no disco
- Acessar o sistema de arquivos para escrita

## Solução Implementada

### 1. Armazenamento em Memória
- Criado `src/routes/upload-simple.ts` que usa `Map` para armazenar arquivos na memória
- Arquivos são armazenados temporariamente (1 hora)
- Limpeza automática de arquivos expirados

### 2. Limitações da Solução
- **Tamanho máximo**: 2MB (limitação do Vercel)
- **Duração**: Arquivos expiram em 1 hora
- **Memória**: Limitado pela memória disponível do container

### 3. Como Usar

#### Upload de Foto de Perfil
```bash
POST /upload/profile-photo
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Body: arquivo de imagem
```

#### Acessar Arquivo
```bash
GET /upload/uploads/{filename}
```

#### Debug (listar arquivos)
```bash
GET /upload/debug/files
Authorization: Bearer <token>
```

### 4. Configurações do Vercel
- Atualizado `vercel.json` com `maxDuration: 30` segundos
- Configurado para funcionar com ambiente serverless

## Próximos Passos (Recomendados)

Para uma solução mais robusta em produção, considere:

1. **Vercel Blob Storage** (nativo do Vercel)
2. **Cloudinary** (especializado em imagens)
3. **AWS S3** (armazenamento escalável)
4. **Supabase Storage** (se usando Supabase)

## Testando

1. Faça deploy no Vercel
2. Teste o upload com um arquivo pequeno (< 2MB)
3. Verifique se a URL gerada funciona
4. Confirme que o arquivo aparece no endpoint de debug

## Notas Importantes

- Esta solução é temporária e adequada para desenvolvimento/testes
- Para produção, implemente um serviço de armazenamento externo
- Os arquivos são perdidos quando o container é reiniciado
- Considere implementar cache/CDN para melhor performance
