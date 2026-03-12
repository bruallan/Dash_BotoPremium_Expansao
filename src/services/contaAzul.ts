import axios from 'axios';
import { createClient } from 'redis';

const KV_KEY = 'conta_azul_tokens_v2';

let currentAccessToken: string | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

// Helper to run a redis command with a fresh client
async function withRedis<T>(operation: (client: any) => Promise<T>): Promise<T | null> {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set, skipping Redis operation');
    return null;
  }
  
  try {
    const client = createClient({ 
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 2000,
        timeout: 2000
      }
    });
    client.on('error', (err) => console.error('Redis Client Error', err));
    
    // Create a strict 3-second timeout for the entire Redis operation
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Redis operation timed out')), 3000);
    });

    const redisOp = async () => {
      await client.connect();
      const result = await operation(client);
      
      if (client.isOpen) {
        try { await client.disconnect(); } catch (e) {}
      }
      return result;
    };

    return await Promise.race([redisOp(), timeoutPromise]);
  } catch (e) {
    console.error('Redis operation failed:', e);
    return null;
  }
}

async function getStoredRefreshToken(): Promise<string> {
  // 1. Tenta ler do Redis primeiro
  try {
    const dataStr = await withRedis(async (client) => await client.get(KV_KEY));
    if (dataStr) {
      const data = JSON.parse(dataStr.toString());
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
    await withRedis(async (client) => {
      await client.set(KV_KEY, JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString()
      }));
    });
  } catch (e) {
    console.error('Erro ao salvar tokens no Redis:', e);
  }
}

async function refreshToken() {
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      const CLIENT_ID = process.env.CONTA_AZUL_CLIENT_ID;
      const CLIENT_SECRET = process.env.CONTA_AZUL_CLIENT_SECRET;
      const REFRESH_TOKEN = await getStoredRefreshToken();

      if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Conta Azul credentials (CLIENT_ID, CLIENT_SECRET) are missing.');
      }

      const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

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
      
      return currentAccessToken!;
    } catch (error: any) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw error;
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

async function request(method: string, url: string, params: any = {}) {
  // Tenta recuperar o access token do Redis se não estiver em memória
  if (!currentAccessToken) {
    try {
      const dataStr = await withRedis(async (client) => await client.get(KV_KEY));
      if (dataStr) {
        const data = JSON.parse(dataStr.toString());
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
  const BATCH_SIZE = 20; // Fetch 20 pages at a time

  while (hasMore) {
    const promises = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      promises.push(request('GET', url, { ...params, pagina: page + i, tamanho_pagina: 100 }).catch(e => {
        console.error(`Error fetching page ${page + i}:`, e.response?.data || e.message);
        // If it's the very first page, throw the error so the caller knows the API failed completely
        if (page === 1 && i === 0) {
          throw e;
        }
        return { items: [] }; // Return empty on error to not break the whole batch
      }));
    }
    
    const results = await Promise.all(promises);
    
    for (const data of results) {
      const items = data.items || data.itens || [];
      allItems = allItems.concat(items);
      
      if (items.length < 100) {
        hasMore = false;
        break;
      }
    }
    
    if (hasMore) {
      page += BATCH_SIZE;
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
