(() => {
  'use strict';

  const btn = document.getElementById('btn-scan');
  const fileInput = document.getElementById('scan-file');
  const out = document.getElementById('scan-result');
  if (!btn || !fileInput) return;

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    out.hidden = false;
    out.textContent = 'Reading the image on your phone… (first time takes 10–20 seconds)';

    let text = '';
    try {
      const result = await Tesseract.recognize(file, 'eng', {
  workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/worker.min.js',
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0',
  langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  logger: m => console.log(m) // This prints the progress to the console so you can see it working!
});
      text = (result.data.text || '').trim();
    } catch (e) {
      out.textContent = 'Could not read the image. Try a clearer screenshot.';
      return;
    }

    if (!text) {
      out.textContent = 'No text found in the image.';
      return;
    }

    const verdict = analyze(text);
    renderVerdict(verdict, text);
  });

  const RULES = [
    { re: /\b(otp|one.?time.?(code|pin)|verification code)\b/i, weight: 3, label: 'Asks for OTP / verification code' },
    { re: /\b(send|share|tell|give|read|provide)\b.{0,30}\b(pin|otp|password|cvv|bvn)\b/i, weight: 3, label: 'Asks you to share PIN / OTP / password / BVN' },
    { re: /\b(your\s+)?(pin|password|cvv|bvn)\b.{0,30}\b(to|for)\s+(verify|reactivate|unblock|renew)/i, weight: 3, label: 'Asks for secret info to "verify" or "reactivate"' },
    { re: /\b(safe|secure)\s+account\b/i, weight: 3, label: 'Mentions a "safe account" — classic impersonation trick' },
    { re: /\bdo not (tell|inform|disclose)\b/i, weight: 3, label: 'Tells you to keep it secret' },
    { re: /\b(within|in)\s+\d+\s*(hour|hr|minute|min)/i, weight: 2, label: 'Urgent deadline' },
    { re: /\b(blocked|suspended|restricted|closed|frozen|deactivated)\b/i, weight: 2, label: 'Threatens to block / close your account' },
    { re: /\b(act|act now|urgent|immediately|asap)\b/i, weight: 2, label: 'Pushes you to act immediately' },
    { re: /\b(final (notice|warning)|last chance)\b/i, weight: 2, label: 'Final notice / last chance pressure' },
    { re: /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly)\b/i, weight: 2, label: 'Shortened link hides the real address' },
    { re: /\b(click|tap|open|visit)\b.{0,30}\b(here|link|below)\b/i, weight: 2, label: 'Asks you to click a link' },
    { re: /https?:\/\/[^\s]+/i, weight: 1, label: 'Contains a web link' },
    { re: /\b(you\s+have\s+won|you\s+are\s+a\s+winner|congratulations|claim\s+your|prize|jackpot)\b/i, weight: 2, label: 'Winning / prize claim' },
    { re: /\b(guaranteed|100%|risk.?free|double\s+your)\b/i, weight: 2, label: 'Too-good-to-be-true promise' },
    { re: /\b(processing\s+fee|registration\s+fee|insurance\s+fee|activation\s+fee)\b/i, weight: 3, label: 'Asks you to pay a fee first' },
    { re: /\b(pay|send|transfer)\b.{0,20}(₦|ngn|naira|\$|usd|\d{3,})/i, weight: 2, label: 'Asks you to send money' },
    { re: /\b(free\s+(data|airtime|money))\b/i, weight: 2, label: '"Free" offer' },
    { re: /\b(this\s+is\s+(your\s+)?(bank|customer\s+care|support|fraud\s+team))\b/i, weight: 2, label: 'Claims to be from the bank' },
    { re: /\b(i\s+(lost|changed)\s+my\s+phone|new\s+number|this\s+is\s+[A-Z][a-z]+)\b.{0,40}\b(send|transfer|pay|urgent)/i, weight: 3, label: 'Friend-in-trouble impersonation' },
    { re: /\b(do\s+not\s+call|line\s+is\s+bad|can.?t\s+talk)\b/i, weight: 2, label: 'Tells you not to call' },
    { re: /\b(enter|type)\b.{0,30}\b(pin|your\s+pin)\b.{0,30}\b(for\s+you|i\s+will|help)/i, weight: 3, label: 'Someone offers to enter your PIN for you' },
    { re: /\b(it\s+will\s+reverse|just\s+a\s+test|only\s+a\s+test)\b/i, weight: 3, label: '"It will reverse" stalling trick' },
    { re: /\b(credit\s+alert|transfer\s+successful|payment\s+received)\b/i, weight: 1, label: 'Mentions a payment / credit' },
    { re: /\b(return|refund|reverse)\b.{0,40}\b(₦|ngn|naira|\$|usd|\d{3,})/i, weight: 2, label: 'Asks you to return a "wrong" transfer' },
    { re: /\bno\s+action\s+needed\b/i, weight: -1, label: 'Says no action needed' },
    { re: /\b(never|do\s+not)\s+share\s+this\s+code\b/i, weight: -2, label: 'Warns you never to share the code' },
    { re: /\b(call\s+the\s+number\s+on\s+(the\s+)?(back\s+of\s+your\s+card|your\s+card))\b/i, weight: -2, label: 'Tells you to use the number on your card' },
    { re: /\b(bal(ance)?|acct|account)\s*[:#]?\s*\d/i, weight: -1, label: 'Shows account / balance info' },
  ];

  function analyze(rawText) {
    const text = rawText.replace(/\s+/g, ' ');
    let score = 0;
    const hits = [];
    for (const rule of RULES) {
      if (rule.re.test(text)) {
        score += rule.weight;
        hits.push(rule);
      }
    }
    let verdict, headline;
    if (score >= 5) { verdict = 'scam'; headline = '🚨 Looks like a SCAM'; }
    else if (score >= 3) { verdict = 'suspicious'; headline = '⚠️ Suspicious — be careful'; }
    else if (score >= 1) { verdict = 'unclear'; headline = '🤔 Some warning signs, hard to be sure'; }
    else { verdict = 'real'; headline = '✅ No scam patterns found'; }
    return { verdict, headline, score, hits, text };
  }

  function renderVerdict(v, text) {
    const scamHits = v.hits.filter(h => h.weight > 0);
    const safeHits = v.hits.filter(h => h.weight < 0);

    let html = `<b>${v.headline}</b><br>`;
    html += `<span class="dim">Risk score: ${v.score}</span><br><br>`;

    if (scamHits.length) {
      html += `<b>Warning signs found:</b><ul style="margin:6px 0 10px 18px;padding:0">`;
      html += scamHits.map(h => `<li>${escapeHtml(h.label)}</li>`).join('');
      html += `</ul>`;
    } else {
      html += `<span class="dim">No scam patterns matched.</span><br>`;
    }

    if (safeHits.length) {
      html += `<b>Safe signals:</b><ul style="margin:6px 0 10px 18px;padding:0">`;
      html += safeHits.map(h => `<li>${escapeHtml(h.label)}</li>`).join('');
      html += `</ul>`;
    }

    html += `<details style="margin-top:8px"><summary>Show text read from image</summary>`;
    html += `<p style="font-size:0.85rem;color:#b5aed0;white-space:pre-wrap;margin-top:6px">${escapeHtml(text)}</p>`;
    html += `</details>`;

    html += `<p style="margin-top:10px;font-size:0.85rem" class="dim">This is a guide, not proof. When in doubt, open your banking app yourself.</p>`;

    out.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
})();
