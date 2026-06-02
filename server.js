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

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCIvFqIbniPqFYzkJS9hg+GLj/fee3e9iEH/P0dufEU1QKGmm/0ie3QNx2NNww5qpPliKeuGytCA1/+MDw5quWHjHbHgn1YF4p+gtzX4IAmReZBlpRVkTCPHnfmyiWBhN5ofaOzBJFllOb8qXOajuJf3snSmYpt15YGJCaIQ0p+xgTxG1MuILGaRlwVJUmqMRJNkoFAQgLmNOsGvKUthI7idiHnY/8KATkpp5Iwd2DQgsLJNVhViQSKgbB0kkrrJaNxH7kIEDspt9b25E5kiH0p53nTRJaSMLtwWTnF81S6YnEeBb+Z1q4In08jP8YlD6/yh2ttZonsZAmAkyBc0HF9AgMBAAECggEAA6JuDZ5SGg9xayF2sqrzkq98Byaoifqk2h+BYt7kZ5dZ39YPD8LyzUwJvw0tiALet4UwX9JdDf4k+Q6zKx09yKKVLaxsRIErrz0vPZW8EkhdXHTyMGwRjFxU9497+7taZhCg30tJyhdxJFoktoEBx2aWmsB2C4FlfXhMheaz/jafTEFRd6iMJKCXJ6k2mKCOE8uJ1Dpf5742vjqR0hTNrHU5i4f0D+k0tq0IcN4udQ/hRvPCEcNFdPeP0X1SjSCXQrvPfInsT4QhAnxZ3P+fPCfgHkAmV/l/Pew4AfDpQHt+wfWXTA9BEjya4IHTDpXSL3Fa8JDJtbWG1B/KWUwmiQKBgQC+4U+6LNnnfBbNF8lrJksd66IUZgYL8uYHOXqX69zNGrvTKee3N0Bsf1sSp5hYn9SJmHsMqCQNyxRhVXaGSX4VnN3rRtIHEE/CPGQpPEK9Xm77EVsjR6zZ3Qk0jSbv/kusv30dNALZlfnfufmlDtIDqATxU/FSUaWTa2t2MGPOWwKBgQC3Ykt90j94h+MsMoDdXO6rJXL6jclRdX66ADTRfv3o+ryokS2SNCWFQuDC2xNystXaIix6evAZsEmhQ2LjuGl7HiqNVgz+sGoPpEHIq28oKtRzRrjd9sXVUPeP7SCSYXQMwKZt1pwdHqJVFt/pLsz9hRD4M1zIIzuXDWwT0rT3BwKBgQCtvV9YUmK0tNn8K96FzQEqZsPMVWDDl3+Qq9zOUz1S4zZ66fWjaoMVPoai4DFm2XQXGddGmfTXKTWPsr6DVHmTKolEEd4x18MBRP7WGaeVvlK96/pMjnzigLJURvZeE9TFlDZJUoIVktExtpFoj6jQ8yosjv9ksjRHjsrtdPYjaQKBgH085tttu6UAAHgNoY4Lyn8dWzGbpTI5cKtsOqYb+SGkIzVnuFyRulIRA1hvrw907LFFB2U6EkEo8I/ualmkdnz7dAoEC2ngZv55qed2lLo0zdRQJy6HOkJdQkSLp+PwJAYVh1OZ7hHA+xHrRk2EhcBZoOYwhZu03BxjsTy0eJv/AoGBALtp9MRHcqo9giinKPNc/f/jEblTA57M8wrzQg+e9020LHF9zkzwz//Z5nc/fGbYUteQ6UdgOPTvnb5GXKtkEb6AHVRRRRbJLsDPZGuruTSsHNfNdmLM8lcp5m1CjmyROd0AFQo1I9RuWWB9WzbDzwik8ED0P3/UKmzHBw/xYbKM-----END PRIVATE KEY-----`;
const API_KEY      = 'xFHJgzDc97hMPpMmv74xhqQL56QwT94k';
const MID          = '457VPECOM';
const REDIRECT_URL = 'https://evirtualpay.com/pg/billings/acceleratewizz/payment/complete.php';

app.post('/api/pay', async (req, res) => {
  const { first_name, last_name, email, mobile, pan, expiry_date, cvv, zip } = req.body;

  if (!first_name || !email || !pan || !expiry_date || !cvv || !mobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Step 1: POST to Virtual Pay — get back the fully populated card page
    const payload = new URLSearchParams({
      FIRST_NAME:   first_name,
      LAST_NAME:    last_name || '-',
      EMAIL:        email,
      MOBILE:       mobile,
      DESCRIPTION:  'Order payment',
      COUNTRY:      'CY',
      CITY:         'Limassol',
      AMOUNT:       '107',
      CURRENCY:     'USD',
      REQUESTID:    'REQ-' + Date.now(),
      REDIRECT_URL: REDIRECT_URL,
      MID:          MID,
      API_KEY:      API_KEY,
      PRIVATE_KEY:  PRIVATE_KEY,
    });

    const response = await fetch(`${BASE}/index.php`, {
      method:   'POST',
      redirect: 'manual',
      headers: {
        'Content-Type':    'application/x-www-form-urlencoded',
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin':          'https://evirtualpay.com',
        'Referer':         `${BASE}/checkout.html`,
      },
      body: payload.toString(),
    });

    const status = response.status;

    // If redirect, send URL to client
    if ([301,302,303,307,308].includes(status)) {
      const location = response.headers.get('location') || '';
      const target = location.startsWith('http') ? location : `${BASE}/${location}`;
      return res.json({ redirectUrl: target });
    }

    let html = await response.text();

    // Fix all relative asset URLs so they load from Virtual Pay's domain
    html = html
      .replace(/src="(?!http)(js\/|img\/|styles\/)/g, `src="${BASE}/$1`)
      .replace(/href="(?!http)(styles\/|img\/)/g, `href="${BASE}/$1`);

    // Hide the payment method selector — jump straight to card panel
    html = html.replace(
      'id="main-navigation"',
      'id="main-navigation" style="display:none;"'
    );
    html = html.replace(
      'id="card-pay" style="display:none;"',
      'id="card-pay" style="display:block;"'
    );

    // Pre-fill the card fields with what the client entered on our form
    html = html.replace(
      'id="pan" name="pan"',
      `id="pan" name="pan" value="${pan}"`
    );
    html = html.replace(
      'id="cvv" name="cvv"',
      `id="cvv" name="cvv" value="${cvv}"`
    );
    html = html.replace(
      'id="expiry_date"',
      `id="expiry_date" value="${expiry_date}"`
    );
    if (zip) {
      html = html.replace(
        'id="zip" placeholder="Postal Code" name="zip"',
        `id="zip" placeholder="Postal Code" name="zip" value="${zip}"`
      );
    }

    // Inject a script that auto-clicks Pay as soon as the page loads
    const autoClick = `
<script>
  window.addEventListener('load', function() {
    setTimeout(function() {
      var btn = document.getElementById('pay_button');
      if (btn) btn.click();
    }, 800);
  });
<\/script>`;
    html = html.replace('</body>', autoClick + '\n</body>');

    // Serve the modified Virtual Pay page directly to the client browser
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Security-Policy', '');
    return res.send(html);

  } catch (err) {
    console.error('Relay error:', err.message);
    return res.status(500).json({ error: 'Relay failed: ' + err.message });
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
