import axios from "axios";
import { createClient } from "redis";
import nodemailer from "nodemailer";

const KV_KEY = "conta_azul_tokens_v2";

let currentAccessToken: string | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

let redisClient: any = null;

async function getRedisClient() {
  if (redisClient && redisClient.isOpen) return redisClient;
  
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL not set, skipping Redis operation");
    return null;
  }

  try {
    console.log(`Attempting to connect to Redis at ${process.env.REDIS_URL?.substring(0, 15)}...`);
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 15000,
        reconnectStrategy: (retries) => {
          if (retries > 3) return new Error("Redis reconnection failed after 3 attempts");
          return 1000;
        }
      },
    });
    redisClient.on("error", (err: any) => console.error("Redis Client Error", err));
    await redisClient.connect();
    console.log("Redis connected successfully");
    return redisClient;
  } catch (e) {
    console.error("CRITICAL: Failed to connect to Redis:", e);
    redisClient = null;
    return null;
  }
}

// Helper to run a redis command
async function withRedis<T>(
  operation: (client: any) => Promise<T>,
): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    // Increased timeout to 60 seconds as per user request to "wait"
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error("Redis operation timed out after 60s")), 60000);
    });

    return await Promise.race([operation(client), timeoutPromise]) as T;
  } catch (e) {
    console.error("Redis operation failed:", e);
    return null;
  }
}

export async function getStoredTokens(): Promise<{ access_token?: string; refresh_token?: string } | null> {
  try {
    // Tenta ler a chave antiga e a nova para garantir compatibilidade
    let dataStr = await withRedis(async (client) => await client.get("conta_azul_tokens_v2"));
    
    if (!dataStr) {
      dataStr = await withRedis(async (client) => await client.get("conta_azul_tokens"));
    }

    if (dataStr) {
      const data = JSON.parse(dataStr.toString());
      
      // Se os dados vierem aninhados dentro de uma propriedade "conta_azul_tokens" (como no seu print)
      const tokenData = data.conta_azul_tokens ? data.conta_azul_tokens : data;

      if (tokenData && (tokenData.access_token || tokenData.refresh_token)) {
        return tokenData;
      }
    }
  } catch (e) {
    console.error("Erro ao ler tokens do Redis:", e);
  }
  return null;
}

async function getStoredRefreshToken(): Promise<string> {
  const tokens = await getStoredTokens();
  // 1. Tenta pegar o Refresh Token do Redis primeiro
  if (tokens && tokens.refresh_token) return tokens.refresh_token;

  // 2. Fallback: Se não tem no Redis, pega da Variável de Ambiente
  const envToken = process.env.CONTA_AZUL_REFRESH_TOKEN;
  if (!envToken) {
    throw new Error("Conta Azul credentials (REFRESH_TOKEN) are missing.");
  }
  return envToken;
}

