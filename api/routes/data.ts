import { Router } from 'express';
import { db, doc, getDoc, setDoc, request, fetchAllPages } from '../index.js';
import { runFinanceCron } from '../services/financeCron.js';

export const dataRouter = Router();

// In-memory cache to prevent Firestore quota exhaustion for reads
let cachedFinanceiroData: any = null;
let lastFinanceiroFetchTime = 0;

const emptyData = { eventos: [], saldos: [], saldosHistoricos: [], contratos: [] };

dataRouter.get("/financeiro", async (req, res) => {
  try {
    const now = Date.now();
    // Cache de 5 minutos
    if (cachedFinanceiroData && (now - lastFinanceiroFetchTime < 5 * 60 * 1000)) {
      return res.json({ success: true, data: cachedFinanceiroData });
    }

    if (!db) {
      if (cachedFinanceiroData) return res.json({ success: true, data: cachedFinanceiroData });
      return res.json({ success: true, data: emptyData, message: "Banco de dados não conectado." });
    }

    const docSnap = await getDoc(doc(db, "dashboards", "financeiro"));
    if (docSnap.exists()) {
      cachedFinanceiroData = docSnap.data();
      lastFinanceiroFetchTime = Date.now();
      return res.json({ success: true, data: cachedFinanceiroData });
    } else {
      if (cachedFinanceiroData) return res.json({ success: true, data: cachedFinanceiroData });
      return res.json({ success: true, data: emptyData, message: "Aguardando primeira execução do CRON." });
    }
  } catch (error: any) {
    if (cachedFinanceiroData) {
      console.warn("Erro ao buscar dados financeiros do Firebase (usando cache local):", error.message);
      return res.json({ success: true, data: cachedFinanceiroData });
    }
    console.error("Erro ao buscar dados financeiros:", error.message);
    return res.json({ success: true, data: emptyData, message: "Aviso: Mostrando dados limitados devido cota." });
  }
});

dataRouter.post("/financeiro/sync", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Banco de dados não conectado." });
    }
    
    // Invalida o cache
    lastFinanceiroFetchTime = 0;
    
    const result = await runFinanceCron(request, fetchAllPages, db, setDoc, doc);
    
    // Se runFinanceCron nos retornar um payload, atualizamos o cache imediatamente (bom quando ultrapassamos cota do Firebase e não conseguimos re-ler)
    if (result && typeof result === 'object' && result !== null) {
      cachedFinanceiroData = result;
      lastFinanceiroFetchTime = Date.now();
      return res.json({ success: true, data: cachedFinanceiroData, message: "Sincronização concluída (Cache local atualizado devido cota)" });
    }
    
    // Tenta fetch na db
    try {
      const docSnap = await getDoc(doc(db, "dashboards", "financeiro"));
      if (docSnap.exists()) {
        cachedFinanceiroData = docSnap.data();
        lastFinanceiroFetchTime = Date.now();
        return res.json({ success: true, data: cachedFinanceiroData, message: "Sincronização concluída." });
      }
    } catch(err: any) {
       if (cachedFinanceiroData) {
         return res.json({ success: true, data: cachedFinanceiroData, message: "Sincronização concluída. Erro leitura Cloud, usando cache."});
       }
    }
    
    return res.json({ success: true, data: emptyData, message: "Sincronização concluída mas sem dados aparentes." });
    
  } catch (error: any) {
    console.error("Erro ao forçar sync financeiro:", error.message);
    if (cachedFinanceiroData) {
        return res.json({ success: true, data: cachedFinanceiroData, message: "Erro sincronização, exibindo dados do cache local." });
    }
    return res.json({ success: true, data: emptyData, message: "Aviso: Sincronização falhou e não há dados em memória." });
  }
});

// Endpoint registers related to external data providers (Conta Azul, RD CRM)
// should be migrated here.

