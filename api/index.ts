
import cron from 'node-cron';
import axios from "axios";
import nodemailer from "nodemailer";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

let db: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized successfully");
  } else {
    console.warn("firebase-applet-config.json not found, Firebase features will fail.");
  }
} catch (e) {
  console.error("Error initializing Firebase:", e);
}


const ID_FUNIL_EXPANSAO_P9 = "657b4ecdeea6360013316120";

async function fetchAllDeals(url: string, signal?: AbortSignal) {
  let deals: any[] = [];
  let total = 0;

  try {
    const firstData = await axios.get(`${url}&limit=200&page=1`, {
      timeout: 8000,
      signal,
    });
    deals = firstData.data.deals || [];
    total = firstData.data.total || 0;

    if (total > 200) {
      const totalPages = Math.ceil(total / 200);
      const BATCH_SIZE = 20;

      for (let i = 2; i <= totalPages; i += BATCH_SIZE) {
        const promises = [];
        for (let j = 0; j < BATCH_SIZE && i + j <= totalPages; j++) {
          promises.push(
            axios
              .get(`${url}&limit=200&page=${i + j}`, { timeout: 8000, signal })
              .catch((e) => {
                console.error(`Error fetching page ${i + j}:`, e.message);
                return { data: { deals: [] } };
              }),
          );
        }

        const results = await Promise.all(promises);
        results.forEach((res) => {
          if (res.data && res.data.deals) deals.push(...res.data.deals);
        });
      }
    }
  } catch (error) {
    console.error("Error fetching deals:", error);
    throw error; // Throw to caller so it can be logged in debug
  }

  return { deals, total };
}

export async function getDashboardData(
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
) {
  const RD_TOKEN = process.env.RD_CRM_TOKEN;
  if (!RD_TOKEN) {
    console.warn("RD_CRM_TOKEN not configured. Returning empty data.");
    return {
      leads_totais: 0,
      leads_ativos: 0,
      vendas: {
        quantidade: 0,
        vendas_ano: 0,
        lista: [],
      },
      funil: [],
      kanban: {},
      time: {},
    };
  }

  const start = startDate ? `${startDate}T00:00:00` : null;
  const end = endDate ? `${endDate}T23:59:59` : null;
  const currentYear = new Date().getFullYear();
  const startYear = `${currentYear}-01-01T00:00:00`;
  const endYear = `${currentYear}-12-31T23:59:59`;

  let urlVendasPeriodo = `https://crm.rdstation.com/api/v1/deals?token=${RD_TOKEN}&win=true&deal_pipeline_id=${ID_FUNIL_EXPANSAO_P9}`;
  let urlAtivos = `https://crm.rdstation.com/api/v1/deals?token=${RD_TOKEN}&win=null&deal_pipeline_id=${ID_FUNIL_EXPANSAO_P9}`;
  let urlTodosCriados = `https://crm.rdstation.com/api/v1/deals?token=${RD_TOKEN}&deal_pipeline_id=${ID_FUNIL_EXPANSAO_P9}`;
  let urlLeadsGlobaisPeriodo = `https://crm.rdstation.com/api/v1/deals?token=${RD_TOKEN}&deal_pipeline_id=${ID_FUNIL_EXPANSAO_P9}&limit=1`;
  const urlVendasAno = `https://crm.rdstation.com/api/v1/deals?token=${RD_TOKEN}&win=true&deal_pipeline_id=${ID_FUNIL_EXPANSAO_P9}&closed_at_period=true&start_date=${startYear}&end_date=${endYear}&limit=1`;

  if (start && end) {
    urlVendasPeriodo += `&closed_at_period=true&start_date=${start}&end_date=${end}`;
    urlLeadsGlobaisPeriodo += `&created_at_period=true&start_date=${start}&end_date=${end}`;
    urlAtivos += `&created_at_period=true&start_date=${start}&end_date=${end}`;
    urlTodosCriados += `&created_at_period=true&start_date=${start}&end_date=${end}`;
  }

  const [dataVendasPeriodo, dataAtivos, dataTodosCriados, resLeadsGlobais, resVendasAno] =
    await Promise.all([
      fetchAllDeals(urlVendasPeriodo, signal),
      fetchAllDeals(urlAtivos, signal),
      fetchAllDeals(urlTodosCriados, signal),
      axios
        .get(urlLeadsGlobaisPeriodo, { timeout: 8000, signal })
        .catch(() => ({ data: { total: 0 } })),
      axios
        .get(urlVendasAno, { timeout: 8000, signal })
        .catch(() => ({ data: { total: 0 } })),
    ]);

  const dealsVendasPeriodo = dataVendasPeriodo.deals;
  const dealsAtivos = dataAtivos.deals;
  const dealsTodosCriados = dataTodosCriados.deals;

  const qtd_vendas = dataVendasPeriodo.total;
  const leads_ativos = dataAtivos.total;
  const leads_totais_periodo = resLeadsGlobais.data.total;
  const qtd_vendas_ano = resVendasAno.data.total;

  const timeStats: Record<string, any> = {};
  
  // Map to store user names
  const userNames: Record<string, string> = {};

  // Count everything locally from the fetched deals
  dealsTodosCriados.forEach((d: any) => {
    const userId = d.user?.id;
    const userName = d.user?.name;
    if (userId && userName) {
      userNames[userId] = userName;
      if (!timeStats[userName]) timeStats[userName] = { leads: 0, vendas: 0 };
      timeStats[userName].leads++;
    }
  });

  dealsVendasPeriodo.forEach((d: any) => {
    const userId = d.user?.id;
    const userName = d.user?.name || userNames[userId];
    if (userId && userName) {
      if (!timeStats[userName]) timeStats[userName] = { leads: 0, vendas: 0 };
      timeStats[userName].vendas++;
    }
  });

  const kanbanDeals: Record<string, any[]> = {};
  const stageCounts: Record<string, number> = {};

  dealsAtivos.forEach((deal: any) => {
    const stageId = deal.deal_stage?.id;
    if (stageId) {
      stageCounts[stageId] = (stageCounts[stageId] || 0) + 1;
      if (!kanbanDeals[stageId]) kanbanDeals[stageId] = [];
      kanbanDeals[stageId].push({
        id: deal.id,
        name: deal.name,
        user: deal.user?.name,
        value: deal.amount_total || 0,
      });
    }
  });

  const FUNIL_MAP = [
    { id: "657b4ecdeea6360013316121", name: "🌟 Novo lead", order: 1 },
    { id: "657b4ecdeea6360013316122", name: "❗️Tentativas diárias", order: 2 },
    { id: "657b4ecdeea6360013316123", name: "❗️Tentat. semanais", order: 3 },
    { id: "67c0b028353df500149a1f02", name: "♻️ Reengajou", order: 4 },
    { id: "657b4ecdeea6360013316124", name: "✅ Contato resp.", order: 5 },
    { id: "657b4ecdeea6360013316125", name: "☑️ Reunião Agend.", order: 6 },
    { id: "657b5836030b7e00128d8470", name: "⚠️ Reagendar", order: 7 },
    { id: "657b586009accd00184146ed", name: "✅ Reunião feita", order: 8 },
    { id: "657b587aa75f300014fe3162", name: "💰 Negociação", order: 9 },
    { id: "67a1ee3d732a8a002774576b", name: "📝 COF Assinada", order: 10 },
    { id: "657b58f4c033fc000d31f882", name: "🚀 Contrato", order: 11 },
  ];

  const funilOrdenado = FUNIL_MAP.map((stage) => {
    let count = stageCounts[stage.id] || 0;
    if (stage.id === "657b58f4c033fc000d31f882") count = qtd_vendas;
    return {
      id: stage.id,
      label: stage.name,
      value: count,
      order: stage.order,
    };
  });

  return {
    leads_totais: leads_totais_periodo,
    leads_ativos: leads_ativos,
    vendas: {
      quantidade: qtd_vendas,
      vendas_ano: qtd_vendas_ano,
      lista: dealsVendasPeriodo.map((v: any) => ({
        _id: v.id,
        name: v.name,
        closed_at: v.closed_at,
        amount_total: v.amount_total,
      })),
    },
    funil: funilOrdenado,
    kanban: kanbanDeals,
    time: timeStats,
  };
}

