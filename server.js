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

const BASE        = 'https://evirtualpay.com/pg/billings/acceleratewizz/payment';
const API_KEY     = 'xFHJgzDc97hMPpMmv74xhqQL56QwT94k';
const MID         = '457VPECOM';
const REDIRECT_URL = 'https://evirtualpay.com/pg/billings/acceleratewizz/payment/complete.php';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCIvFqIbniPqFYzkJS9hg+GLj/fee3e9iEH/P0dufEU1QKGmm/0ie3QNx2NNww5qpPliKeuGytCA1/+MDw5quWHjHbHgn1YF4p+gtzX4IAmReZBlpRVkTCPHnfmyiWBhN5ofaOzBJFllOb8qXOajuJf3snSmYpt15YGJCaIQ0p+xgTxG1MuILGaRlwVJUmqMRJNkoFAQgLmNOsGvKUthI7idiHnY/8KATkpp5Iwd2DQgsLJNVhViQSKgbB0kkrrJaNxH7kIEDspt9b25E5kiH0p53nTRJaSMLtwWTnF81S6YnEeBb+Z1q4In08jP8YlD6/yh2ttZonsZAmAkyBc0HF9AgMBAAECggEAA6JuDZ5SGg9xayF2sqrzkq98Byaoifqk2h+BYt7kZ5dZ39YPD8LyzUwJvw0tiALet4UwX9JdDf4k+Q6zKx09yKKVLaxsRIErrz0vPZW8EkhdXHTyMGwRjFxU9497+7taZhCg30tJyhdxJFoktoEBx2aWmsB2C4FlfXhMheaz/jafTEFRd6iMJKCXJ6k2mKCOE8uJ1Dpf5742vjqR0hTNrHU5i4f0D+k0tq0IcN4udQ/hRvPCEcNFdPeP0X1SjSCXQrvPfInsT4QhAnxZ3P+fPCfgHkAmV/l/Pew4AfDpQHt+wfWXTA9BEjya4IHTDpXSL3Fa8JDJtbWG1B/KWUwmiQKBgQC+4U+6LNnnfBbNF8lrJksd66IUZgYL8uYHOXqX69zNGrvTKee3N0Bsf1sSp5hYn9SJmHsMqCQNyxRhVXaGSX4VnN3rRtIHEE/CPGQpPEK9Xm77EVsjR6zZ3Qk0jSbv/kusv30dNALZlfnfufmlDtIDqATxU/FSUaWTa2t2MGPOWwKBgQC3Ykt90j94h+MsMoDdXO6rJXL6jclRdX66ADTRfv3o+ryokS2SNCWFQuDC2xNystXaIix6evAZsEmhQ2LjuGl7HiqNVgz+sGoPpEHIq28oKtRzRrjd9sXVUPeP7SCSYXQMwKZt1pwdHqJVFt/pLsz9hRD4M1zIIzuXDWwT0rT3BwKBgQCtvV9YUmK0tNn8K96FzQEqZsPMVWDDl3+Qq9zOUz1S4zZ66fWjaoMVPoai4DFm2XQXGddGmfTXKTWPsr6DVHmTKolEEd4x18MBRP7WGaeVvlK96/pMjnzigLJURvZeE9TFlDZJUoIVktExtpFoj6jQ8yosjv9ksjRHjsrtdPYjaQKBgH085tttu6UAAHgNoY4Lyn8dWzGbpTI5cKtsOqYb+SGkIzVnuFyRulIRA1hvrw907LFFB2U6EkEo8I/ualmkdnz7dAoEC2ngZv55qed2lLo0zdRQJy6HOkJdQkSLp+PwJAYVh1OZ7hHA+xHrRk2EhcBZoOYwhZu03BxjsTy0eJv/AoGBALtp9MRHcqo9giinKPNc/f/jEblTA57M8wrzQg+e9020LHF9zkzwz//Z5nc/fGbYUteQ6UdgOPTvnb5GXKtkEb6AHVRRRRbJLsDPZGuruTSsHNfNdmLM8lcp5m1CjmyROd0AFQo1I9RuWWB9WzbDzwik8ED0P3/UKmzHBw/xYbKM-----END PRIVATE KEY-----`;

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

