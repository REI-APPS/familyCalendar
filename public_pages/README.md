# 📄 Páginas Legais — Agenda da Família

Ficheiros HTML estáticos prontos para publicar em `familycalendar.grouprei.com`.

## Ficheiros

- **`about.html`** → Sobre a app (features, contacto, links)
- **`terms.html`** → Termos & Política de Privacidade
- **`delete-account.html`** → Instruções para apagar conta (requerido pelo Google Play)
- **`icon.png`** → Logo da app usado nas 3 páginas

## URLs sugeridas para o Google Play Console

Cola estas URLs nas secções correspondentes da tua consola:

| Campo Play Console | URL |
|---|---|
| **Website** | `https://familycalendar.grouprei.com/about.html` |
| **Privacy policy** | `https://familycalendar.grouprei.com/terms.html` |
| **Account deletion URL** | `https://familycalendar.grouprei.com/delete-account.html` |

## Como publicar

### Opção A — Servidor web tradicional (Apache/Nginx)

```bash
scp /app/public_pages/*.html /app/public_pages/icon.png \
    user@familycalendar.grouprei.com:/var/www/html/
```

Configura o servidor para servir sem extensão (opcional):

**Nginx:**
```nginx
location = /about { try_files /about.html =404; }
location = /terms { try_files /terms.html =404; }
location = /delete-account { try_files /delete-account.html =404; }
```

### Opção B — Cloudflare Pages / Netlify / Vercel

1. Cria um repositório GitHub com os 4 ficheiros
2. Liga ao Cloudflare Pages (ou Netlify/Vercel)
3. Adiciona um domínio personalizado: `familycalendar.grouprei.com`
4. As páginas ficam servidas via HTTPS automaticamente

### Opção C — Rotas Expo Router (já criadas)

Se preferires não usar hosting separado, as páginas também existem como rotas Expo:
- `/about`
- `/terms`
- `/delete-account`

Estas ficam acessíveis quando fizeres deploy da versão web da app. Basta apontar o
Play Console para `https://<teu-dominio-do-deploy>/about`, etc.

## Requisitos do Google Play Console

O botão **"Apagar conta"** DEVE existir dentro da app **E** as instruções devem estar
disponíveis num URL público. As 3 páginas cobrem ambos os requisitos.

## Atualizar as páginas

Antes de publicar, atualiza:

- `suporte@familycalendar.grouprei.com` → o teu email de suporte real (em todos os HTMLs)
- Data em `terms.html` linha `Última atualização: ...`
- Links `./icon.png` / `./terms.html` / `./delete-account.html` — se puseres em subpastas, ajusta os paths
