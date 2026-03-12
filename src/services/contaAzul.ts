import axios from 'axios';
import { createClient } from 'redis';

const KV_KEY = 'conta_azul_tokens';

let currentAccessToken: string | null = null;

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis (we'll do this lazily when needed)
let isRedisConnected = false;
async function ensureRedisConnection() {
  if (!isRedisConnected) {
    try {
      await redisClient.connect();
      isRedisConnected = true;
    } catch (e) {
      console.error('Failed to connect to Redis:', e);
    }
  }
}

async function getStoredRefreshToken(): Promise<string> {
  // 1. Tenta ler do Redis primeiro
  try {
    await ensureRedisConnection();
    const dataStr = await redisClient.get(KV_KEY);
    if (dataStr) {
      const data = JSON.parse(dataStr);
      if (data && data.refresh_token) {
        return data.refresh_token;
      }
    }
  } catch (e) {
    console.error('Erro ao ler tokens do Redis:', e);
  }
  
  // 2. Se não tiver no Redis, usa a variável de ambiente (primeiro uso)
  const envToken = process.env.CONTA_AZUL_REFRESH_TOKEN;
  if (!envToken) {
    throw new Error('Conta Azul credentials (REFRESH_TOKEN) are missing.');
  }
  return envToken;
}

async function saveTokens(accessToken: string, refreshToken: string) {
  currentAccessToken = accessToken;
  try {
    await ensureRedisConnection();
    await redisClient.set(KV_KEY, JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Erro ao salvar tokens no Redis:', e);
  }
}

async function refreshToken() {
  const CLIENT_ID = process.env.CONTA_AZUL_CLIENT_ID;
  const CLIENT_SECRET = process.env.CONTA_AZUL_CLIENT_SECRET;
  const REFRESH_TOKEN = await getStoredRefreshToken();

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Conta Azul credentials (CLIENT_ID, CLIENT_SECRET) are missing.');
  }

  const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post('https://auth.contaazul.com/oauth2/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      }).toString(), 
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);
    } else {
      currentAccessToken = response.data.access_token;
      // Se não veio refresh token novo, atualiza só o access token no KV mantendo o refresh antigo
      await saveTokens(response.data.access_token, REFRESH_TOKEN);
    }
    
    return currentAccessToken;
  } catch (error: any) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
}

async function request(method: string, url: string, params: any = {}) {
  // Tenta recuperar o access token do Redis se não estiver em memória
  if (!currentAccessToken) {
    try {
      await ensureRedisConnection();
      const dataStr = await redisClient.get(KV_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data && data.access_token) {
          currentAccessToken = data.access_token;
        } else {
          await refreshToken();
        }
      } else {
        await refreshToken();
      }
    } catch (e) {
      await refreshToken();
    }
  }

  try {
    const response = await axios({
      method,
      url: `https://api-v2.contaazul.com${url}`,
      params,
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`
      },
      paramsSerializer: {
        indexes: null // serializes arrays as status=RECEBIDO&status=PAGO instead of status[]=RECEBIDO
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.log('Token expired, refreshing...');
      const newAccessToken = await refreshToken();
      const response = await axios({
        method,
        url: `https://api-v2.contaazul.com${url}`,
        params,
        headers: {
          'Authorization': `Bearer ${newAccessToken}`
        },
        paramsSerializer: {
          indexes: null
        }
      });
      return response.data;
    }
    console.error(`Conta Azul API Error (${url}):`, error.response?.data || error.message);
    throw error;
  }
}

async function fetchAllPages(url: string, params: any = {}) {
  let allItems: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await request('GET', url, { ...params, pagina: page, tamanho_pagina: 50 });
    if (data.items) {
      allItems = allItems.concat(data.items);
      if (data.items.length < 50) {
        hasMore = false;
      } else {
        page++;
      }
    } else if (data.itens) {
      allItems = allItems.concat(data.itens);
      if (data.itens.length < 50) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allItems;
}

export async function getContasReceber(dataVencimentoDe: string, dataVencimentoAte: string) {
  return fetchAllPages('/v1/financeiro/eventos-financeiros/contas-a-receber/buscar', {
    data_vencimento_de: dataVencimentoDe,
    data_vencimento_ate: dataVencimentoAte,
    status: 'RECEBIDO'
  });
}

export async function getContasPagar(dataVencimentoDe: string, dataVencimentoAte: string) {
  return fetchAllPages('/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar', {
    data_vencimento_de: dataVencimentoDe,
    data_vencimento_ate: dataVencimentoAte,
    status: 'RECEBIDO'
  });
}
