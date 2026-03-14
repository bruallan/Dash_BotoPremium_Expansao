const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

const newLogic = `
    // 1. Receita Bruta & Taxa de Franquia MÃ©dia
    const taxaFranquiaRecebimentos = contasReceber.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) =>
          (cat.nome || "").toLowerCase().includes("taxa de franquia"),
        ),
    );

    const receitaBruta = taxaFranquiaRecebimentos.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);
    const receitaBrutaExecutada = taxaFranquiaRecebimentos.reduce((acc: number, curr: any) => acc + (curr.pago || 0), 0);

    const taxaFranquiaPorCliente: Record<string, number> = {};
    const taxaFranquiaPorClienteExecutada: Record<string, number> = {};
    taxaFranquiaRecebimentos.forEach((c: any) => {
      const clienteId = c.cliente?.id || "unknown";
      taxaFranquiaPorCliente[clienteId] = (taxaFranquiaPorCliente[clienteId] || 0) + (c.total || 0);
      taxaFranquiaPorClienteExecutada[clienteId] = (taxaFranquiaPorClienteExecutada[clienteId] || 0) + (c.pago || 0);
    });
    
    const clientesTaxaFranquia = Object.values(taxaFranquiaPorCliente);
    const taxaFranquiaMedia = clientesTaxaFranquia.length > 0 ? clientesTaxaFranquia.reduce((a: number, b: number) => a + b, 0) / clientesTaxaFranquia.length : 0;
    
    const clientesTaxaFranquiaExecutada = Object.values(taxaFranquiaPorClienteExecutada);
    const taxaFranquiaMediaExecutada = clientesTaxaFranquiaExecutada.length > 0 ? clientesTaxaFranquiaExecutada.reduce((a: number, b: number) => a + b, 0) / clientesTaxaFranquiaExecutada.length : 0;

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
    const royaltiesRecebimentos = contasReceber.filter(
      (c: any) =>
        c.categorias &&
        Array.isArray(c.categorias) &&
        c.categorias.some((cat: any) => (cat.nome || "").toLowerCase().includes("royalties")) &&
        (c.total || 0) >= 3036,
    );

    const royaltiesPorClienteMes: Record<string, Set<string>> = {};
    const royaltiesTotalPorCliente: Record<string, number> = {};
    const royaltiesTotalPorClienteExecutado: Record<string, number> = {};

    royaltiesRecebimentos.forEach((c: any) => {
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
    const faturamentoMedio = contasReceber.length > 0 ? contasReceber.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) / contasReceber.length : 0;
    const faturamentoMedioExecutado = contasReceber.length > 0 ? contasReceber.reduce((acc: number, curr: any) => acc + (curr.pago || 0), 0) / contasReceber.length : 0;

    log(\`Processamento concluÃ­do com sucesso.\`);

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
`;

const calculateRegex = /\/\/ 1\. Receita Bruta & Taxa de Franquia MÃ©dia[\s\S]*?debugLogs,\s*errors: debugErrors,\s*},\s*},\s*\);/g;
content = content.replace(calculateRegex, newLogic.trim());

fs.writeFileSync('api/index.ts', content);
