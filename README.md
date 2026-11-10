# PHISHNCHIPS

Wallets show 8 of an address's 44 characters. Address poisoners fake those 8. This checks all 44, and checks links for lookalike domains, borrowed names and hidden redirects.

Everything runs in the browser. No wallet connect, no backend, no requests out (the CSP in `site/vercel.json` blocks them).

## What it checks

**Swap Spotter (addresses)**
- Compares the address you meant with the one you're about to paste, character by character, and highlights the part that differs.
- Scans pasted wallet history for lookalikes of an address (same first and last 4, different middle). That is the address-poisoning pattern: a dust transfer from a lookalike lands in your history, waiting to be copied.

**Link Fryer (links)**
- Lookalike domains of known wallets, DEXes and explorers (`phantorn.app` vs `phantom.app`).
- Credentials tricks (`lu.ma@evil-site.xyz`), shorteners, risky TLDs, brand names in subdomains.
- It reads the link text only. It never opens the link.

## Use it in your own code

```js
import { check, compareAddresses, findLookalikes } from './site/checker.js';

check('https://phantorn.app/claim').verdict;      // 'ROTTEN'
compareAddresses(meant, pasted).verdict;           // 'FRESH' | 'SOGGY' | 'ROTTEN'
findLookalikes(myAddress, pastedHistory).hits;     // lookalike addresses found
```

## Run

```
node tests/checker.test.mjs     # all tests
cd site && python -m http.server # open http://localhost:8000
```

Not a guarantee and not security advice. When in doubt, don't click and don't send.
