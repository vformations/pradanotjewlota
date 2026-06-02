require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.static(path.join(__dirname, 'public')));

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Origin': 'https://evirtualpay.com',
  'Referer': 'https://evirtualpay.com/pg/billings/acceleratewizz/payment/checkout.html',
};

const BASE = 'https://evirtualpay.com/pg/billings/acceleratewizz/payment';

// ── Payment relay endpoint ──────────────────────────────────────────
app.post('/api/pay', async (req, res) => {
  const { first_name, last_name, email, mobile, pan, expiry_date, cvv, zip } = req.body;

  if (!first_name || !email || !pan || !expiry_date || !cvv || !mobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // ── Step 1: POST to checkout.html action → get session cookies ──
    const step1Body = new URLSearchParams({
      first_name,
      last_name:   last_name || '-',
      email,
      mobile,
      description: 'Order payment',
      country:     'CY',
      city:        'Limassol',
      amount:      '107',
      currency:    'USD',
      redirectUrl: (process.env.APP_URL || 'http://localhost:' + PORT) + '/success',
    });

    const step1 = await fetch(`${BASE}/index.php`, {
      method:   'POST',
      redirect: 'manual',
      headers:  HEADERS,
      body:     step1Body.toString(),
    });

    // Collect session cookies from step 1
    const cookies = step1.headers.get('set-cookie') || '';
    const location1 = step1.headers.get('location');

    console.log('Step 1 status:', step1.status, '| Location:', location1);

    // If step 1 already gives us a 3DS redirect, send it straight to client
    if ([301, 302, 303, 307, 308].includes(step1.status) && location1) {
      const target = location1.startsWith('http') ? location1 : `${BASE}/${location1}`;
      return res.json({ redirectUrl: target });
    }

    // ── Step 2: POST card data with session cookies ──────────────────
    const step2Body = new URLSearchParams({
      pan,
      expiry_date,
      cvv,
      zip:            zip || '',
      payment_method: 'card',
      channel:        'card',
      first_name,
      last_name:      last_name || '-',
      email,
      mobile,
      amount:         '107',
      currency:       'USD',
      country:        'CY',
      redirectUrl:    (process.env.APP_URL || 'http://localhost:' + PORT) + '/success',
    });

    const step2 = await fetch(`${BASE}/index.php`, {
      method:   'POST',
      redirect: 'manual',
      headers: {
        ...HEADERS,
        'Referer': `${BASE}/index.php`,
        'Cookie':  cookies,
      },
      body: step2Body.toString(),
    });

    const location2 = step2.headers.get('location');
    console.log('Step 2 status:', step2.status, '| Location:', location2);

    // Got a redirect → 3DS URL
    if ([301, 302, 303, 307, 308].includes(step2.status) && location2) {
      const target = location2.startsWith('http') ? location2 : `${BASE}/${location2}`;
      return res.json({ redirectUrl: target });
    }

    // Read body and look for any redirect URL or 3DS link
    const body2 = await step2.text();

    const urlMatch = body2.match(/https?:\/\/[^\s"'<>]*(3ds|cardinal|acs|authenticate)[^\s"'<>]*/i);
    if (urlMatch) return res.json({ redirectUrl: urlMatch[0] });

    const metaMatch = body2.match(/content=["']?\d+;\s*url=([^"'\s>]+)/i);
    if (metaMatch) return res.json({ redirectUrl: metaMatch[1] });

    // Return debug so we can see what Virtual Pay actually sent back
    return res.json({ status: step2.status, debug: body2.slice(0, 3000) });

  } catch (err) {
    console.error('Relay error:', err.message);
    return res.status(500).json({ error: 'Payment relay failed. Please try again.' });
  }
});

// ── Pages ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
});
