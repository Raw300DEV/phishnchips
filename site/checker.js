// PHISHNCHIPS link checker. Pure function, runs in the browser (and in node for tests).
// Nothing is fetched: it reads the link itself. It cannot prove a link is safe; it spots the usual tricks.

// Real domains people get sent during a conference week. Registrable domain -> label shown to the user.
export const OFFICIAL = {
  'phishnchips.xyz': 'PHISHNCHIPS (this site)',
  'solana.com': 'Solana', 'solana.org': 'Solana Foundation',
  'lu.ma': 'Luma', 'luma.com': 'Luma',
  'phantom.app': 'Phantom', 'phantom.com': 'Phantom', 'solflare.com': 'Solflare', 'backpack.app': 'Backpack',
  'jup.ag': 'Jupiter', 'magiceden.io': 'Magic Eden', 'tensor.trade': 'Tensor', 'pump.fun': 'pump.fun',
  'raydium.io': 'Raydium', 'orca.so': 'Orca', 'meteora.ag': 'Meteora', 'jito.network': 'Jito',
  'helius.dev': 'Helius', 'solscan.io': 'Solscan', 'dexscreener.com': 'DEX Screener', 'birdeye.so': 'Birdeye',
  'x.com': 'X', 'twitter.com': 'X', 't.me': 'Telegram', 'telegram.org': 'Telegram',
  'discord.com': 'Discord', 'discord.gg': 'Discord', 'github.com': 'GitHub',
  'eventbrite.com': 'Eventbrite', 'eventbrite.co.uk': 'Eventbrite', 'partiful.com': 'Partiful',
  'google.com': 'Google', 'zoom.us': 'Zoom', 'youtube.com': 'YouTube',
  'metamask.io': 'MetaMask', 'ledger.com': 'Ledger', 'trezor.io': 'Trezor',
};
// Names scammers borrow. Matched against the registrable domain's main label.
export const BRANDS = ['solana', 'luma', 'phantom', 'solflare', 'backpack', 'jupiter', 'magiceden', 'tensor',
  'raydium', 'meteora', 'helius', 'solscan', 'dexscreener', 'birdeye', 'metamask', 'ledger', 'trezor',
  'breakpoint', 'eventbrite', 'partiful', 'discord', 'telegram', 'twitter'];
const SHORTENERS = ['bit.ly', 't.co', 'tinyurl.com', 'rebrand.ly', 'cutt.ly', 'is.gd', 'ow.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'linktr.ee', 'beacons.ai'];
const FREE_HOSTS = ['vercel.app', 'netlify.app', 'pages.dev', 'web.app', 'firebaseapp.com', 'github.io', 'glitch.me',
  'replit.app', 'framer.website', 'framer.app', 'webflow.io', 'gitbook.io', 'notion.site', 'carrd.co', 'wixsite.com', 'onrender.com', 'surge.sh'];
const RISKY_TLDS = ['xyz', 'top', 'click', 'live', 'site', 'online', 'icu', 'buzz', 'rest', 'shop', 'cfd', 'sbs', 'lol', 'quest', 'cyou', 'monster', 'gq', 'tk', 'ml', 'cf', 'ga', 'zip', 'mov'];
const TWO_LEVEL = ['co.uk', 'org.uk', 'ac.uk', 'com.au', 'co.jp', 'com.br', 'co.in', 'com.sg', 'co.kr', 'com.tr', 'co.za'];
// Words drainer pages love. Checked in host + path.
const BAIT = ['claim', 'airdrop', 'connect-wallet', 'connectwallet', 'walletconnect', 'wallet-connect', 'verify', 'validate',
  'rectify', 'sync', 'migrate', 'migration', 'unlock', 'reward', 'whitelist', 'allowlist', 'eligib', 'free-mint', 'freemint',
  'seed', 'recover', 'restore', 'dapp', 'revoke', 'bonus', 'giveaway', 'drop'];

export function registrable(host) {
  const parts = host.split('.');
  const last2 = parts.slice(-2).join('.');
  if (TWO_LEVEL.includes(last2) && parts.length >= 3) return parts.slice(-3).join('.');
  return last2;
}
// Undo the usual character swaps so "phantorn" and "s0lana" read as the brand they imitate.
export function deconfuse(s) {
  return s.toLowerCase().replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/0/g, 'o').replace(/[1|]/g, 'l')
    .replace(/3/g, 'e').replace(/5/g, 's').replace(/4/g, 'a').replace(/7/g, 't').replace(/-/g, '');
}
// "lumma" -> "luma", "phaantom" -> "phantom": drop repeated letters
export const undouble = s => [...s].filter((c, i, a) => c !== a[i - 1]).join('');
export function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const endsWith = (host, dom) => host === dom || host.endsWith('.' + dom);

