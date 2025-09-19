#!/usr/bin/env node

/**
 * Script para testar upload no Vercel
 * Execute: node test-upload-vercel.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuração
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');

// Criar imagem de teste se não existir
if (!fs.existsSync(TEST_IMAGE_PATH)) {
  console.log('📸 Criando imagem de teste...');
  // Criar um arquivo JPEG simples (1x1 pixel)
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0xFF, 0xD9
  ]);
  fs.writeFileSync(TEST_IMAGE_PATH, jpegHeader);
  console.log('✅ Imagem de teste criada');
}

async function testUpload() {
  try {
    console.log('🚀 Testando upload no Vercel...');
    console.log(`📍 URL: ${BASE_URL}`);

    // 1. Verificar se o servidor está rodando
    console.log('\n1️⃣ Verificando servidor...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Servidor não está rodando: ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    console.log('✅ Servidor OK:', health.status);

    // 2. Fazer login para obter token
    console.log('\n2️⃣ Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('⚠️ Login falhou, tentando registrar...');
      const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
      });

      if (!registerResponse.ok) {
        throw new Error('Falha ao registrar usuário');
      }
      console.log('✅ Usuário registrado');
    } else {
      console.log('✅ Login realizado');
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // 3. Testar upload
    console.log('\n3️⃣ Testando upload...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'test-image.jpg',
      contentType: 'image/jpeg'
    });

    const uploadResponse = await fetch(`${BASE_URL}/upload/profile-photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload falhou: ${uploadResponse.status} - ${error}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('✅ Upload realizado:', uploadData.message);
    console.log('🔗 URL do arquivo:', uploadData.avatar_url);

    // 4. Testar acesso ao arquivo
    console.log('\n4️⃣ Testando acesso ao arquivo...');
    const fileResponse = await fetch(uploadData.avatar_url);
    if (!fileResponse.ok) {
      throw new Error(`Falha ao acessar arquivo: ${fileResponse.status}`);
    }
    console.log('✅ Arquivo acessível');

    // 5. Testar endpoint de debug
    console.log('\n5️⃣ Testando endpoint de debug...');
    const debugResponse = await fetch(`${BASE_URL}/upload/debug/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug OK:', `${debugData.totalFiles} arquivo(s) em memória`);
    }

    console.log('\n🎉 Todos os testes passaram! Upload funcionando no Vercel.');

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    process.exit(1);
  }
}

// Verificar se form-data está disponível
try {
  require('form-data');
} catch (e) {
  console.log('📦 Instalando dependência form-data...');
  const { execSync } = require('child_process');
  execSync('npm install form-data', { stdio: 'inherit' });
}

testUpload();