async function sendEmailNotification(accessToken: string, refreshToken: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'brunoallan004@gmail.com',
        pass: process.env.EMAIL_PASS || 'lfwp wmnp vssr ewtm'
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'brunoallan004@gmail.com',
      to: process.env.EMAIL_TO || 'mr.allanbruno@gmail.com',
      subject: '⚠️ CONTA AZUL - TOKENS ATUALIZADOS',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #e67e22;">Tokens do Conta Azul Atualizados</h2>
          <p>Os tokens foram renovados com sucesso e salvos no banco de dados.</p>
          <hr />
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <p><strong>Novo Refresh Token:</strong> <br />
             <code style="background: #f4f4f4; padding: 5px; display: block; margin-top: 5px; word-break: break-all;">${refreshToken}</code>
          </p>
          <p><strong>Novo Access Token:</strong> <br />
             <code style="background: #f4f4f4; padding: 5px; display: block; margin-top: 5px; word-break: break-all;">${accessToken}</code>
          </p>
          <hr />
          <p style="font-size: 12px; color: #777;">Este é um log de segurança automático do seu Dashboard.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("Email notification sent successfully.");
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

async function saveTokens(accessToken: string, refreshToken: string) {
  currentAccessToken = accessToken;
  console.log("--------------------------------------------------");
  console.log("EMERGENCY TOKEN LOG - CONTA AZUL");
  console.log("NEW REFRESH TOKEN:", refreshToken);
  console.log("DATE:", new Date().toISOString());
  console.log("--------------------------------------------------");

  // Send email notification (don't block the main flow, but log if it fails)
  sendEmailNotification(accessToken, refreshToken).catch(console.error);

  let success = false;
  let attempts = 0;
  const maxAttempts = 5;

  while (!success && attempts < maxAttempts) {
    attempts++;
    try {
      success = await withRedis(async (client) => {
        await client.set(
          KV_KEY,
          JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            updated_at: new Date().toISOString(),
          }),
        );
        return true;
      }) || false;

      if (success) {
        console.log(`Tokens saved successfully to Redis on attempt ${attempts}.`);
      } else {
        console.error(`Attempt ${attempts}: Failed to save tokens to Redis. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      }
    } catch (e) {
      console.error(`Attempt ${attempts}: Error saving tokens to Redis:`, e);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!success) {
    console.error("CRITICAL: FAILED TO SAVE TOKENS AFTER ALL ATTEMPTS.");
    // We already sent the email, so the user has the token there as a backup.
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
      const ENV_REFRESH_TOKEN = process.env.CONTA_AZUL_REFRESH_TOKEN;

      if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error("Conta Azul credentials (CLIENT_ID, CLIENT_SECRET) are missing.");
      }

      // 1. Busca os tokens no Redis
      const storedTokens = await getStoredTokens();
      
      // 2. Define qual Refresh Token usar: O do Redis (se existir) ou o da Variável de Ambiente (como fallback inicial)
      let tokenToUse = storedTokens?.refresh_token || ENV_REFRESH_TOKEN;
      let source = storedTokens ? "Redis" : "Environment Variable";

      if (!tokenToUse) {
        throw new Error("No refresh token available in Redis or Environment Variables.");
      }

      console.log(`Attempting to refresh token using ${source} (ends in ...${tokenToUse.slice(-4)})`);

      const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

      try {
        // 3. TENTA RENOVAR: Envia o Refresh Token para a API do Conta Azul
        const response = await axios.post(
          "https://auth.contaazul.com/oauth2/token",
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: tokenToUse,
          }).toString(),
          {
            timeout: 15000,
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        // 4. SUCESSO! A API devolveu um novo par de tokens.
        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token || tokenToUse;

        // 5. SALVA NO REDIS: Sobrescreve a chave com os novos tokens e envia o email.
        await saveTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      } catch (error: any) {
        // 6. FALHA NA RENOVAÇÃO! O Conta Azul recusou o Refresh Token.
        if (error.response?.data?.error === "invalid_grant") {
          console.log("invalid_grant detected. Checking for alternatives...");

          // 7. RESGATE A (Concorrência): Outra instância já renovou enquanto tentávamos?
          const latestTokens = await getStoredTokens();
          if (latestTokens && latestTokens.refresh_token !== tokenToUse) {
            console.log("Confirmed: Another instance refreshed the token. Using the new one from Redis.");
            return latestTokens.access_token;
          }

          // 8. RESGATE B (Variável de Ambiente): O token que falhou era o do Redis? A variável de ambiente é diferente?
          if (ENV_REFRESH_TOKEN && ENV_REFRESH_TOKEN !== tokenToUse) {
            console.log(`Redis token failed, but Environment Variable is different. Attempting RESCUE with Env Var (...${ENV_REFRESH_TOKEN.slice(-4)})`);
            
            try {
              // 9. TENTA RENOVAR COM A VARIÁVEL DE AMBIENTE
              const rescueResponse = await axios.post(
                "https://auth.contaazul.com/oauth2/token",
                new URLSearchParams({
                  grant_type: "refresh_token",
                  refresh_token: ENV_REFRESH_TOKEN,
                }).toString(),
                {
                  timeout: 15000,
                  headers: {
                    Authorization: `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                },
              );

              // 10. SUCESSO NO RESGATE! Salva no Redis e devolve o novo Access Token.
              const resAccessToken = rescueResponse.data.access_token;
              const resRefreshToken = rescueResponse.data.refresh_token || ENV_REFRESH_TOKEN;

              await saveTokens(resAccessToken, resRefreshToken);
              return resAccessToken;
            } catch (rescueError: any) {
              console.error("Rescue attempt with ENV_REFRESH_TOKEN also failed:", rescueError.response?.data || rescueError.message);
              // 11. FALHA TOTAL: Nem o Redis nem a Variável de Ambiente funcionaram. (Cai no throw abaixo).
            }
          }
        }
        // Lança o erro invalid_grant para o console e para a interface.
        throw error;
      }
    } catch (error: any) {
      console.error("Error refreshing token:", error.response?.data || error.message);
      throw error;
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

async function request(
  method: string,
  url: string,
  params: any = {},
  signal?: AbortSignal,
) {
  // 1. SEMPRE busca os tokens mais recentes do Redis ANTES de qualquer requisição.
  // Isso garante que se outra instância atualizou, nós usamos o novo.
  let tokens = await getStoredTokens();
  let activeAccessToken = tokens?.access_token;

  // 2. Se não achou NENHUM access_token no Redis (ex: primeira vez rodando ou chave deletada)
  if (!activeAccessToken) {
    console.log("No access token found in Redis, attempting to refresh...");
    // Vai direto para a função de gerar um novo par (que usa o refresh_token)
    activeAccessToken = await refreshToken();
  }

  try {
    // 3. TENTA FAZER A REQUISIÇÃO COM O ACCESS TOKEN ATUAL
    const response = await axios({
      method,
      url: `https://api-v2.contaazul.com${url}`,
      params,
      timeout: 8000, // Timeout de 8 segundos para não travar a Vercel
      signal,
      headers: {
        Authorization: `Bearer ${activeAccessToken}`,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    // 4. SUCESSO! Retorna os dados. (O Refresh Token NÃO foi usado nem tocado).
    return response.data;
  } catch (error: any) {
    // 5. FALHA! A API retornou erro. Foi erro 401 (Token Expirado)?
    if (error.response && error.response.status === 401) {
      console.log("Token expired (401), refreshing...");
      
      // 6. CHAMA A RENOVAÇÃO: O Access Token morreu. Vamos usar o Refresh Token.
      const newAccessToken = await refreshToken();
      
      if (!newAccessToken) {
        throw new Error("Failed to get a new access token after 401.");
      }

      // 7. RE-TENTA A REQUISIÇÃO COM O NOVO ACCESS TOKEN
      const response = await axios({
        method,
        url: `https://api-v2.contaazul.com${url}`,
        params,
        timeout: 8000,
        signal,
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
        },
        paramsSerializer: {
          indexes: null,
        },
      });
      return response.data;
    }
    
    // Se foi outro erro (ex: 500, 404), apenas lança o erro.
    console.error(
      `Conta Azul API Error (${url}):`,
      error.response?.data || error.message,
    );
    throw error;
  }
}

async function fetchAllPages(
  url: string,
  params: any = {},
  signal?: AbortSignal,
) {
  let allItems: any[] = [];
  const TAMANHO_PAGINA = 50;

  try {
    // 1. Busca a primeira página para descobrir o total de itens
    const firstPageData = await request(
      "GET",
      url,
      { ...params, pagina: 1, tamanho_pagina: TAMANHO_PAGINA },
      signal,
    );

    const items = firstPageData.items || firstPageData.itens || [];
    allItems = allItems.concat(items);

    const totalItems = firstPageData.itens_totais || 0;
    let totalPages = Math.ceil(totalItems / TAMANHO_PAGINA);

    // TRAVA DE SEGURANÇA VERCEL: 
    // Limitamos a no máximo 12 páginas (600 itens) por requisição.
    // Isso garante que o tempo total de processamento não passe de ~8 segundos (Vercel corta em 10s).
    if (totalPages > 12) {
      console.warn(`Limitando paginação de ${totalPages} para 12 páginas para evitar timeout da Vercel.`);
      totalPages = 12;
    }

    if (totalPages > 1) {
      const remainingPages = [];
      for (let p = 2; p <= totalPages; p++) {
        remainingPages.push(p);
      }

      // Lotes de 4 requisições. Como Receber e Pagar rodam em paralelo, 
      // teremos no máximo 8 requisições simultâneas (limite da API é 10/seg)
      const CHUNK_SIZE = 4;
      
      for (let i = 0; i < remainingPages.length; i += CHUNK_SIZE) {
        // Espera 1 segundo ANTES de cada lote para resetar a janela de rate limit do Conta Azul
        await new Promise(resolve => setTimeout(resolve, 1000));

        const chunk = remainingPages.slice(i, i + CHUNK_SIZE);
        
        const chunkPromises = chunk.map(page => 
          request(
            "GET",
            url,
            { ...params, pagina: page, tamanho_pagina: TAMANHO_PAGINA },
            signal,
          ).catch(e => {
            console.error(`Erro na página ${page}:`, e.message);
            return { items: [] }; // Retorna vazio para não quebrar o Promise.all
          })
        );

        const chunkResults = await Promise.all(chunkPromises);
        
        for (const data of chunkResults) {
          const chunkItems = data.items || data.itens || [];
          allItems = allItems.concat(chunkItems);
        }
      }
    }
  } catch (e: any) {
    console.error(`Error fetching pages for ${url}:`, e.response?.data || e.message);
    throw e;
  }

  return allItems;
}

export async function getContasReceber(
  dataVencimentoDe: string,
  dataVencimentoAte: string,
  signal?: AbortSignal,
) {
  const de = dataVencimentoDe.split('T')[0];
  const ate = dataVencimentoAte.split('T')[0];

  return fetchAllPages(
    "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
    {
      data_vencimento_de: de,
      data_vencimento_ate: ate,
      status: "RECEBIDO",
    },
    signal,
  );
}

export async function getContasPagar(
  dataVencimentoDe: string,
  dataVencimentoAte: string,
  signal?: AbortSignal,
) {
  const de = dataVencimentoDe.split('T')[0];
  const ate = dataVencimentoAte.split('T')[0];

  return fetchAllPages(
    "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
    {
      data_vencimento_de: de,
      data_vencimento_ate: ate,
      status: "RECEBIDO",
    },
    signal,
  );
}

export async function getContasReceberPage(
  dataVencimentoDe: string,
  dataVencimentoAte: string,
  page: number,
  signal?: AbortSignal,
) {
  const de = dataVencimentoDe.split('T')[0];
  const ate = dataVencimentoAte.split('T')[0];

  return request(
    "GET",
    "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
    {
      data_vencimento_de: de,
      data_vencimento_ate: ate,
      status: "RECEBIDO",
      pagina: page,
      tamanho_pagina: 50
    },
    signal,
  );
}

export async function getContasPagarPage(
  dataVencimentoDe: string,
  dataVencimentoAte: string,
  page: number,
  signal?: AbortSignal,
) {
  const de = dataVencimentoDe.split('T')[0];
  const ate = dataVencimentoAte.split('T')[0];

  return request(
    "GET",
    "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
    {
      data_vencimento_de: de,
      data_vencimento_ate: ate,
      status: "RECEBIDO",
      pagina: page,
      tamanho_pagina: 50
    },
    signal,
  );
}