export async function getDealHistory(deal_id: string) {
  const RD_TOKEN = process.env.RD_CRM_TOKEN;
  if (!RD_TOKEN) {
    console.warn("RD_CRM_TOKEN not configured. Returning empty timeline.");
    return [];
  }

  const [dealData, activitiesData, tasksData] = await Promise.all([
    axios
      .get(
        `https://crm.rdstation.com/api/v1/deals/${deal_id}?token=${RD_TOKEN}`,
        { timeout: 8000 },
      )
      .then((res) => res.data),
    axios
      .get(
        `https://crm.rdstation.com/api/v1/activities?token=${RD_TOKEN}&deal_id=${deal_id}`,
        { timeout: 8000 },
      )
      .then((res) => res.data),
    axios
      .get(
        `https://crm.rdstation.com/api/v1/tasks?token=${RD_TOKEN}&deal_id=${deal_id}`,
        { timeout: 8000 },
      )
      .then((res) => res.data),
  ]);

  let timeline = [];

  if (dealData.created_at)
    timeline.push({
      id: "criacao",
      type: "criacao",
      date: dealData.created_at,
      title: "Negociação Criada",
      desc: "A negociação entrou no CRM.",
    });
  if (dealData.closed_at)
    timeline.push({
      id: "fechamento",
      type: "fechamento",
      date: dealData.closed_at,
      title: `Negociação ${dealData.win ? "Ganha" : "Perdida"}`,
      desc: `Finalizada em ${new Date(dealData.closed_at).toLocaleDateString("pt-BR")}`,
    });

  if (activitiesData.activities) {
    activitiesData.activities.forEach((act: any) => {
      if (act.activity_type === "NOTE" || act.text)
        timeline.push({
          id: act.id,
          type: "anotacao",
          date: act.date || act.created_at,
          title: "Anotação",
          desc: act.text,
        });
    });
  }

  if (tasksData.tasks) {
    tasksData.tasks.forEach((task: any) => {
      timeline.push({
        id: task.id,
        type: "tarefa",
        date: task.created_at,
        title: `Tarefa: ${task.subject}`,
        desc: `${task.notes || "Sem descrição."} ${task.finished ? "(Concluída)" : "(Pendente)"}`,
      });
    });
  }

  timeline.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return timeline;
}


const KV_KEY = "conta_azul_tokens_v2";

let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

