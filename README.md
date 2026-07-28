# Aktien-Liste · Ralph Christian Pader

Live-Charts (TradingView) · Technische Analyse · Live-News

## Deploy auf Netlify (über GitHub)

1. Dieses Repo bei GitHub anlegen / pushen
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Dieses Repository wählen
4. Einstellungen:
   - Build command: *(leer)*
   - Publish directory: `.`
5. **Deploy site**

Die Netlify-Function `news` liefert echte Artikel-Headlines (Yahoo Finance / Fallback).

### Test nach Deploy
```
https://DEINE-SITE.netlify.app/.netlify/functions/news?symbol=TSLA
```

## Lokal testen (optional)

```bash
npm install -g netlify-cli
netlify dev
```

## Struktur

```
index.html
og-preview.png
netlify.toml
netlify/functions/news.js
```

## PIN

Seiten-PIN: `2310`
