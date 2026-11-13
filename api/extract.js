export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: 'Missing image' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: `Questo è un foglio orari settimanale. Cerca la riga "SARA C." ed estrai tutti i suoi turni.

Rispondi SOLO con un JSON array, nessun testo aggiuntivo:
[{"date":"YYYY-MM-DD","shift":"AP-14,30","is_off":false},...]

Regole:
- date: YYYY-MM-DD (leggi le date dalla riga in cima, usa ${new Date().getFullYear()} se manca l'anno)
- shift: testo esatto (AP-14,30 / 15-22 / 13-2,15 / OFF / ecc.)
- is_off: true solo se scritto OFF
- Includi tutti i giorni visibili inclusi gli OFF` }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' });

    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const events = JSON.parse(clean);
    res.status(200).json({ events });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