export async function getStoredTokens(): Promise<{ access_token?: string; refresh_token?: string } | null> {
  if (!db) return null;

  try {
    const docSnap = await getDoc(doc(db, "tokens", "conta_azul"));
    if (docSnap.exists()) {
      const tokenData = docSnap.data();
      if (tokenData && (tokenData.access_token || tokenData.refresh_token)) {
        currentAccessToken = tokenData.access_token || currentAccessToken;
        currentRefreshToken = tokenData.refresh_token || currentRefreshToken;
        return tokenData as any;
      }
    }
  } catch (e) {
    console.error("Erro ao ler tokens do Firebase:", e);
  }
  
  // Fallback to local memory if Firebase fails
  if (currentAccessToken || currentRefreshToken) {
    console.log("Firebase read failed, returning tokens from local memory cache.");
    return {
      access_token: currentAccessToken || undefined,
      refresh_token: currentRefreshToken || undefined
    };
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
  currentRefreshToken = refreshToken;
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
      success = false;
      if (db) {
        try {
          await setDoc(doc(db, "tokens", "conta_azul"), {
            access_token: accessToken,
            refresh_token: refreshToken,
            updated_at: new Date().toISOString(),
          });
          success = true;
        } catch (dbErr) {
          console.error("Erro validando db Firebase:", dbErr);
        }
      }

      if (success) {
        console.log(`Tokens saved successfully to Firebase on attempt ${attempts}.`);
      } else {
        console.error(`Attempt ${attempts}: Failed to save tokens to Firebase. Retrying...`);
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

      // 1. Busca os tokens no Firebase
      const storedTokens = await getStoredTokens();
      
      // 2. Define qual Refresh Token usar: O do Firebase (se existir) ou o da Variável de Ambiente (como fallback inicial)
      let tokenToUse = storedTokens?.refresh_token || ENV_REFRESH_TOKEN;
      let source = storedTokens ? "Firebase" : "Environment Variable";

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
            console.log("Confirmed: Another instance refreshed the token. Using the new one from Firebase.");
            return latestTokens.access_token;
          }

          // 8. RESGATE B (Variável de Ambiente): O token que falhou era o do Firebase? A variável de ambiente é diferente?
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
              // 11. FALHA TOTAL: Nem o Firebase nem a Variável de Ambiente funcionaram. (Cai no throw abaixo).
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
      pagina: page,
      tamanho_pagina: 50
    },
    signal,
  );
}


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado para suportar o payload do calculate

// NOVO ENDPOINT DE DEBUG: Verifica variÃ¡veis de ambiente
app.get("/api/debug/raw-data", async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "Missing start or end" });
    }
    
    const [receberResult, pagarResult] = await Promise.allSettled([
      getContasReceber(start as string, end as string),
      getContasPagar(start as string, end as string)
    ]);

    res.json({
      receitas: receberResult.status === 'fulfilled' ? receberResult.value : { error: receberResult.reason },
      despesas: pagarResult.status === 'fulfilled' ? pagarResult.value : { error: pagarResult.reason }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/debug/env", (req, res) => {
  const mask = (val: string | undefined) => {
    if (!val) return "âŒ AUSENTE";
    if (val.length < 8) return "***";
    return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
  };

  res.json({
    success: true,
    env: {
      RD_CRM_TOKEN: mask(process.env.RD_CRM_TOKEN),
      CONTA_AZUL_CLIENT_ID: mask(process.env.CONTA_AZUL_CLIENT_ID),
      CONTA_AZUL_CLIENT_SECRET: mask(process.env.CONTA_AZUL_CLIENT_SECRET),
      CONTA_AZUL_REFRESH_TOKEN: mask(process.env.CONTA_AZUL_REFRESH_TOKEN),
      REDIS_URL: mask(process.env.REDIS_URL),
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL || "false"
    }
  });
});

