const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL_API_KEY = process.env.MODEL_API_KEY;
const MODEL = process.env.MODEL || 'muse-spark-1.3';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'MY FAVORITE AI backend', configured: Boolean(MODEL_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!MODEL_API_KEY) return res.status(503).json({ error: 'Backend API key is not configured. Set MODEL_API_KEY in hosting environment.' });
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    if (message.length > 8000) return res.status(413).json({ error: 'Message is too long (maximum 8,000 characters).' });

    const upstream = await fetch('https://api.meta.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are MY FAVORITE AI, a helpful, friendly assistant. Reply clearly in the language used by the user. Be especially comfortable with Urdu and Roman Urdu.' },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Meta API error:', upstream.status, data);
      return res.status(502).json({ error: data?.error?.message || `AI provider returned HTTP ${upstream.status}` });
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'AI provider returned an empty response.' });
    res.json({ reply });
  } catch (err) {
    console.error('Chat route error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`MY FAVORITE AI running on port ${PORT}`));
