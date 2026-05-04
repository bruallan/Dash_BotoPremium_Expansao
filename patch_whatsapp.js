import fs from 'fs';

let content = fs.readFileSync('api/index.ts', 'utf8');

const anchor = "app.get('/api/chat/history'";
const anchorIdx = content.indexOf(anchor);

const whatsappRoutes = `
// ==========================================
// WHATSAPP API ROUTES
// ==========================================

app.get('/api/whatsapp/webhook', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'botopremium_verify_token';
  
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
      res.sendStatus(400);
  }
});

app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    let body = req.body;

    if (body.object) {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const messageObj = change?.value?.messages?.[0];

      if (messageObj) {
        // Obter variáveis de ambiente ou usar as fornecidas pelo usuário
        let phone_number_id = process.env.WHATSAPP_PHONE_ID || '1166257203227529';
        let whatsapp_token = process.env.WHATSAPP_TOKEN || 'EAAi9ZAZAvaAqQBRbY1KpELQn5KxQ4J9qUHYhmWpDQpY5ZCNknGaHnZCeVQoNYCHYJV8zbGD0ZC8IoK4MRmFXV6f9mqpmMuvMkPlIFmCMjnJm1yJ8ZCJ8UoCQdERZA9JwBWeuik5hTtZA24kUFxORTsKHvxItYhCMJIYPZALVunQZBOTxiqBpN5SUTZA6tmsqEHadO23dgZDZD';
        
        let from = messageObj.from;
        let msg_body = messageObj.text?.body;
        
        if (msg_body) {
            console.log(\`WhatsApp message received from \${from}: \${msg_body}\`);
            
            // Gerar resposta com Gemini
            const ai = getAi();
            let history: any[] = [];
            
            if (db) {
               try {
                   const docSnap = await getDoc(doc(db, "whatsapp_chats", from));
                   if (docSnap.exists()) {
                      history = docSnap.data().messages || [];
                   }
               } catch (e) {
                   console.error("Erro ao buscar histórico do firebase:", e);
               }
            }
            
            const formattedHistory = history.map((msg: any) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }]
            }));
            
            formattedHistory.push({ role: 'user', parts: [{ text: msg_body }]});
            
            let responseText = "Desculpe, ocorreu um erro ao processar sua solicitação.";
            
            try {
                const resGemini = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: formattedHistory,
                  config: {
                     systemInstruction: "Você é um assistente especialista logístico e operacional em Botopremium falando pelo WhatsApp. Responda às dúvidas dos franqueados baseando-se estritamente nos processos e manuais da empresa. Seja claro e conciso.",
                     temperature: 0.2
                  }
                });
                responseText = resGemini.text;
            } catch (aiError) {
                console.error("Erro na geração de IA via WhatsApp:", aiError);
                responseText = "Estou com problemas para pensar no momento (Verifique a API Key do Gemini nas configurações).";
            }
            
            // Salvar histórico
            const newMessages = [
              ...history, 
              { role: 'user', text: msg_body }, 
              { role: 'model', text: responseText }
            ].slice(-40);
            
            if (db) {
              try {
                  await setDoc(doc(db, "whatsapp_chats", from), {
                    messages: newMessages,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
              } catch (e) {
                  console.error("Erro ao salvar histórico do firebase:", e);
              }
            }
            
            // Enviar resposta de volta para o WhatsApp
            console.log("Enviando resposta via WhatsApp...");
            try {
                await axios.post(
                    \`https://graph.facebook.com/v17.0/\${phone_number_id}/messages\`,
                    {
                       messaging_product: "whatsapp",
                       to: from,
                       text: { body: responseText }
                    },
                    {
                       headers: {
                           "Authorization": \`Bearer \${whatsapp_token}\`,
                           "Content-Type": "application/json"
                       }
                    }
                );
                console.log("Resposta enviada via WhatsApp com sucesso.");
            } catch (wppError: any) {
                console.error("Erro ao enviar mensagem WhatsApp:", wppError.response?.data || wppError.message);
            }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('WhatsApp webhook global error:', error);
    res.sendStatus(500);
  }
});

`;

content = content.slice(0, anchorIdx) + whatsappRoutes + content.slice(anchorIdx);
fs.writeFileSync('api/index.ts', content);
console.log("WhatsApp routes patched.");
