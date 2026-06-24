import { subMonths } from 'date-fns';
import nodemailer from 'nodemailer';

export async function runFinanceCron(
    requestFn: any, 
    fetchAllPagesFn: any, 
    dbRef: any, 
    setDocFn: any, 
    docFn: any
) {
    const executionLogs: string[] = [];
    const logEvent = (msg: string) => {
        console.log(`[CRON FINANCEIRO] ${msg}`);
        executionLogs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    logEvent('Iniciando processamento financeiro...');
    
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
               logEvent(`Erro ao buscar contas: ${e.message}`);
            }
        }

        logEvent('Buscando Contas a Receber...');
        const contasReceber = await fetchAllPagesFn("/v1/financeiro/contas-receber", {
            vencimento_de: minDate,
            vencimento_ate: maxDate,
        });
        logEvent(`Contas a Receber carregadas: ${contasReceber?.length || 0} registros.`);

        logEvent('Buscando Contas a Pagar...');
        const contasPagar = await fetchAllPagesFn("/v1/financeiro/contas-pagar", {
            vencimento_de: minDate,
            vencimento_ate: maxDate,
        });
        logEvent(`Contas a Pagar carregadas: ${contasPagar?.length || 0} registros.`);

        let contratos: any[] = [];
        try {
            contratos = await fetchAllPagesFn("/v1/contratos", {});
            logEvent(`Contratos carregados: ${contratos?.length || 0} registros.`);
        } catch (e) {
            logEvent(`Erro contratos: ${e}`);
        }

        // Simplificar cada item para caber no limite do Firestore
        const mapEvento = (e: any, tipo: "RECEITA" | "DESPESA") => {
            const rawTotal = e.total !== undefined ? e.total : (e.valor !== undefined ? e.valor : 0);
            
            // Normalize status based on original, translated, or mapped
            let normalizedStatus = (e.status_traduzido || e.status || "PENDENTE").toUpperCase();
            if (e.status === 'ACQUITTED') normalizedStatus = 'RECEBIDO';
            if (e.status === 'OVERDUE') normalizedStatus = 'ATRASADO';
            
            const rawPago = e.pago !== undefined ? e.pago : (e.valor_pago !== undefined ? e.valor_pago : (normalizedStatus === 'RECEBIDO' || normalizedStatus === 'PAGO' ? rawTotal : 0));
            const rawNaoPago = e.nao_pago !== undefined ? e.nao_pago : (normalizedStatus === 'PENDENTE' || normalizedStatus === 'ATRASADO' ? rawTotal : 0);

            // Tentar descobrir a melhor data para considerar o mês (competência ou pagamento)
            // Se tiver data_pagamento na original usamos, senao usamos competencia se disponivel pra ajudar, mas por padrao vencimento
            const dataBase = e.data_vencimento || e.data_competencia || e.data_criacao || null;

            return {
                id: e.id || "N/A",
                tipo,
                data_vencimento: dataBase,
                total: isNaN(parseFloat(rawTotal)) ? 0 : parseFloat(rawTotal),
                pago: isNaN(parseFloat(rawPago)) ? 0 : parseFloat(rawPago),
                nao_pago: isNaN(parseFloat(rawNaoPago)) ? 0 : parseFloat(rawNaoPago),
                status: normalizedStatus,
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
                logEvent('Dados financeiros salvos com sucesso.');
            } catch (firestoreErr: any) {
                logEvent(`Erro ao salvar dados no Firestore, provavelmente limite de cota: ${firestoreErr.message}`);
            }
        }

        return payload;

    } catch (err: any) {
        logEvent(`Falha critica: ${err.message}`);
        return null;
    } finally {
        try {
            const { EMAIL_USER, EMAIL_PASS } = process.env;
            if (EMAIL_USER && EMAIL_PASS) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: EMAIL_USER,
                        pass: EMAIL_PASS,
                    },
                });
                
                await transporter.sendMail({
                    from: EMAIL_USER,
                    to: "brunoallan004@gmail.com",
                    subject: "Log de Sincronizacao Financeira API",
                    text: executionLogs.join("\n"),
                });
                logEvent("E-mail de log enviado com sucesso.");
            }
        } catch (mailError: any) {
            console.error("[CRON FINANCEIRO] Erro ao enviar e-mail de log:", mailError.message);
        }
    }
}
