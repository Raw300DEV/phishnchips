// node tests/checker.test.mjs
import { check } from '../site/checker.js';
let fail = 0;
const t = (url, want) => {
  const r = check(url); const pass = want.includes(r.verdict); if (!pass) fail++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${r.verdict.padEnd(7)} score ${String(r.score).padStart(2)}  ${url}${pass ? '' : '   (wanted ' + want.join('/') + ') ' + JSON.stringify(r.reasons)}`);
};
// real
t('https://lu.ma/solana-side-dinner', ['FRESH']);
t('solana.com/breakpoint', ['FRESH']);
t('https://phantom.app/download', ['FRESH']);
t('https://jup.ag', ['FRESH']);
t('https://x.com/someone/status/1', ['FRESH']);
t('https://www.eventbrite.co.uk/e/123', ['FRESH']);
t('https://randomcafe.co.uk/menu', ['OK']);
// fakes
t('https://phantorn.app/claim', ['ROTTEN']);
t('https://s0lana.com/airdrop', ['ROTTEN']);
t('https://xn--slana-9ua.com', ['ROTTEN']);
t('https://lu.ma@evil-site.xyz/rsvp', ['ROTTEN']);
t('http://185.12.4.9/connect', ['ROTTEN']);
t('https://solana-breakpoint-rsvp.xyz/connect-wallet', ['ROTTEN']);
t('https://breakpoint-afterparty.vercel.app/claim', ['ROTTEN']);
t('https://lumma.com/event', ['ROTTEN']);
t('javascript:alert(1)', ['ROTTEN']);
t('https://bit.ly/3xYz', ['SOGGY']);
t('https://my-side-event.vercel.app', ['SOGGY']);
t('https://jupiter-rewards.live', ['ROTTEN']);
t('https://puma.com', ['OK']);
t('https://lima-travel.com', ['OK']);
t('https://phaantom.app', ['ROTTEN']);
// junk
t('', ['INVALID']);
t('hello there', ['INVALID']);
// (summary printed at the end)

// address poisoning
import { compareAddresses, findLookalikes } from '../site/checker.js';
const A = 'Fh7Qm2kLrZ9vXcT4pW8nJdB3sYuE6gHa5MoKqRxVyKG1';
const FAKE = 'Fh7Qs9nDXqzTd841ousAgtFrcXWV2vvtwwBgsHmyKG1';
const at = (name, got, want) => { const ok = got === want; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(got).padEnd(7)} ${name}${ok ? '' : '  (wanted ' + want + ')'}`); };
at('same address', compareAddresses(A, A).verdict, 'FRESH');
at('poisoned lookalike', compareAddresses(A, FAKE).verdict, 'ROTTEN');
at('unrelated address', compareAddresses(A, '9xDJTNqLkEf3RmYv8Wz2aPcH5sUbGtK7oVnJ4dXeQrSM').verdict, 'SOGGY');
at('not an address', compareAddresses(A, 'hello').verdict, 'INVALID');
at('scan finds poison', findLookalikes(A, `sent 9 SOL to ${A}\nreceived 0.000001 from ${FAKE}`).verdict, 'ROTTEN');
at('scan clean', findLookalikes(A, `received from 9xDJTNqLkEf3RmYv8Wz2aPcH5sUbGtK7oVnJ4dXeQrSM`).verdict, 'FRESH');
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