app.post('/api/pay', (req, res) => {
  const { first_name, last_name, email, mobile, pan, expiry_date, cvv, zip } = req.body;

  if (!first_name || !email || !pan || !expiry_date || !cvv || !mobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const requestID = 'REQ-' + Date.now();

  // We serve a bridge page that:
  // 1. POSTs the customer info to Virtual Pay (creates the session)
  // 2. When Virtual Pay responds with the card page, we intercept it in an iframe
  // 3. We inject the card data and auto-click Pay
  // All happens on evirtualpay.com so Cardinal 3DS sees the correct origin

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting to payment...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0f; color: #f0eeff;
      font-family: sans-serif; min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 16px;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(120,100,255,0.2);
      border-top-color: #7864ff; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 13px; color: rgba(240,238,255,0.4); letter-spacing: 0.05em; }

    /* Full-screen iframe shown after VP loads */
    #vp_frame {
      display: none;
      position: fixed; inset: 0;
      width: 100%; height: 100%;
      border: none; background: #fff;
      z-index: 10;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Connecting to payment gateway...</p>

  <!-- iframe named "vp_target" — our form posts INTO it -->
  <iframe id="vp_frame" name="vp_target"></iframe>

  <!-- Hidden form posts to VP, result loads inside the iframe -->
  <form id="vp_form" method="POST"
    action="${BASE}/index.php"
    target="vp_target"
    style="display:none;">
    <input type="hidden" name="FIRST_NAME"   value="${esc(first_name)}">
    <input type="hidden" name="LAST_NAME"    value="${esc(last_name || '-')}">
    <input type="hidden" name="EMAIL"        value="${esc(email)}">
    <input type="hidden" name="MOBILE"       value="${esc(mobile)}">
    <input type="hidden" name="DESCRIPTION"  value="Order payment">
    <input type="hidden" name="COUNTRY"      value="CY">
    <input type="hidden" name="CITY"         value="Limassol">
    <input type="hidden" name="AMOUNT"       value="107">
    <input type="hidden" name="CURRENCY"     value="USD">
    <input type="hidden" name="REQUESTID"    value="${requestID}">
    <input type="hidden" name="REDIRECT_URL" value="${REDIRECT_URL}">
    <input type="hidden" name="MID"          value="${MID}">
    <input type="hidden" name="API_KEY"      value="${API_KEY}">
    <input type="hidden" name="PRIVATE_KEY"  value="${esc(PRIVATE_KEY)}">
  </form>

  <script>
    var pan      = "${esc(pan)}";
    var cvv      = "${esc(cvv)}";
    var expiry   = "${esc(expiry_date)}";
    var zip      = "${esc(zip || '')}";

    var frame = document.getElementById('vp_frame');
    var attempts = 0;

    function injectAndPay() {
      attempts++;
      if (attempts > 40) return; // give up after ~8s

      try {
        var doc = frame.contentDocument || frame.contentWindow.document;
        if (!doc || !doc.body || doc.body.innerHTML.trim() === '') {
          setTimeout(injectAndPay, 200);
          return;
        }

        // Show the iframe, hide spinner
        frame.style.display = 'block';

        // Hide payment method selector, show card panel
        var nav = doc.getElementById('main-navigation');
        var cardPay = doc.getElementById('card-pay');
        if (nav) nav.style.display = 'none';
        if (cardPay) cardPay.style.display = 'block';

        // Fill in card fields
        var panField    = doc.getElementById('pan');
        var cvvField    = doc.getElementById('cvv');
        var expiryField = doc.getElementById('expiry_date');
        var zipField    = doc.getElementById('zip');

        if (panField)    { panField.value    = pan;    panField.dispatchEvent(new Event('input')); }
        if (cvvField)    { cvvField.value    = cvv;    cvvField.dispatchEvent(new Event('input')); }
        if (expiryField) { expiryField.value = expiry; expiryField.dispatchEvent(new Event('input')); }
        if (zipField && zip) { zipField.value = zip; }

        // Wait a beat then click Pay
        setTimeout(function() {
          var payBtn = doc.getElementById('pay_button');
          if (payBtn) {
            payBtn.click();
          } else {
            // Try calling pay() directly
            try { frame.contentWindow.pay(); } catch(e) {}
          }
        }, 600);

      } catch(e) {
        // Cross-origin block — frame navigated to VP
        // VP is now handling it natively, just show the frame
        frame.style.display = 'block';
      }
    }

    // Submit form into iframe, then start polling for content
    document.getElementById('vp_form').submit();
    setTimeout(injectAndPay, 1000);

    // When iframe navigates (e.g. to 3DS or complete page), go full screen
    frame.addEventListener('load', function() {
      frame.style.display = 'block';
      setTimeout(injectAndPay, 400);
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.send(html);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(PORT, () => {
  console.log('Payment server running on http://localhost:' + PORT);
});
