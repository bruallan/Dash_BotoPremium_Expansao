import axios from 'axios';
import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const redis = createClient({ url: process.env.REDIS_URL });
  await redis.connect();
  const token = await redis.get('ca_access_token');
  
  try {
    const res = await axios.get('https://api.contaazul.com/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        data_vencimento_de: '2026-01-01',
        data_vencimento_ate: '2026-01-31'
      }
    });
    console.log('No status works! First item status:', res.data.items?.[0]?.status);
  } catch (e) {
    console.error('No status error:', e.response?.data);
  }
  
  process.exit(0);
}

test();
