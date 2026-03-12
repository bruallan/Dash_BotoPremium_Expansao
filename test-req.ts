import axios from 'axios';
async function run() {
  try {
    const res = await axios.get('http://localhost:3000/api/dashboard?startDate=2025-01-01&endDate=2025-01-31');
    console.log('Success', res.data.dados.debug.errors);
  } catch (e: any) {
    console.error('Failed', e.response?.data || e.message);
  }
}
run();
