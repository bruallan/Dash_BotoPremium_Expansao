
import https from 'https';

const options = {
  hostname: 'botopremium.sults.com.br',
  path: '/api/v1/user',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer O2JvdG9wcmVtaXVtOzE3NjkwMjAwNDg5Mzk='
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(res.headers);
  let data = '';
  res.on('data', d => {
    data += d;
  });
  res.on('end', () => console.log(data.substring(0, 500)));
});

req.on('error', error => {
  console.error(error);
});

req.end();

