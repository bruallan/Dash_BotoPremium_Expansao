import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

const CLIENT_ID = process.env.CONTA_AZUL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.CONTA_AZUL_CLIENT_SECRET || "";

// Em ambientes serverless (como Vercel), apenas a pasta /tmp tem permissão de escrita
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const TOKENS_FILE = isVercel 
  ? path.join('/tmp', 'tokens.json') 
  : path.resolve(process.cwd(), 'tokens.json');

let tokens: any = null;

function loadTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
    tokens = JSON.parse(data);
  } else if (process.env.CONTA_AZUL_REFRESH_TOKEN) {
    // Fallback inicial caso o arquivo não exista, usando a variável de ambiente
    tokens = { refresh_token: process.env.CONTA_AZUL_REFRESH_TOKEN };
  }
}

function saveTokens(newTokens: any) {
  tokens = { ...tokens, ...newTokens };
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

async function refreshToken() {
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available');
  }

  const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post('https://auth.contaazul.com/oauth2/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }).toString(), 
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    saveTokens(response.data);
    return response.data.access_token;
  } catch (error: any) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
}

async function request(method: string, url: string, params: any = {}) {
  if (!tokens) loadTokens();

  try {
    const response = await axios({
      method,
      url: `https://api-v2.contaazul.com${url}`,
      params,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
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
