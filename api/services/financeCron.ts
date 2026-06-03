import { subMonths } from 'date-fns';

export async function runFinanceCron(
    requestFn: any, 
    fetchAllPagesFn: any, 
    dbRef: any, 
    setDocFn: any, 
    docFn: any
) {
    console.log('[CRON FINANCEIRO] Iniciando processamento financeiro...');
    
    try {
        const currentDate = new Date();
        const maxDate = new Date().toISOString().split("T")[0];
        const minDate = subMonths(currentDate, 12).toISOString().split("T")[0];
        
        let saldoCaixaAtual = 0;
        try {
            const contasResponse = await requestFn("GET", "/v1/contas-financeiras", { apenas_ativo: true });
            const contas = contasResponse || [];
            for (const conta of contas) {
                if (conta.id) {
                    try {
                        const saldoResponse = await requestFn("GET", `/v1/contas-financeiras/${conta.id}/saldo-atual`);
                        if (saldoResponse && saldoResponse.saldo) {
                            saldoCaixaAtual += parseFloat(saldoResponse.saldo);
                        }
                    } catch (e) {
                         // Ignorar se a conta nao suportar saldo ou falhar
                    }
                }
            }
        } catch (e: any) {
            if (e.response?.status !== 404) {
               console.error("[CRON FINANCEIRO] Erro ao buscar contas:", e.message);
            }
        }

        const contasReceber = await fetchAllPagesFn("/v1/financeiro/eventos-financeiros/contas-a-receber/buscar", {
            data_vencimento_de: minDate,
            data_vencimento_ate: maxDate,
        });

        const contasPagar = await fetchAllPagesFn("/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar", {
            data_vencimento_de: minDate,
            data_vencimento_ate: maxDate,
        });

        let contratos: any[] = [];
        try {
            contratos = await fetchAllPagesFn("/v1/contratos", {});
        } catch (e) {
            console.error("[CRON FINANCEIRO] Erro contratos:", e);
        }

        // Simplificar cada item para caber no limite do Firestore
        const mapEvento = (e: any, tipo: "RECEITA" | "DESPESA") => {
            const rawTotal = e.total !== undefined ? e.total : (e.valor !== undefined ? e.valor : 0);
            const rawPago = e.pago !== undefined ? e.pago : (e.valor_pago !== undefined ? e.valor_pago : (e.status === 'RECEBIDO' || e.status === 'PAGO' ? rawTotal : 0));
            const rawNaoPago = e.nao_pago !== undefined ? e.nao_pago : (e.status === 'PENDENTE' || e.status === 'ATRASADO' ? rawTotal : 0);

            return {
                id: e.id || "N/A",
                tipo,
                data_vencimento: e.data_vencimento || null,
                total: isNaN(parseFloat(rawTotal)) ? 0 : parseFloat(rawTotal),
                pago: isNaN(parseFloat(rawPago)) ? 0 : parseFloat(rawPago),
                nao_pago: isNaN(parseFloat(rawNaoPago)) ? 0 : parseFloat(rawNaoPago),
                status: e.status?.toUpperCase() || "PENDENTE",
                categorias: (e.categorias || []).map((c: any) => ({
                    id: c.id || "N/A",
                    nome: c.nome || "N/A"
                })),
                centros_custo: (e.centros_custo || []).map((c: any) => ({
                    id: c.id || "N/A",
                    nome: c.nome || "N/A"
                })),
                cliente: e.cliente ? {
                    id: e.cliente.id || "N/A",
                    nome: e.cliente.nome || "Desconhecido"
                } : null
            };
        };

        const eventos = [
            ...contasReceber.map((e: any) => mapEvento(e, "RECEITA")),
            ...contasPagar.map((e: any) => mapEvento(e, "DESPESA"))
        ];

        const payload = {
            saldoCaixaAtual,
            eventos,
            contratos: contratos.map((c: any) => ({
                id: c.id || "N/A",
                cliente_id: c.cliente?.id || c.client_id || "N/A",
                data_inicio: c.data_inicio || c.start_date || null
            })),
            metadata: {
                lastUpdated: new Date().toISOString()
            }
        };

        if (dbRef) {
            try {
                await setDocFn(docFn(dbRef, "dashboards", "financeiro"), payload, { merge: true });
                console.log('[CRON FINANCEIRO] Dados financeiros salvos com sucesso.');
            } catch (firestoreErr: any) {
                console.warn('[CRON FINANCEIRO] Erro ao salvar dados no Firestore, provavelmente limite de cota:', firestoreErr.message);
            }
        }

        return payload;

    } catch (err: any) {
        console.error('[CRON FINANCEIRO] Falha critica:', err.message);
        return null;
    }
}
