# GitHub Actions — Konfiguracja Sekretów

Aby GitHub Actions działało poprawnie, dodaj te sekrety w:
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

## Sekrety bota (bot-hosting.net)

| Sekret | Wartość |
|--------|---------|
| `BOT_HOSTING_KEY` | `ptlc_UrMXR2v4L2p` |
| `BOT_HOSTING_SERVER_ID` | `81f3f88a` |

## Sekrety dashboardu (Vercel)

| Sekret | Jak uzyskać |
|--------|-------------|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens → Create Token |
| `VERCEL_ORG_ID` | `vercel project ls` → skopiuj Org ID |
| `VERCEL_PROJECT_ID` | `vercel project ls` → skopiuj Project ID |

## Jak to działa

- **Push na `main` zmiany w `bot/`** → automatyczny upload na bot-hosting.net + restart
- **Push na `main` zmiany w `dashboard/`** → Vercel automatycznie deployuje (bez dodatkowej konfiguracji Actions, Vercel sam to wykrywa przez GitHub integration)

## Ręczny upload (bez GitHub Actions)

```bash
node upload-to-bothosting.js                    # wszystkie pliki + restart
node upload-to-bothosting.js --no-restart       # bez restartu
node upload-to-bothosting.js --only api         # tylko pliki z "api" w nazwie
```
