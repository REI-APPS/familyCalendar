# 🚀 Guia de Publicação — Google Play Store

## 1. Checklist de Pré-Publicação

### ✅ Configuração técnica (já feita)
- [x] `package` único: `com.familia.agenda`
- [x] `versionCode: 1` (incrementar a cada release)
- [x] `version: "1.0.0"` (semver visível ao utilizador)
- [x] Ícone adaptativo com background `#FDFDF9`
- [x] Splash screen configurado
- [x] Permissões mínimas declaradas (`INTERNET`, `RECEIVE_BOOT_COMPLETED` para o widget)
- [x] Permissões sensíveis bloqueadas (microfone, câmara, localização)
- [x] `newArchEnabled: true` (React Native New Architecture)
- [x] Variáveis de ambiente em `.env` (não commitar credenciais)

## 2. Antes de Submeter

### 🔐 Supabase (produção)
1. Em **Authentication → URL Configuration**, adiciona a URL de produção (deep link `agendafamilia://`).
2. Em **Authentication → Email Templates**, personaliza o template de "Confirm signup" e "Invite user" com o nome da tua app.
3. Considera **upgrade do plano** se esperas > 50 utilizadores ativos (Free tier: 50k MAUs).
4. Configura **backups automáticos**.

### 🎨 Assets Visuais (cria estes na Play Console)
| Asset | Tamanho | Onde |
|---|---|---|
| **Ícone** | 512×512 PNG, 32-bit | `assets/images/icon.png` ✅ |
| **Feature graphic** | 1024×500 PNG/JPG | Criar no Figma/Canva |
| **Screenshots** | mín. 2, máx. 8 — 1080×1920 ou 1080×2400 | Tirar da app |
| **Banner TV** (opcional) | 1280×720 | Só se publicares para TV |

### 📝 Conteúdos textuais
- **Título** (máx. 30 chars): `Agenda da Família`
- **Descrição curta** (máx. 80 chars): `Organiza a rotina da tua família num só lugar`
- **Descrição completa** (máx. 4000 chars): Ver `PLAY_STORE_DESCRIPTION.md`
- **Categoria**: `Produtividade` ou `Estilo de Vida`
- **Classificação etária**: `Para todos` (responde ao questionário IARC)

### 🔒 Conteúdo obrigatório (Play Console → Política)
1. **Política de Privacidade** — URL pública obrigatória. Cria gratuitamente em [termly.io](https://termly.io) ou [freeprivacypolicy.com](https://freeprivacypolicy.com). Menciona:
   - Dados recolhidos: email + nome + horários (via Supabase)
   - Onde estão guardados: Supabase (UE/EUA)
   - Direitos do utilizador (eliminação, exportação)
2. **Data Safety Form** (Play Console):
   - Recolhes email → "User account info"
   - Não recolhes localização, contactos, áudio, fotos
   - Dados encriptados em trânsito (TLS) ✅
   - Utilizador pode pedir eliminação ✅

## 3. Como Construir o APK / AAB

### Via Emergent (Recomendado)
1. Carrega no botão **"Publish"** no canto superior direito da plataforma Emergent.
2. Escolhe **Android** → **Production Build** → **AAB** (Android App Bundle).
3. A Emergent gera o `.aab` que carregas no Play Console.

### Via Linha de Comando (alternativa, requer conta EAS)
```bash
cd /app/frontend
npx eas-cli build --platform android --profile production
```
Antes precisas:
- `npx eas-cli login`
- `npx eas-cli build:configure`
- Criar `eas.json` com perfil `production` (já criado em `/app/frontend/eas.json`).

## 4. Workflow no Play Console

1. Cria conta de Developer: $25 USD (one-time fee) em https://play.google.com/console
2. **Create App** → preenche título, idioma padrão (Português), grátis/pago
3. **App Content**:
   - Privacy Policy URL ⬅️ obrigatório
   - Ads: `No, my app does not contain ads`
   - App access: `All functionality available without restrictions`
   - Content rating: completa o questionário
   - Target audience: `13+`
   - Data safety: declara como acima
4. **Main store listing**: textos + assets
5. **Production → Create new release**:
   - Upload do `.aab`
   - Release notes (max 500 chars): `Lançamento inicial: agenda partilhada com sincronização em tempo real, vista diária e mensal, exportação para PDF e convites por email.`
6. **Roll out** → aguarda revisão (1-7 dias).

## 5. Versões futuras
- Incrementa `versionCode` (inteiro) e `version` (semver) em `app.json` antes de cada novo build.
- Mantém o mesmo `package` (`com.familia.agenda`).
- Faz signing com o mesmo keystore (a Emergent gere isto automaticamente).

## 6. Widget Android no APK Final
O widget Android (preparação em `/app/ANDROID_WIDGET_README.md`) **não funciona em Expo Go** mas o código está pronto para inclusão num build de produção. Para ativar:
1. Cria um config plugin `plugins/withAgendaWidget.js`.
2. Adiciona ao array `plugins` em `app.json`.
3. Faz novo build.

Como exige código nativo Kotlin não-trivial, é recomendado fazer este passo numa iteração futura após o primeiro release estar publicado e validado.
