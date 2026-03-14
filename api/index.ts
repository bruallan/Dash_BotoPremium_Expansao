import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { getDashboardData, getDealHistory } from "../src/services/rdStation";
import { getContasReceber, getContasPagar, getContasReceberPage, getContasPagarPage, getStoredTokens } from "../src/services/contaAzul";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado para suportar o payload do calculate

// NOVO ENDPOINT DE DEBUG: Verifica variÃ¡veis de ambiente
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

// ENDPOINTS GRANULARES PARA PAGINAÃ‡ÃƒO NO FRONTEND
app.get("/api/data/rd", async (req, res) => {
  try {
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
    const minDate = "2025-01-01";
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split("T")[0];
    
    const data = await getContasReceberPage(queryStart as string, queryEnd as string, parseInt(page as string) || 1);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/data/ca-pagar", async (req, res) => {
  try {
    const { startDate, endDate, page } = req.query;
    const minDate = "2025-01-01";
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split("T")[0];
    
    const data = await getContasPagarPage(queryStart as string, queryEnd as string, parseInt(page as string) || 1);
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
    const { rdData, contasReceber, contasPagar } = req.body;
    log(`Processando dados do Conta Azul (${contasReceber.length} receber, ${contasPagar.length} pagar)...`);

    // 1. Receita Bruta & Taxa de Franquia MÃ©dia
    const taxaFranquiaRecebimentos = contasReceber.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) =>
          (cat.nome || "").toLowerCase().includes("taxa de franquia"),
        ),
    );

    const receitaBruta = taxaFranquiaRecebimentos.reduce(
      (acc: number, curr: any) => acc + (curr.total || 0),
      0,
    );

    const taxaFranquiaPorCliente: Record<string, number> = {};
    taxaFranquiaRecebimentos.forEach((c: any) => {
      const clienteId = c.cliente?.id || "unknown";
      taxaFranquiaPorCliente[clienteId] =
        (taxaFranquiaPorCliente[clienteId] || 0) + (c.total || 0);
    });
    const clientesTaxaFranquia = Object.values(taxaFranquiaPorCliente);
    const taxaFranquiaMedia =
      clientesTaxaFranquia.length > 0
        ? clientesTaxaFranquia.reduce((a: number, b: number) => a + b, 0) /
          clientesTaxaFranquia.length
        : 0;

    // 2. Investimento em Marketing
    const mktPagar = contasPagar.filter((c: any) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      return (
        desc.includes("facebook") ||
        desc.includes("google") ||
        obs.includes("facebook") ||
        obs.includes("google")
      );
    });

    let mktFacebook = 0;
    let mktGoogle = 0;
    mktPagar.forEach((c: any) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      if (desc.includes("facebook") || obs.includes("facebook"))
        mktFacebook += c.total || 0;
      else if (desc.includes("google") || obs.includes("google"))
        mktGoogle += c.total || 0;
    });
    const investimentoMkt = mktFacebook + mktGoogle;

    // 3. Custo AgÃªncia
    const agenciaPagar = contasPagar.filter((c: any) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      return (
        fornecedor.includes("b e l consult") ||
        fornecedor.includes("p9 digital")
      );
    });

    let agenciaP9 = 0;
    let agenciaBEL = 0;
    agenciaPagar.forEach((c: any) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      if (fornecedor.includes("p9 digital")) agenciaP9 += c.total || 0;
      if (fornecedor.includes("b e l consult")) agenciaBEL += c.total || 0;
    });
    const custoAgencia = agenciaP9 + agenciaBEL;

    // 4. ComissÃµes de Venda
    const comissoesPagar = contasPagar.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some(
          (cat: any) =>
            (cat.nome || "")
              .toLowerCase()
              .includes("comissÃµes de vendedores") ||
            (cat.nome || "").toLowerCase().includes("comissoes de vendedores"),
        ),
    );
    const comissoes = comissoesPagar.reduce(
      (acc: number, curr: any) => acc + (curr.total || 0),
      0,
    );

    // 5. Royalties
    const royaltiesRecebimentos = contasReceber.filter(
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
    });

    let somaMediasMensaisClientes = 0;
    let numClientesRoyalties = 0;

    Object.keys(royaltiesTotalPorCliente).forEach((clienteId) => {
      const total = royaltiesTotalPorCliente[clienteId];
      const meses = royaltiesPorClienteMes[clienteId].size;
      if (meses > 0) {
        somaMediasMensaisClientes += total / meses;
        numClientesRoyalties++;
      }
    });

    const royaltiesMensalMedio =
      numClientesRoyalties > 0
        ? somaMediasMensaisClientes / numClientesRoyalties
        : 0;

    // 6. Faturamento MÃ©dio da Unidade
    const faturamentoMedio =
      contasReceber.length > 0
        ? contasReceber.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) /
          contasReceber.length
        : 0;

    log(`Processamento concluÃ­do com sucesso.`);

    res.json({
      success: true,
      dados: {
        ...rdData,
        contaAzul: {
          receitaBruta,
          taxaFranquiaMedia,
          investimentoMkt,
          mktFacebook,
          mktGoogle,
          custoAgencia,
          agenciaP9,
          agenciaBEL,
          comissoes,
          royaltiesMensalMedio,
          faturamentoMedio,
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

    const receitaBruta = taxaFranquiaRecebimentos.reduce(
      (acc, curr) => acc + (curr.total || 0),
      0,
    );

    // Group by client for Taxa de Franquia MÃ©dia
    const taxaFranquiaPorCliente: Record<string, number> = {};
    taxaFranquiaRecebimentos.forEach((c) => {
      const clienteId = c.cliente?.id || "unknown";
      taxaFranquiaPorCliente[clienteId] =
        (taxaFranquiaPorCliente[clienteId] || 0) + (c.total || 0);
    });
    const clientesTaxaFranquia = Object.values(taxaFranquiaPorCliente);
    const taxaFranquiaMedia =
      clientesTaxaFranquia.length > 0
        ? clientesTaxaFranquia.reduce((a, b) => a + b, 0) /
          clientesTaxaFranquia.length
        : 0;

    // 2. Investimento em Marketing
    const mktPagar = contasPagar.filter((c) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      return (
        desc.includes("facebook") ||
        desc.includes("google") ||
        obs.includes("facebook") ||
        obs.includes("google")
      );
    });

    let mktFacebook = 0;
    let mktGoogle = 0;
    mktPagar.forEach((c) => {
      const desc = (c.descricao || "").toLowerCase();
      const obs = (c.observacao || "").toLowerCase();
      if (desc.includes("facebook") || obs.includes("facebook"))
        mktFacebook += c.total || 0;
      else if (desc.includes("google") || obs.includes("google"))
        mktGoogle += c.total || 0;
    });
    const investimentoMkt = mktFacebook + mktGoogle;

    // 3. Custo AgÃªncia
    const agenciaPagar = contasPagar.filter((c) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      return (
        fornecedor.includes("b e l consult") ||
        fornecedor.includes("p9 digital")
      );
    });

    let agenciaP9 = 0;
    let agenciaBEL = 0;
    agenciaPagar.forEach((c) => {
      const fornecedor = (c.fornecedor?.nome || "").toLowerCase();
      if (fornecedor.includes("p9 digital")) agenciaP9 += c.total || 0;
      if (fornecedor.includes("b e l consult")) agenciaBEL += c.total || 0;
    });
    const custoAgencia = agenciaP9 + agenciaBEL;

    // 4. ComissÃµes de Venda
    const comissoesPagar = contasPagar.filter(
      (c) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some(
          (cat: any) =>
            (cat.nome || "")
              .toLowerCase()
              .includes("comissÃµes de vendedores") ||
            (cat.nome || "").toLowerCase().includes("comissoes de vendedores"),
        ),
    );
    const comissoes = comissoesPagar.reduce(
      (acc, curr) => acc + (curr.total || 0),
      0,
    );

    // 5. Royalties
    const royaltiesRecebimentos = contasReceber.filter(
      (c) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) =>
          (cat.nome || "").toLowerCase().includes("royalties"),
        ) &&
        (c.total || 0) >= 3036,
    );

    const royaltiesPorClienteMes: Record<string, Set<string>> = {};
    const royaltiesTotalPorCliente: Record<string, number> = {};

    royaltiesRecebimentos.forEach((c) => {
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
    });

    let somaMediasMensaisClientes = 0;
    let numClientesRoyalties = 0;

    Object.keys(royaltiesTotalPorCliente).forEach((clienteId) => {
      const total = royaltiesTotalPorCliente[clienteId];
      const meses = royaltiesPorClienteMes[clienteId].size;
      if (meses > 0) {
        somaMediasMensaisClientes += total / meses;
        numClientesRoyalties++;
      }
    });

    const mediaRoyaltiesMensal =
      numClientesRoyalties > 0
        ? somaMediasMensaisClientes / numClientesRoyalties
        : 0;

    // 6. Faturamento MÃ©dio da Unidade
    const faturamentoMedio =
      contasReceber.length > 0
        ? contasReceber.reduce((acc, curr) => acc + (curr.total || 0), 0) /
          contasReceber.length
        : 0;

    log(`Processamento concluÃ­do com sucesso.`);

    res.json({
      success: debugErrors.length === 0,
      dados: {
        ...(rdData || {}),
        contaAzul: {
          receitaBruta,
          taxaFranquiaMedia,
          investimentoMkt,
          mktFacebook,
          mktGoogle,
          custoAgencia,
          agenciaP9,
          agenciaBEL,
          comissoes,
          mediaRoyaltiesMensal,
          faturamentoMedio,
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

async function startServer() {
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
