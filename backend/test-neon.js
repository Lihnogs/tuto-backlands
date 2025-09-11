import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Testando conexão com Neon...');
console.log('URL (mascarada):', databaseUrl ? databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'Não encontrada');

if (!databaseUrl) {
  console.log('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

try {
  const sql = neon(databaseUrl);
  
  console.log('🔗 Tentando conectar...');
  const result = await sql`SELECT 1 as test, NOW() as timestamp`;
  
  console.log('✅ Conexão Neon estabelecida com sucesso!');
  console.log('📊 Resultado:', result);
  
} catch (error) {
  console.log('❌ Erro ao conectar com Neon:', error.message);
  console.log('\n🔧 Possíveis soluções:');
  console.log('1. Verifique se a URL está correta');
  console.log('2. Verifique se o projeto Neon está ativo');
  console.log('3. Verifique se a internet está funcionando');
  console.log('4. Tente acessar o dashboard do Neon');
}