// Returns { verdict: 'FRESH'|'OK'|'SOGGY'|'ROTTEN'|'INVALID', score, host, domain, official, reasons:[{level,text}] }
export function check(input) {
  const raw = String(input || '').trim();
  const reasons = [];
  const add = (level, text) => reasons.push({ level, text });
  if (!raw) return { verdict: 'INVALID', score: 0, reasons: [{ level: 'info', text: 'Paste a link first.' }] };
  if (/^(javascript|data|vbscript|file):/i.test(raw)) {
    return { verdict: 'ROTTEN', score: 9, reasons: [{ level: 'bad', text: 'This is not a web link. It runs code or loads a file when clicked.' }] };
  }
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw); }
  catch { return { verdict: 'INVALID', score: 0, reasons: [{ level: 'info', text: "That doesn't look like a link." }] }; }
  if (!/^https?:$/.test(url.protocol)) {
    return { verdict: 'ROTTEN', score: 9, reasons: [{ level: 'bad', text: `Unusual link type (${url.protocol}). Don't open it.` }] };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.')) return { verdict: 'INVALID', score: 0, reasons: [{ level: 'info', text: "That doesn't look like a link." }] };
  let score = 0;
  const bad = t => { score += 3; add('bad', t); }, warn = t => { score += 2; add('warn', t); }, meh = t => { score += 1; add('meh', t); };

  if (url.username || url.password || /^[^/]*@/.test(raw.replace(/^https?:\/\//i, ''))) {
    bad(`The link hides its real address: everything before the @ is ignored, you'd actually go to ${host}.`);
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) bad('It points at a raw IP address, not a domain. Real event pages never do this.');
  const isIDN = host.split('.').some(l => l.startsWith('xn--')) || /[^\x00-\x7f]/.test(raw.split('/')[2] || '');
  if (isIDN) bad('The domain uses look-alike letters from other alphabets (punycode). A classic fake.');

  const domain = registrable(host);
  const tld = domain.split('.').pop();
  const label = domain.split('.')[0];
  const official = OFFICIAL[domain] || null;
  const free = FREE_HOSTS.find(f => endsWith(host, f));

  if (SHORTENERS.some(s => endsWith(host, s))) warn("It's a short link or link page, so you can't see where it really goes. Ask for the full link.");
  if (url.protocol === 'http:') meh('No https. Anything you type can be read on the way.');
  if (RISKY_TLDS.includes(tld)) meh(`.${tld} domains are cheap and very common in drainer kits.`);
  if (free) meh(`Hosted on ${free}, where anyone can make a site in a minute (this one included). Judge it by who sent it.`);
  if (host.split('.').length > 4) meh('Lots of subdomains stacked up. Often used to push the real domain out of view.');

  // brand look-alikes and borrowed names, judged on the registrable domain (or the free-host subdomain)
  if (!official) {
    const own = free ? host.slice(0, -(free.length + 1)).split('.').pop() : label;
    const flat = deconfuse(own);
    let flagged = false;
    for (const b of BRANDS) {
      if (flat === b || undouble(flat) === undouble(b) || (b.length >= 5 && lev(flat, b) <= (b.length >= 8 ? 2 : 1))) {
        bad(`"${own}" is made to look like ${b}. The real ones are listed below; this isn't one of them.`); flagged = true; break;
      }
    }
    if (!flagged) {
      const hit = BRANDS.find(b => flat.includes(b));
      if (hit) warn(`It borrows the name "${hit}" but isn't an official ${hit} domain. Anyone can register that.`);
    }
  } else if (host !== domain && !/^(www|app|docs|blog|help|support|status|events?|calendar|meet|accounts)$/.test(host.slice(0, -(domain.length + 1)))) {
    add('info', `Real ${official} domain, on the "${host.slice(0, -(domain.length + 1))}" subdomain.`);
  }

  const hay = (host + url.pathname + url.search).toLowerCase();
  const baits = [...new Set(BAIT.filter(w => hay.includes(w)))];
  if (baits.length) {
    const t = `Bait words in the link: ${baits.slice(0, 4).join(', ')}. Events don't make you claim, verify or connect anything.`;
    official ? meh(t) : warn(t);
  }
  if (official && (domain === 'lu.ma' || domain === 'luma.com' || domain === 'eventbrite.com' || domain === 'partiful.com')) {
    add('info', `${official} is real, but anyone can create an event there. An RSVP never needs your wallet or a signature.`);
  }

  let verdict;
  if (score >= 3) verdict = 'ROTTEN';
  else if (score >= 1) verdict = 'SOGGY';
  else verdict = official ? 'FRESH' : 'OK';
  if (verdict === 'FRESH') add('good', `This is the real ${official} domain.`);
  if (verdict === 'OK') add('good', "No common tricks found. That's not proof it's safe: check who sent it.");
  return { verdict, score, host, domain, official, reasons };
}

// ---- Address lookalikes (address poisoning) ----
// Scammers send you a tiny transfer from an address that starts and ends like one you use, so it sits in your
// history waiting to be copied. Wallets show addresses as "FJ45…yKG1", so the middle is where the swap hides.
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isAddress = s => B58.test(String(s || '').trim());
const ends = (a, n = 4) => a.slice(0, n) + '…' + a.slice(-n);

// Compare the address you meant to use with the one you are about to paste.
// Returns { verdict, reasons, same: [indexes that match] }
export function compareAddresses(meant, pasted) {
  const a = String(meant || '').trim(), b = String(pasted || '').trim();
  if (!a || !b) return { verdict: 'INVALID', reasons: [{ level: 'info', text: 'Paste both addresses.' }] };
  if (!isAddress(a) || !isAddress(b)) return { verdict: 'INVALID', reasons: [{ level: 'info', text: "One of those isn't a Solana address (32-44 letters and numbers, no 0, O, I or l)." }] };
  const same = [...b].map((c, i) => c === a[i]);
  if (a === b) return { verdict: 'FRESH', same, reasons: [{ level: 'good', text: 'Every character matches. Same address.' }] };
  let pre = 0; while (pre < Math.min(a.length, b.length) && a[pre] === b[pre]) pre++;
  let suf = 0; while (suf < Math.min(a.length, b.length) && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  if (pre >= 3 && suf >= 3) return { verdict: 'ROTTEN', same, reasons: [
    { level: 'bad', text: `Same start and end (${ends(b)}) but a different middle. That's address poisoning: a fake made to look like the real one in your wallet.` },
    { level: 'bad', text: "Don't send. Copy the address again from where it really came from (the exchange's deposit page, your friend's message), never from your transaction history." }] };
  if (pre >= 3 || suf >= 3) return { verdict: 'SOGGY', same, reasons: [{ level: 'warn', text: `These are different addresses that share the ${pre >= 3 ? 'first' : 'last'} ${Math.max(pre, suf)} characters. Make sure you have the right one.` }] };
  return { verdict: 'SOGGY', same, reasons: [{ level: 'warn', text: 'These are two completely different addresses.' }] };
}

// Scan any pasted text (copied wallet history, a chat, an explorer page) for addresses that imitate one you trust.
export function findLookalikes(trusted, text) {
  const t = String(trusted || '').trim();
  if (!isAddress(t)) return { verdict: 'INVALID', hits: [], reasons: [{ level: 'info', text: 'Paste the address you trust first.' }] };
  const found = [...new Set(String(text || '').match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [])];
  const hits = found.filter(x => x !== t && (x.slice(0, 3) === t.slice(0, 3) || x.slice(-3) === t.slice(-3)))
    .map(x => ({ address: x, verdict: compareAddresses(t, x).verdict }));
  const rotten = hits.filter(h => h.verdict === 'ROTTEN');
  if (rotten.length) return { verdict: 'ROTTEN', hits, reasons: [{ level: 'bad', text: `${rotten.length} address${rotten.length > 1 ? 'es' : ''} in there copy the start and end of yours. If one sent you a tiny amount, it's a poisoning attempt. Never copy from it.` }] };
  if (hits.length) return { verdict: 'SOGGY', hits, reasons: [{ level: 'warn', text: 'Some addresses share a few characters with yours. Probably chance, but check before sending.' }] };
  return { verdict: 'FRESH', hits, reasons: [{ level: 'good', text: `Checked ${found.length} address${found.length === 1 ? '' : 'es'}. None imitate yours.` }] };
}