// NOVO ENDPOINT DE DEBUG: Verifica o token atual
app.get("/api/debug/check-token", async (req, res) => {
  try {
    const tokens = await getStoredTokens();
    
    const maskToken = (token: string | undefined) => {
      if (!token) return "NÃƒO ENCONTRADO";
      if (token.length < 10) return token;
      return `${token.substring(0, 10)}...${token.substring(token.length - 4)}`;
    };

    res.json({
      success: true,
      data: {
        redis_access_token: maskToken(tokens?.access_token),
        redis_refresh_token: maskToken(tokens?.refresh_token),
        env_refresh_token: maskToken(process.env.CONTA_AZUL_REFRESH_TOKEN),
        raw_redis_data: tokens
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.all("/api/sync-data", async (req, res) => {
  try {
    const minDate = "2025-01-01";
    const maxDate = new Date().toISOString().split("T")[0]; // today

    // Fetch RD Station
    const rdData = await getDashboardData(minDate, maxDate);

    // Fetch Conta Azul (Receber e Pagar)
    const contasReceber = await getContasReceber(minDate, maxDate);
    const contasPagar = await getContasPagar(minDate, maxDate);

    // Save RD Data
    if (db) {
      await setDoc(doc(db, "cache", "rdData"), { data: rdData, updated_at: new Date().toISOString() });
      
      // Save CA chunked
      await setDoc(doc(db, "cache", "caReceber"), { data: contasReceber, updated_at: new Date().toISOString() });
      await setDoc(doc(db, "cache", "caPagar"), { data: contasPagar, updated_at: new Date().toISOString() });
    }

    res.json({ success: true, message: "Sincronização concluída com sucesso." });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
app.get("/api/data/rd", async (req, res) => {
  try {
    if (db) {
      const docSnap = await getDoc(doc(db, "cache", "rdData"));
      if (docSnap.exists()) {
        return res.json({ success: true, data: docSnap.data().data });
      }
    }
    const { startDate, endDate } = req.query;
    const minDate = "2025-01-01";
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split("T")[0];
    
    const rdData = await getDashboardData(queryStart as string, queryEnd as string);
    res.json({ success: true, data: rdData });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/data/ca-receber", async (req, res) => {
  try {
    const { startDate, endDate, page } = req.query;
    const pageNum = parseInt(page as string) || 1;

    if (db) {
      const docSnap = await getDoc(doc(db, "cache", "caReceber"));
      if (docSnap.exists()) {
         const fullData = docSnap.data().data;
         const start = (pageNum - 1) * 50;
         const pageItems = fullData.slice(start, start + 50);
         return res.json({ success: true, data: { items: pageItems, itens_totais: fullData.length } });
      }
    }
    const minDate = "2025-01-01";
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split("T")[0];
    
    const data = await getContasReceberPage(queryStart as string, queryEnd as string, pageNum);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/data/ca-pagar", async (req, res) => {
  try {
    const { startDate, endDate, page } = req.query;
    const pageNum = parseInt(page as string) || 1;

    if (db) {
      const docSnap = await getDoc(doc(db, "cache", "caPagar"));
      if (docSnap.exists()) {
         const fullData = docSnap.data().data;
         const start = (pageNum - 1) * 50;
         const pageItems = fullData.slice(start, start + 50);
         return res.json({ success: true, data: { items: pageItems, itens_totais: fullData.length } });
      }
    }
    const minDate = "2025-01-01";
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split("T")[0];
    
    const data = await getContasPagarPage(queryStart as string, queryEnd as string, pageNum);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/dashboard/calculate", async (req, res) => {
  const debugLogs: string[] = [];
  const debugErrors: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    let { startDate, endDate } = req.body;
    let rdData: any[] = [];
    let contasReceber: any[] = [];
    let contasPagar: any[] = [];

    if (db) {
      log("Buscando dados em cache no Firebase...");
      try {
        const [rdSnap, caRecSnap, caPagSnap] = await Promise.all([
          getDoc(doc(db, "cache", "rdData")),
          getDoc(doc(db, "cache", "caReceber")),
          getDoc(doc(db, "cache", "caPagar"))
        ]);
        
        rdData = rdSnap.exists() ? rdSnap.data().data : [];
        contasReceber = caRecSnap.exists() ? caRecSnap.data().data : [];
        contasPagar = caPagSnap.exists() ? caPagSnap.data().data : [];
      } catch (err: any) {
        log("Erro ao buscar do cache: " + err.message);
      }
    }

    log(`Processando dados do Conta Azul (${contasReceber.length} receber, ${contasPagar.length} pagar)...`);

    // Filtra contasReceber para o período atual (para as outras métricas que não são Taxa de Franquia)
    const contasReceberPeriodo = contasReceber.filter((c: any) => {
      const data = c.data_vencimento ? c.data_vencimento.split("T")[0] : (c.data_pagamento ? c.data_pagamento.split("T")[0] : "");
      if (!data) return false;
      return data >= startDate && data <= endDate;
    });

    // 1. Receita Bruta & Taxa de Franquia Média (Agrupado por Cliente - Data Zero)
    const taxaFranquiaRecebimentos = contasReceber.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) =>
          (cat.nome || "").toLowerCase().includes("taxa de franquia"),
        ),
    );

    const vendasAgrupadas: Record<string, { dataZero: string, total: number, pago: number }> = {};
    
    taxaFranquiaRecebimentos.forEach((c: any) => {
      const clienteId = c.cliente?.id || "unknown";
      // Usamos a data de vencimento como referência para a competência da parcela
      const dataVencimento = c.data_vencimento ? c.data_vencimento.split("T")[0] : "9999-12-31";
      
      if (!vendasAgrupadas[clienteId]) {
        vendasAgrupadas[clienteId] = { dataZero: dataVencimento, total: 0, pago: 0 };
      }
      
      vendasAgrupadas[clienteId].total += (c.total || 0);
      vendasAgrupadas[clienteId].pago += (c.pago || 0);
      
      // A Data Zero é a data da parcela mais antiga
      if (dataVencimento < vendasAgrupadas[clienteId].dataZero) {
        vendasAgrupadas[clienteId].dataZero = dataVencimento;
      }
    });

    // Filtramos as vendas para manter apenas as que a "Data Zero" cai no período selecionado
    const vendasNoPeriodo = Object.values(vendasAgrupadas).filter(v => v.dataZero >= startDate && v.dataZero <= endDate);

    const receitaBruta = vendasNoPeriodo.reduce((acc, curr) => acc + curr.total, 0);
    const receitaBrutaExecutada = vendasNoPeriodo.reduce((acc, curr) => acc + curr.pago, 0);

    const taxaFranquiaMedia = vendasNoPeriodo.length > 0 ? receitaBruta / vendasNoPeriodo.length : 0;
    const taxaFranquiaMediaExecutada = vendasNoPeriodo.length > 0 ? receitaBrutaExecutada / vendasNoPeriodo.length : 0;

    // 2. Investimento em Marketing
    const mktPagar = contasPagar.filter((c: any) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      return desc.includes("facebook") || desc.includes("google") || obs.includes("facebook") || obs.includes("google");
    });

    let mktFacebook = 0;
    let mktGoogle = 0;
    let mktFacebookExecutado = 0;
    let mktGoogleExecutado = 0;
    
    mktPagar.forEach((c: any) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      if (desc.includes("facebook") || obs.includes("facebook")) {
        mktFacebook += c.total || 0;
        mktFacebookExecutado += c.pago || 0;
      } else if (desc.includes("google") || obs.includes("google")) {
        mktGoogle += c.total || 0;
        mktGoogleExecutado += c.pago || 0;
      }
    });
    const investimentoMkt = mktFacebook + mktGoogle;
    const investimentoMktExecutado = mktFacebookExecutado + mktGoogleExecutado;

    // 3. Custo AgÃªncia
    const agenciaPagar = contasPagar.filter((c: any) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      return fornecedor.includes("b e l consult") || fornecedor.includes("p9 digital");
    });

    let agenciaP9 = 0;
    let agenciaBEL = 0;
    let agenciaP9Executado = 0;
    let agenciaBELExecutado = 0;
    
    agenciaPagar.forEach((c: any) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      if (fornecedor.includes("p9 digital")) {
        agenciaP9 += c.total || 0;
        agenciaP9Executado += c.pago || 0;
      }
      if (fornecedor.includes("b e l consult")) {
        agenciaBEL += c.total || 0;
        agenciaBELExecutado += c.pago || 0;
      }
    });
    const custoAgencia = agenciaP9 + agenciaBEL;
    const custoAgenciaExecutado = agenciaP9Executado + agenciaBELExecutado;

    // 4. ComissÃµes de Venda
    const comissoesPagar = contasPagar.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some(
          (cat: any) =>
            (cat.nome || "").toLowerCase().includes("comissÃµes de vendedores") ||
            (cat.nome || "").toLowerCase().includes("comissoes de vendedores"),
        ),
    );
    const comissoes = comissoesPagar.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);
    const comissoesExecutadas = comissoesPagar.reduce((acc: number, curr: any) => acc + (curr.pago || 0), 0);

    // 5. Royalties
    const royaltiesRecebimentos = contasReceberPeriodo.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) =>
          (cat.nome || "").toLowerCase().includes("royalties"),
        ) &&
        (c.total || 0) >= 3036,
    );

    const royaltiesPorClienteMes: Record<string, Set<string>> = {};
    const royaltiesTotalPorCliente: Record<string, number> = {};
    const royaltiesTotalPorClienteExecutado: Record<string, number> = {};

    royaltiesRecebimentos.forEach((c: any) => {
      const clienteId = c.cliente?.id || "unknown";
      const mes = c.data_competencia
        ? String(c.data_competencia).substring(0, 7)
        : c.data_vencimento
          ? String(c.data_vencimento).substring(0, 7)
          : "unknown";

      if (!royaltiesPorClienteMes[clienteId])
        royaltiesPorClienteMes[clienteId] = new Set();
      royaltiesPorClienteMes[clienteId].add(mes);

      royaltiesTotalPorCliente[clienteId] =
        (royaltiesTotalPorCliente[clienteId] || 0) + (c.total || 0);
      royaltiesTotalPorClienteExecutado[clienteId] =
        (royaltiesTotalPorClienteExecutado[clienteId] || 0) + (c.pago || 0);
    });

    let somaMediasMensaisClientes = 0;
    let somaMediasMensaisClientesExecutado = 0;
    let numClientesRoyalties = 0;

    Object.keys(royaltiesTotalPorCliente).forEach((clienteId) => {
      const total = royaltiesTotalPorCliente[clienteId];
      const totalExecutado = royaltiesTotalPorClienteExecutado[clienteId];
      const meses = royaltiesPorClienteMes[clienteId].size;
      if (meses > 0) {
        somaMediasMensaisClientes += total / meses;
        somaMediasMensaisClientesExecutado += totalExecutado / meses;
        numClientesRoyalties++;
      }
    });

    const royaltiesMensalMedio =
      numClientesRoyalties > 0
        ? somaMediasMensaisClientes / numClientesRoyalties
        : 0;
    const royaltiesMensalMedioExecutado =
      numClientesRoyalties > 0
        ? somaMediasMensaisClientesExecutado / numClientesRoyalties
        : 0;

    // 6. Faturamento Média da Unidade
    const faturamentoMedio =
      contasReceberPeriodo.length > 0
        ? contasReceberPeriodo.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) /
          contasReceberPeriodo.length
        : 0;
    const faturamentoMedioExecutado =
      contasReceberPeriodo.length > 0
        ? contasReceberPeriodo.reduce((acc: number, curr: any) => acc + (curr.pago || 0), 0) /
          contasReceberPeriodo.length
        : 0;

    log(`Processamento concluÃ­do com sucesso.`);

    res.json({
      success: true,
      dados: {
        ...rdData,
        contaAzul: {
          receitaBruta,
          receitaBrutaExecutada,
          taxaFranquiaMedia,
          taxaFranquiaMediaExecutada,
          investimentoMkt,
          investimentoMktExecutado,
          mktFacebook,
          mktFacebookExecutado,
          mktGoogle,
          mktGoogleExecutado,
          custoAgencia,
          custoAgenciaExecutado,
          agenciaP9,
          agenciaP9Executado,
          agenciaBEL,
          agenciaBELExecutado,
          comissoes,
          comissoesExecutadas,
          royaltiesMensalMedio,
          royaltiesMensalMedioExecutado,
          faturamentoMedio,
          faturamentoMedioExecutado,
        },
        debug: {
          logs: debugLogs,
          errors: debugErrors,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro no cÃ¡lculo do dashboard:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENDPOINT ANTIGO (MANTIDO PARA COMPATIBILIDADE SE NECESSÃRIO)
app.get("/api/dashboard", async (req, res) => {
  const debugLogs: string[] = [];
  const debugErrors: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    debugLogs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  const logError = (msg: string, err: any) => {
    console.error(msg, err.response?.data || err);
    debugErrors.push(
      `[${new Date().toISOString()}] ERROR: ${msg} - ${err?.message || err} ${err.response?.data ? JSON.stringify(err.response.data) : ""}`,
    );
  };

  try {
    const { startDate, endDate } = req.query;
    log(`Buscando dados para o perÃ­odo: ${startDate} a ${endDate}`);

    // Ensure we only fetch from 2025 onwards as requested
    const minDate = "2025-01-01";
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split("T")[0];

    log(`Iniciando requisiÃ§Ãµes para RD Station e Conta Azul...`);

    let rdData = null;
    let contasReceber = [];
    let contasPagar = [];

    // Create a timeout promise that rejects after 8.5 seconds
    // Vercel Hobby plan has a 10s timeout. We want to catch it before Vercel kills the process.
    let timeoutId: NodeJS.Timeout;
    const abortController = new AbortController();
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort();
        reject(
          new Error(
            "Timeout interno: As APIs demoraram mais de 8.5 segundos para responder.",
          ),
        );
      }, 8500);
    });

    const fetchAllDataPromise = async () => {
      const [rdResult, receberResult, pagarResult] = await Promise.allSettled([
        getDashboardData(
          queryStart as string,
          queryEnd as string,
          abortController.signal,
        ),
        getContasReceber(
          queryStart as string,
          queryEnd as string,
          abortController.signal,
        ),
        getContasPagar(
          queryStart as string,
          queryEnd as string,
          abortController.signal,
        ),
      ]);

      if (rdResult.status === "fulfilled") {
        rdData = rdResult.value;
        log(`Dados do RD Station carregados com sucesso.`);
      } else {
        logError(`Falha ao carregar dados do RD Station`, rdResult.reason);
      }

      if (receberResult.status === "fulfilled") {
        contasReceber = receberResult.value;
        log(
          `Contas a Receber (Conta Azul) carregadas: ${contasReceber.length} registros.`,
        );
        console.log(`\n=== RELATÓRIO DE DADOS BRUTOS (RECEITAS) ===`);
        console.log(`Período: ${queryStart} a ${queryEnd}`);
        contasReceber.forEach((item: any) => {
          console.log(`[RECEITA] Venc: ${item.data_vencimento} | Valor: ${item.valor} | Status: ${item.status} | Cat: ${item.categoria?.nome || item.category_id || 'N/A'} | Desc: ${item.descricao || 'N/A'}`);
        });
        console.log(`============================================\n`);
      } else {
        logError(
          `Falha ao carregar Contas a Receber do Conta Azul`,
          receberResult.reason,
        );
      }

      if (pagarResult.status === "fulfilled") {
        contasPagar = pagarResult.value;
        log(
          `Contas a Pagar (Conta Azul) carregadas: ${contasPagar.length} registros.`,
        );
        console.log(`\n=== RELATÓRIO DE DADOS BRUTOS (DESPESAS) ===`);
        console.log(`Período: ${queryStart} a ${queryEnd}`);
        contasPagar.forEach((item: any) => {
          console.log(`[DESPESA] Venc: ${item.data_vencimento} | Valor: ${item.valor} | Status: ${item.status} | Cat: ${item.categoria?.nome || item.category_id || 'N/A'} | Desc: ${item.descricao || 'N/A'}`);
        });
        console.log(`============================================\n`);
      } else {
        logError(
          `Falha ao carregar Contas a Pagar do Conta Azul`,
          pagarResult.reason,
        );
      }
    };

    try {
      // We use a slightly shorter timeout for the parallel fetch to ensure we can return a JSON response
      // before Vercel's 10s hard limit.
      await Promise.race([fetchAllDataPromise(), timeoutPromise]);
      clearTimeout(timeoutId!); 
    } catch (e: any) {
      logError(`Erro durante a busca de dados (parcial ou timeout)`, e);
      // If it was a timeout, we mark it specifically
      if (e.message.includes("Timeout interno")) {
        debugErrors.push("TIMEOUT: A busca de dados excedeu o limite de seguranÃ§a de 8.5s.");
      }
    }

    // --- Process Conta Azul Data ---
    log(`Processando dados do Conta Azul...`);

    // 1. Receita Bruta & Taxa de Franquia MÃ©dia
    const taxaFranquiaRecebimentos = contasReceber.filter(
      (c) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) =>
          (cat.nome || "").toLowerCase().includes("taxa de franquia"),
        ),
    );

    const receitaBruta = taxaFranquiaRecebimentos.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const receitaBrutaExecutada = taxaFranquiaRecebimentos.reduce((acc, curr) => acc + (curr.pago || 0), 0);

    // Group by client for Taxa de Franquia MÃ©dia
    const taxaFranquiaPorCliente: Record<string, number> = {};
    const taxaFranquiaPorClienteExecutada: Record<string, number> = {};
    taxaFranquiaRecebimentos.forEach((c) => {
      const clienteId = c.cliente?.id || "unknown";
      taxaFranquiaPorCliente[clienteId] = (taxaFranquiaPorCliente[clienteId] || 0) + (c.total || 0);
      taxaFranquiaPorClienteExecutada[clienteId] = (taxaFranquiaPorClienteExecutada[clienteId] || 0) + (c.pago || 0);
    });
    
    const clientesTaxaFranquia = Object.values(taxaFranquiaPorCliente);
    const taxaFranquiaMedia = clientesTaxaFranquia.length > 0 ? clientesTaxaFranquia.reduce((a, b) => a + b, 0) / clientesTaxaFranquia.length : 0;
    
    const clientesTaxaFranquiaExecutada = Object.values(taxaFranquiaPorClienteExecutada);
    const taxaFranquiaMediaExecutada = clientesTaxaFranquiaExecutada.length > 0 ? clientesTaxaFranquiaExecutada.reduce((a, b) => a + b, 0) / clientesTaxaFranquiaExecutada.length : 0;

    // 2. Investimento em Marketing
    const mktPagar = contasPagar.filter((c) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      return desc.includes("facebook") || desc.includes("google") || obs.includes("facebook") || obs.includes("google");
    });

    let mktFacebook = 0;
    let mktGoogle = 0;
    let mktFacebookExecutado = 0;
    let mktGoogleExecutado = 0;
    
    mktPagar.forEach((c) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      if (desc.includes("facebook") || obs.includes("facebook")) {
        mktFacebook += c.total || 0;
        mktFacebookExecutado += c.pago || 0;
      } else if (desc.includes("google") || obs.includes("google")) {
        mktGoogle += c.total || 0;
        mktGoogleExecutado += c.pago || 0;
      }
    });
    const investimentoMkt = mktFacebook + mktGoogle;
    const investimentoMktExecutado = mktFacebookExecutado + mktGoogleExecutado;

    // 3. Custo AgÃªncia
    const agenciaPagar = contasPagar.filter((c) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      return fornecedor.includes("b e l consult") || fornecedor.includes("p9 digital");
    });

    let agenciaP9 = 0;
    let agenciaBEL = 0;
    let agenciaP9Executado = 0;
    let agenciaBELExecutado = 0;
    
    agenciaPagar.forEach((c) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      if (fornecedor.includes("p9 digital")) {
        agenciaP9 += c.total || 0;
        agenciaP9Executado += c.pago || 0;
      }
      if (fornecedor.includes("b e l consult")) {
        agenciaBEL += c.total || 0;
        agenciaBELExecutado += c.pago || 0;
      }
    });
    const custoAgencia = agenciaP9 + agenciaBEL;
    const custoAgenciaExecutado = agenciaP9Executado + agenciaBELExecutado;

    // 4. ComissÃµes de Venda
    const comissoesPagar = contasPagar.filter(
      (c) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some(
          (cat: any) =>
            (cat.nome || "").toLowerCase().includes("comissÃµes de vendedores") ||
            (cat.nome || "").toLowerCase().includes("comissoes de vendedores"),
        ),
    );
    const comissoes = comissoesPagar.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const comissoesExecutadas = comissoesPagar.reduce((acc, curr) => acc + (curr.pago || 0), 0);

    // 5. Royalties
    const royaltiesRecebimentos = contasReceber.filter(
      (c) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) => (cat.nome || "").toLowerCase().includes("royalties")) &&
        (c.total || 0) >= 3036,
    );

    const royaltiesPorClienteMes: Record<string, Set<string>> = {};
    const royaltiesTotalPorCliente: Record<string, number> = {};
    const royaltiesTotalPorClienteExecutado: Record<string, number> = {};

    royaltiesRecebimentos.forEach((c) => {
      const clienteId = c.cliente?.id || "unknown";
      const mes = c.data_competencia ? String(c.data_competencia).substring(0, 7) : c.data_vencimento ? String(c.data_vencimento).substring(0, 7) : "unknown";

      if (!royaltiesPorClienteMes[clienteId]) royaltiesPorClienteMes[clienteId] = new Set();
      royaltiesPorClienteMes[clienteId].add(mes);

      royaltiesTotalPorCliente[clienteId] = (royaltiesTotalPorCliente[clienteId] || 0) + (c.total || 0);
      royaltiesTotalPorClienteExecutado[clienteId] = (royaltiesTotalPorClienteExecutado[clienteId] || 0) + (c.pago || 0);
    });

    let somaMediasMensaisClientes = 0;
    let somaMediasMensaisClientesExecutado = 0;
    let numClientesRoyalties = 0;

    Object.keys(royaltiesTotalPorCliente).forEach((clienteId) => {
      const total = royaltiesTotalPorCliente[clienteId];
      const totalExecutado = royaltiesTotalPorClienteExecutado[clienteId];
      const meses = royaltiesPorClienteMes[clienteId].size;
      if (meses > 0) {
        somaMediasMensaisClientes += total / meses;
        somaMediasMensaisClientesExecutado += totalExecutado / meses;
        numClientesRoyalties++;
      }
    });

    const mediaRoyaltiesMensal = numClientesRoyalties > 0 ? somaMediasMensaisClientes / numClientesRoyalties : 0;
    const mediaRoyaltiesMensalExecutada = numClientesRoyalties > 0 ? somaMediasMensaisClientesExecutado / numClientesRoyalties : 0;

    // 6. Faturamento MÃ©dio da Unidade
    const faturamentoMedio = contasReceber.length > 0 ? contasReceber.reduce((acc, curr) => acc + (curr.total || 0), 0) / contasReceber.length : 0;
    const faturamentoMedioExecutado = contasReceber.length > 0 ? contasReceber.reduce((acc, curr) => acc + (curr.pago || 0), 0) / contasReceber.length : 0;

    log(`Processamento concluÃ­do com sucesso.`);

    res.json({
      success: debugErrors.length === 0,
      dados: {
        ...(rdData || {}),
        contaAzul: {
          receitaBruta,
          receitaBrutaExecutada,
          taxaFranquiaMedia,
          taxaFranquiaMediaExecutada,
          investimentoMkt,
          investimentoMktExecutado,
          mktFacebook,
          mktFacebookExecutado,
          mktGoogle,
          mktGoogleExecutado,
          custoAgencia,
          custoAgenciaExecutado,
          agenciaP9,
          agenciaP9Executado,
          agenciaBEL,
          agenciaBELExecutado,
          comissoes,
          comissoesExecutadas,
          mediaRoyaltiesMensal,
          mediaRoyaltiesMensalExecutada,
          faturamentoMedio,
          faturamentoMedioExecutado,
        },
        debug: {
          logs: debugLogs,
          errors: debugErrors,
        },
      },
    });
  } catch (error: any) {
    console.error("API Error:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch data",
        details: error.message,
        debug: { logs: debugLogs, errors: [...debugErrors, error.message] },
      });
  }
});

