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

const BASE = 'https://evirtualpay.com/pg/billings/acceleratewizz/payment';

function log(label, data) {
  console.log('\n' + '='.repeat(60));
  console.log(`[${new Date().toISOString()}] ${label}`);
  console.log('='.repeat(60));
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

app.post('/api/pay', async (req, res) => {
  const { first_name, last_name, email, mobile, pan, expiry_date, cvv, zip } = req.body;

  log('INCOMING REQUEST', {
    first_name,
    last_name,
    email,
    mobile,
    pan: pan ? pan.slice(0,4) + '************' : null, // mask for safety
    expiry_date,
    cvv: '***',
    zip,
  });

  if (!first_name || !email || !pan || !expiry_date || !cvv || !mobile) {
    log('VALIDATION FAILED', { missing: { first_name: !first_name, email: !email, pan: !pan, expiry_date: !expiry_date, cvv: !cvv, mobile: !mobile } });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // ── STEP 1: POST customer info ────────────────────────────────────
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

    log('STEP 1 — REQUEST TO VIRTUAL PAY', {
      url: `${BASE}/index.php`,
      method: 'POST',
      body: Object.fromEntries(step1Body),
    });

    const step1 = await fetch(`${BASE}/index.php`, {
      method:   'POST',
      redirect: 'manual',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin':        'https://evirtualpay.com',
        'Referer':       `${BASE}/checkout.html`,
      },
      body: step1Body.toString(),
    });

    const step1Status   = step1.status;
    const step1Headers  = Object.fromEntries(step1.headers.entries());
    const step1Cookies  = step1.headers.get('set-cookie') || '';
    const step1Location = step1.headers.get('location')   || '';
    const step1Body2    = await step1.text();

    log('STEP 1 — RESPONSE', {
      status:   step1Status,
      location: step1Location,
      cookies:  step1Cookies,
      headers:  step1Headers,
      body_preview: step1Body2.slice(0, 500),
    });

    if ([301,302,303,307,308].includes(step1Status) && step1Location) {
      const target = step1Location.startsWith('http') ? step1Location : `${BASE}/${step1Location}`;
      log('STEP 1 REDIRECT → SENDING TO CLIENT', { redirectUrl: target });
      return res.json({ redirectUrl: target });
    }

    // ── STEP 2: POST card data with cookies ───────────────────────────
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

    log('STEP 2 — REQUEST TO VIRTUAL PAY', {
      url: `${BASE}/index.php`,
      method: 'POST',
      cookies_sent: step1Cookies,
      body: { ...Object.fromEntries(step2Body), pan: pan.slice(0,4)+'************', cvv: '***' },
    });

    const step2 = await fetch(`${BASE}/index.php`, {
      method:   'POST',
      redirect: 'manual',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin':        'https://evirtualpay.com',
        'Referer':       `${BASE}/index.php`,
        'Cookie':        step1Cookies,
      },
      body: step2Body.toString(),
    });

    const step2Status   = step2.status;
    const step2Headers  = Object.fromEntries(step2.headers.entries());
    const step2Location = step2.headers.get('location') || '';
    const step2BodyText = await step2.text();

    log('STEP 2 — RESPONSE', {
      status:   step2Status,
      location: step2Location,
      headers:  step2Headers,
      body_preview: step2BodyText.slice(0, 800),
      body_length: step2BodyText.length,
    });

    if ([301,302,303,307,308].includes(step2Status) && step2Location) {
      const target = step2Location.startsWith('http') ? step2Location : `${BASE}/${step2Location}`;
      log('STEP 2 REDIRECT → SENDING TO CLIENT', { redirectUrl: target });
      return res.json({ redirectUrl: target });
    }

    // Look for 3DS or ACS URL inside the response body
    const urlMatch = step2BodyText.match(/https?:\/\/[^\s"'<>]*(3ds|cardinal|acs|authenticate|songbird)[^\s"'<>]*/i);
    if (urlMatch) {
      log('FOUND 3DS URL IN BODY', { redirectUrl: urlMatch[0] });
      return res.json({ redirectUrl: urlMatch[0] });
    }

    // Look for meta refresh redirect
    const metaMatch = step2BodyText.match(/content=["']?\d+;\s*url=([^"'\s>]+)/i);
    if (metaMatch) {
      log('FOUND META REFRESH', { redirectUrl: metaMatch[1] });
      return res.json({ redirectUrl: metaMatch[1] });
    }

    // Nothing found — return full debug to client
    log('NO REDIRECT FOUND — returning debug to client', { status: step2Status });
    return res.json({
      status: step2Status,
      debug:  step2BodyText.slice(0, 3000),
    });

  } catch (err) {
    log('FATAL ERROR', { message: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Payment relay failed: ' + err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
});
