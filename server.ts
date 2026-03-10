import express from 'express';
import cors from 'cors';
import { getDashboardData, getDealHistory } from './src/services/rdStation';
import { getContasReceber, getContasPagar } from './src/services/contaAzul';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Ensure we only fetch from 2025 onwards as requested
    const minDate = '2025-01-01';
    const queryStart = startDate && startDate >= minDate ? startDate : minDate;
    const queryEnd = endDate || new Date().toISOString().split('T')[0];

    const [rdData, contasReceber, contasPagar] = await Promise.all([
      getDashboardData(queryStart as string, queryEnd as string),
      getContasReceber(queryStart as string, queryEnd as string),
      getContasPagar(queryStart as string, queryEnd as string)
    ]);

    // --- Process Conta Azul Data ---
    
    // 1. Receita Bruta & Taxa de Franquia Média
    const taxaFranquiaRecebimentos = contasReceber.filter(c => 
      c.categorias && c.categorias.some((cat: any) => cat.nome.toLowerCase().includes('taxa de franquia'))
    );
    
    const receitaBruta = taxaFranquiaRecebimentos.reduce((acc, curr) => acc + (curr.total || 0), 0);
    
    // Group by client for Taxa de Franquia Média
    const taxaFranquiaPorCliente: Record<string, number> = {};
    taxaFranquiaRecebimentos.forEach(c => {
      const clienteId = c.cliente?.id || 'unknown';
      taxaFranquiaPorCliente[clienteId] = (taxaFranquiaPorCliente[clienteId] || 0) + (c.total || 0);
    });
    const clientesTaxaFranquia = Object.values(taxaFranquiaPorCliente);
    const taxaFranquiaMedia = clientesTaxaFranquia.length > 0 
      ? clientesTaxaFranquia.reduce((a, b) => a + b, 0) / clientesTaxaFranquia.length 
      : 0;

    // 2. Investimento em Marketing
    const mktPagar = contasPagar.filter(c => {
      const desc = (c.descricao || '').toLowerCase();
      const obs = (c.observacao || '').toLowerCase();
      return desc.includes('facebook') || desc.includes('google') || obs.includes('facebook') || obs.includes('google');
    });
    
    let mktFacebook = 0;
    let mktGoogle = 0;
    mktPagar.forEach(c => {
      const desc = (c.descricao || '').toLowerCase();
      const obs = (c.observacao || '').toLowerCase();
      if (desc.includes('facebook') || obs.includes('facebook')) mktFacebook += (c.total || 0);
      else if (desc.includes('google') || obs.includes('google')) mktGoogle += (c.total || 0);
    });
    const investimentoMkt = mktFacebook + mktGoogle;

    // 3. Custo Agência
    const agenciaPagar = contasPagar.filter(c => {
      const fornecedor = (c.fornecedor?.nome || '').toLowerCase();
      return fornecedor.includes('b e l consult') || fornecedor.includes('p9 digital');
    });
    
    let agenciaP9 = 0;
    let agenciaBEL = 0;
    agenciaPagar.forEach(c => {
      const fornecedor = (c.fornecedor?.nome || '').toLowerCase();
      if (fornecedor.includes('p9 digital')) agenciaP9 += (c.total || 0);
      if (fornecedor.includes('b e l consult')) agenciaBEL += (c.total || 0);
    });
    const custoAgencia = agenciaP9 + agenciaBEL;

    // 4. Comissões de Venda
    const comissoesPagar = contasPagar.filter(c => 
      c.categorias && c.categorias.some((cat: any) => cat.nome.toLowerCase().includes('comissões de vendedores') || cat.nome.toLowerCase().includes('comissoes de vendedores'))
    );
    const comissoes = comissoesPagar.reduce((acc, curr) => acc + (curr.total || 0), 0);

    // 5. Royalties
    const royaltiesRecebimentos = contasReceber.filter(c => 
      c.categorias && c.categorias.some((cat: any) => cat.nome.toLowerCase().includes('royalties')) &&
      (c.total || 0) >= 3036
    );
    
    const royaltiesPorClienteMes: Record<string, Set<string>> = {};
    const royaltiesTotalPorCliente: Record<string, number> = {};
    
    royaltiesRecebimentos.forEach(c => {
      const clienteId = c.cliente?.id || 'unknown';
      const mes = c.data_competencia ? c.data_competencia.substring(0, 7) : c.data_vencimento.substring(0, 7);
      
      if (!royaltiesPorClienteMes[clienteId]) royaltiesPorClienteMes[clienteId] = new Set();
      royaltiesPorClienteMes[clienteId].add(mes);
      
      royaltiesTotalPorCliente[clienteId] = (royaltiesTotalPorCliente[clienteId] || 0) + (c.total || 0);
    });
    
    let somaMediasMensaisClientes = 0;
    let numClientesRoyalties = 0;
    
    Object.keys(royaltiesTotalPorCliente).forEach(clienteId => {
      const total = royaltiesTotalPorCliente[clienteId];
      const meses = royaltiesPorClienteMes[clienteId].size;
      if (meses > 0) {
        somaMediasMensaisClientes += (total / meses);
        numClientesRoyalties++;
      }
    });
    
    const mediaRoyaltiesMensal = numClientesRoyalties > 0 ? somaMediasMensaisClientes / numClientesRoyalties : 0;

    // 6. Faturamento Médio da Unidade
    const faturamentoMedio = contasReceber.length > 0 
      ? contasReceber.reduce((acc, curr) => acc + (curr.total || 0), 0) / contasReceber.length 
      : 0;

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
          mediaRoyaltiesMensal,
          faturamentoMedio
        }
      }
    });
  } catch (error: any) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

app.get('/api/rd-crm', async (req, res) => {
  try {
    const { deal_id } = req.query;
    if (deal_id) {
      const timeline = await getDealHistory(deal_id as string);
      return res.json({ success: true, timeline });
    }
    res.status(400).json({ error: 'deal_id is required for this endpoint' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch deal history', details: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  // Use dynamic import for vite to avoid loading it in production
  import('vite').then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then(vite => {
      app.use(vite.middlewares);
      app.listen(PORT, () => {
        console.log(`Dev server running on http://localhost:${PORT}`);
      });
    });
  });
} else {
  // Only serve static files and listen if NOT running in Vercel.
  // Vercel handles static files natively via its edge network.
  if (!process.env.VERCEL) {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
    app.listen(PORT, () => {
      console.log(`Production server running on http://localhost:${PORT}`);
    });
  }
}

export default app;