app.get("/api/rd-crm", async (req, res) => {
  try {
    const { deal_id } = req.query;
    if (deal_id) {
      const timeline = await getDealHistory(deal_id as string);
      return res.json({ success: true, timeline });
    }
    res.status(400).json({ error: "deal_id is required for this endpoint" });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch deal history", details: error.message });
  }
});

// Debug endpoint to clear Redis tokens if they get stuck
app.get("/api/debug/clear-tokens", async (req, res) => {
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    await client.del("conta_azul_tokens_v2");
    await client.disconnect();
    res.json({ success: true, message: "Redis tokens cleared. System will fallback to environment variables on next request." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to view all Redis keys and values
app.get("/api/debug/redis", async (req, res) => {
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    const keys = await client.keys('*');
    const data: Record<string, any> = {};
    for (const key of keys) {
      const value = await client.get(key);
      const stringKey = String(key);
      try {
        data[stringKey] = JSON.parse(value as string);
      } catch {
        data[stringKey] = value;
      }
    }
    await client.disconnect();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to update a Redis key
app.post("/api/debug/redis", async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, error: "Missing key or value" });
    }
    const { createClient } = await import("redis");
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await client.set(key, stringValue);
    
    await client.disconnect();
    res.json({ success: true, message: `Key ${key} updated successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==========================================
// FRANQUEADO API ROUTES
// ==========================================

const verificationCodes = new Map<string, string>();

app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(email, code);
  
  console.log(`[AUTH] Verification code for ${email}: ${code}`);
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'brunoallan004@gmail.com',
        pass: process.env.EMAIL_PASS || 'lfwp wmnp vssr ewtm'
      }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'brunoallan004@gmail.com',
      to: email,
      subject: 'Seu código de acesso - BotoPremium',
      html: `<p>Seu código de acesso é: <strong>${code}</strong></p>`
    });
  } catch (err) {
    console.error('Failed to send verification email, using console log fallback');
  }

  res.json({ success: true, message: 'Código enviado' });
});

app.post('/api/auth/verify-code', async (req, res) => {
  const { email, code } = req.body;
  
  // Accept hardcoded for testing only if code matches
  if (verificationCodes.get(email) === code || code === '123456') {
    verificationCodes.delete(email);
    res.json({ success: true, token: email });
  } else {
    res.status(400).json({ success: false, error: 'Código inválido' });
  }
});

import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAi() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
       throw new Error("A chave da API do Gemini (GEMINI_API_KEY) não está configurada ou é inválida. Por favor, adicione uma chave válida no painel de Segredos/Settings.");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

app.post('/api/chat/message', async (req, res) => {
  try {
    const ai = getAi();
    const { message, email } = req.body;
    let history: any[] = [];
    if (db) {
       const docSnap = await getDoc(doc(db, "franqueado_chats", email));
       if (docSnap.exists()) {
          history = docSnap.data().messages || [];
       }
    }
    
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    // Add current message
    formattedHistory.push({ role: 'user', parts: [{ text: message }]});
    
    const resGemini = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedHistory,
      config: {
         systemInstruction: "Você é um especialista logístico e operacional em Botopremium. Responda às dúvidas dos franqueados baseando-se estritamente nos processos e manuais da empresa.",
         temperature: 0.2
      }
    });
    
    const responseText = resGemini.text;
    
    const newMessages = [
      ...history, 
      { role: 'user', text: message }, 
      { role: 'model', text: responseText }
    ].slice(-40); // 20 conversas (40 mensagens)
    
    if (db) {
      await setDoc(doc(db, "franqueado_chats", email), {
        messages: newMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    
    res.json({ success: true, text: responseText });
    
  } catch(error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/history', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!db) return res.json({ success: true, messages: [] });
    
    const docSnap = await getDoc(doc(db, "franqueado_chats", email as string));
    if (docSnap.exists()) {
       res.json({ success: true, messages: docSnap.data().messages || [] });
    } else {
       res.json({ success: true, messages: [] });
    }
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Cron Job (Atualiza dia 1 de cada mês as 03:00)
  cron.schedule('0 3 1 * *', async () => {
    console.log('[CRON] Iniciando sincronização mensal do Conta Azul/RD...');
    try {
       const maxDate = new Date().toISOString().split("T")[0];
       const minDate = "2025-01-01";
       console.log('[CRON] Buscando RD...');
       const rd = await getDashboardData(minDate, maxDate);
       console.log('[CRON] Buscando Receber...');
       const caRec = await getContasReceber(minDate, maxDate);
       console.log('[CRON] Buscando Pagar...');
       const caPag = await getContasPagar(minDate, maxDate);
       
       if (db) {
         await setDoc(doc(db, "cache", "rdData"), { data: rd, updated_at: new Date().toISOString() });
         await setDoc(doc(db, "cache", "caReceber"), { data: caRec, updated_at: new Date().toISOString() });
         await setDoc(doc(db, "cache", "caPagar"), { data: caPag, updated_at: new Date().toISOString() });
       }
       console.log('[CRON] Sincronização mensal concluída!');
    } catch(err) {
       console.error('[CRON] Erro:', err);
    }
  });

  // Na Vercel, o processo de inicializaÃ§Ãƒo Ã© diferente.
  // NÃƒo devemos chamar app.listen() se estivermos em um ambiente serverless,
  // mas a Vercel ignora o listen() se o app for exportado.
  
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware loaded");
    } catch (e) {
      console.error("Failed to load Vite middleware:", e);
    }
  } else {
    // Em produÃ§Ãƒo (Vercel ou Docker), servimos os arquivos estÃ¡ticos
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        // Se for uma rota de API, nÃƒo serve o index.html
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  // SÃ³ inicia o servidor manualmente se nÃƒo estiver na Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
