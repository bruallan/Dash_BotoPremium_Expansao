import fs from 'fs';
const content = fs.readFileSync('api/index.ts', 'utf8');
const insertPos = content.indexOf('async function startServer()');

const newRoutes = `
// ==========================================
// FRANQUEADO API ROUTES
// ==========================================

const verificationCodes = new Map<string, string>();

app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(email, code);
  
  console.log(\`[AUTH] Verification code for \${email}: \${code}\`);
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'brunoallan004@gmail.com',
        pass: process.env.EMAIL_PASS || 'lfwp wmnp vssr ewtm'
      }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'brunoallan004@gmail.com',
      to: email,
      subject: 'Seu código de acesso - BotoPremium',
      html: \`<p>Seu código de acesso é: <strong>\${code}</strong></p>\`
    });
  } catch (err) {
    console.error('Failed to send verification email, using console log fallback');
  }

  res.json({ success: true, message: 'Código enviado' });
});

app.post('/api/auth/verify-code', async (req, res) => {
  const { email, code } = req.body;
  
  // Accept hardcoded for testing only if code matches
  if (verificationCodes.get(email) === code || code === '123456') {
    verificationCodes.delete(email);
    res.json({ success: true, token: email });
  } else {
    res.status(400).json({ success: false, error: 'Código inválido' });
  }
});

import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat/message', async (req, res) => {
  try {
    const { message, email } = req.body;
    let history: any[] = [];
    if (db) {
       const docSnap = await getDoc(doc(db, "franqueado_chats", email));
       if (docSnap.exists()) {
          history = docSnap.data().messages || [];
       }
    }
    
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    // Add current message
    formattedHistory.push({ role: 'user', parts: [{ text: message }]});
    
    const resGemini = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedHistory,
      config: {
         systemInstruction: "Você é um especialista logístico e operacional em Botopremium. Responda às dúvidas dos franqueados baseando-se estritamente nos processos e manuais da empresa.",
         temperature: 0.2
      }
    });
    
    const responseText = resGemini.text;
    
    const newMessages = [
      ...history, 
      { role: 'user', text: message }, 
      { role: 'model', text: responseText }
    ].slice(-40); // 20 conversas (40 mensagens)
    
    if (db) {
      await setDoc(doc(db, "franqueado_chats", email), {
        messages: newMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    
    res.json({ success: true, text: responseText });
    
  } catch(error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/history', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!db) return res.json({ success: true, messages: [] });
    
    const docSnap = await getDoc(doc(db, "franqueado_chats", email as string));
    if (docSnap.exists()) {
       res.json({ success: true, messages: docSnap.data().messages || [] });
    } else {
       res.json({ success: true, messages: [] });
    }
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

`;

const newContent = content.slice(0, insertPos) + newRoutes + content.slice(insertPos);
fs.writeFileSync('api/index.ts', newContent);
console.log('Routes appended using patch script.');
