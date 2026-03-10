import axios from 'axios';

let currentAccessToken: string | null = null;

async function refreshToken() {
  const CLIENT_ID = process.env.CONTA_AZUL_CLIENT_ID;
  const CLIENT_SECRET = process.env.CONTA_AZUL_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.CONTA_AZUL_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('Conta Azul credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) are missing in environment variables.');
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

    currentAccessToken = response.data.access_token;
    return currentAccessToken;
  } catch (error: any) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
}

async function request(method: string, url: string, params: any = {}) {
  if (!currentAccessToken) {
    await refreshToken();
  }

  try {
    const response = await axios({
      method,
      url: `https://api-v2.contaazul.com${url}`,
      params,
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`
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
        }
      });
      return response.data;
    }
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
    status: ['RECEBIDO']
  });
}

export async function getContasPagar(dataVencimentoDe: string, dataVencimentoAte: string) {
  return fetchAllPages('/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar', {
    data_vencimento_de: dataVencimentoDe,
    data_vencimento_ate: dataVencimentoAte,
    status: ['RECEBIDO'] // Note: For contas a pagar, RECEBIDO might mean PAGO or QUITADO. The API doc says status can be RECEBIDO for both? Let's use RECEBIDO as per doc: "Enum: PERDIDO, RECEBIDO, EM_ABERTO, RENEGOCIADO, RECEBIDO_PARCIAL, ATRASADO"
  });
}
