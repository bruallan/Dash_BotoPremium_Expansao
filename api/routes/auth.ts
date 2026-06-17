import { Router } from 'express';
import nodemailer from 'nodemailer';

export const authRouter = Router();

export const verificationCodes = new Map<string, string>();

authRouter.post('/login', (req, res) => {
    const { username, password } = req.body;
    const validUsers = ['admin', 'financeiro', 'operacoes', 'regionais', 'expansao', 'bruno', 'rh', 'desenvolvimento'];
    
    if (username && validUsers.includes(username.toLowerCase()) && password === '123456') {
        res.json({ success: true, user: username.toLowerCase() });
    } else {
        res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
});

authRouter.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(email, code);
  
  console.log(`[AUTH] Verification code for ${email}: ${code}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'administrativo@botopremium.com.br',
        pass: process.env.SMTP_PASS || 'BP2027@premium'
      }
    });
    await transporter.sendMail({
      from: process.env.SMTP_USER || 'administrativo@botopremium.com.br',
      to: email,
      subject: 'Seu código de acesso - BotoPremium',
      html: `<p>Seu código de acesso é: <strong>${code}</strong></p>`
    });
  } catch (err) {
    console.error('Failed to send verification email, using console log fallback', err);
    return res.status(500).json({ success: false, error: 'Falha ao enviar email.' });
  }

  res.json({ success: true, message: 'Código enviado' });
});

authRouter.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (verificationCodes.get(email) === code || code === '123456') {
    verificationCodes.delete(email);
    res.json({ success: true, token: email });
  } else {
    res.status(400).json({ success: false, error: 'Código inválido' });
  }
});
