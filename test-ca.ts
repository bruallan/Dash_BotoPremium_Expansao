import { getContasReceber } from './api/services/contaAzul.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await getContasReceber('2025-01-01', '2025-01-31');
    console.log('Success:', res.length);
  } catch (e: any) {
    console.error('Failed', e.response?.data || e.message);
  }
}
run();
