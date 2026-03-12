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
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        timeout: 10000,
      },
    });
    redisClient.on("error", (err: any) => console.error("Redis Client Error", err));
    await redisClient.connect();
    return redisClient;
  } catch (e) {
    console.error("Failed to connect to Redis:", e);
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

async function getStoredTokens(): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const dataStr = await withRedis(async (client) => await client.get(KV_KEY));
    if (dataStr) {
      const data = JSON.parse(dataStr.toString());
      if (data && data.access_token && data.refresh_token) {
        return data;
      }
    }
  } catch (e) {
    console.error("Erro ao ler tokens do Redis:", e);
  }
  return null;
}

async function getStoredRefreshToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (tokens) return tokens.refresh_token;

  // Fallback to environment variable (first use)
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

      // 1. Get the current token from Redis
      const storedTokens = await getStoredTokens();
      let tokenToUse = storedTokens?.refresh_token || ENV_REFRESH_TOKEN;
      let source = storedTokens ? "Redis" : "Environment Variable";

      if (!tokenToUse) {
        throw new Error("No refresh token available in Redis or Environment Variables.");
      }

      console.log(`Attempting to refresh token using ${source} (ends in ...${tokenToUse.slice(-4)})`);

      const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

      try {
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

        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token || tokenToUse;

        await saveTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      } catch (error: any) {
        if (error.response?.data?.error === "invalid_grant") {
          console.log("invalid_grant detected. Checking for alternatives...");

          // Alternative A: Did another instance refresh it already?
          const latestTokens = await getStoredTokens();
          if (latestTokens && latestTokens.refresh_token !== tokenToUse) {
            console.log("Confirmed: Another instance refreshed the token. Using the new one from Redis.");
            return latestTokens.access_token;
          }

          // Alternative B: Is the Environment Variable different and potentially newer?
          if (ENV_REFRESH_TOKEN && ENV_REFRESH_TOKEN !== tokenToUse) {
            console.log(`Redis token failed, but Environment Variable is different. Attempting RESCUE with Env Var (...${ENV_REFRESH_TOKEN.slice(-4)})`);
            
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

            const resAccessToken = rescueResponse.data.access_token;
            const resRefreshToken = rescueResponse.data.refresh_token || ENV_REFRESH_TOKEN;

            await saveTokens(resAccessToken, resRefreshToken);
            return resAccessToken;
          }
        }
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
  // ALWAYS fetch the latest tokens from Redis before any request
  // This ensures synchronization across multiple systems/instances
  let tokens = await getStoredTokens();
  let activeAccessToken = tokens?.access_token;

  if (!activeAccessToken) {
    console.log("No access token found in Redis, attempting to refresh...");
    activeAccessToken = await refreshToken();
  }

  try {
    const response = await axios({
      method,
      url: `https://api-v2.contaazul.com${url}`,
      params,
      timeout: 8000, // 8 seconds timeout
      signal,
      headers: {
        Authorization: `Bearer ${activeAccessToken}`,
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.log("Token expired (401), refreshing...");
      const newAccessToken = await refreshToken();
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
  let page = 1;
  let hasMore = true;
  const BATCH_SIZE = 20; // Fetch 20 pages at a time

  while (hasMore) {
    const promises = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      promises.push(
        request(
          "GET",
          url,
          { ...params, pagina: page + i, tamanho_pagina: 100 },
          signal,
        ).catch((e) => {
          console.error(
            `Error fetching page ${page + i}:`,
            e.response?.data || e.message,
          );
          // If it's the very first page, throw the error so the caller knows the API failed completely
          if (page === 1 && i === 0) {
            throw e;
          }
          return { items: [] }; // Return empty on error to not break the whole batch
        }),
      );
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

export async function getContasReceber(
  dataVencimentoDe: string,
  dataVencimentoAte: string,
  signal?: AbortSignal,
) {
  return fetchAllPages(
    "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
    {
      data_vencimento_de: dataVencimentoDe,
      data_vencimento_ate: dataVencimentoAte,
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
  return fetchAllPages(
    "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
    {
      data_vencimento_de: dataVencimentoDe,
      data_vencimento_ate: dataVencimentoAte,
      status: "PAGO", // Fixed status from RECEBIDO to PAGO
    },
    signal,
  );
}
