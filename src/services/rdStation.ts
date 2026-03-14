import axios from "axios";

const RD_TOKEN = process.env.RD_CRM_TOKEN;
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
