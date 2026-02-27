# Diagnóstico e Melhorias — Messaging Officer

> Documento gerado a partir de análise completa do código-fonte.  
> Prioridades: 🔴 Crítica | 🟠 Alta | 🟡 Média | 🟢 Baixa

---

## 🔴 1. Autenticação na API (Crítica)

**Status:** Não implementado  
**Impacto:** Segurança

A API é completamente aberta. Qualquer pessoa que consiga acessar a porta da aplicação pode enviar mensagens do WhatsApp autenticado.

**Solução mínima:** Implementar middleware de API Key via header `x-api-key`:

```javascript
app.use('/api', (req, res, next) => {
  if (req.path === '/connection-status') return next() // público
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'API key inválida' })
  }
  next()
})
```

**Variável de ambiente necessária:** `API_KEY`

---

## 🔴 2. Bug: Mismatch de Portas no Docker (Crítica)

**Status:** Bug ativo  
**Impacto:** App não funciona no Docker

O código em `src/index.js` escuta na porta **3000** (hardcoded), mas o `docker-compose.yml` mapeia **3031:3031**, ou seja, o container espera que a app esteja em 3031 mas ela está em 3000.

**Arquivos afetados:**
- `src/index.js` → `const port = 3000`
- `docker-compose.yml` → `ports: "3031:3031"`

**Solução:** 
- Opção A: Mudar compose para `3031:3000`
- Opção B (recomendada): Usar variável de ambiente `PORT` no código e configurar no compose

```javascript
const port = process.env.PORT || 3000
```

---

## 🟠 3. QR Code via API como Base64/Imagem (Alta)

**Status:** Parcialmente implementado  
**Impacto:** Usabilidade em deploy remoto

Atualmente o QR code é exibido apenas no terminal via `qrcode-terminal`. O endpoint `/api/connection-status` retorna o QR como string bruta, inutilizável por frontends.

**Problemas:**
- Em Docker, precisa de `docker compose logs -f` para ver o QR
- Em deploy remoto (VPS/cloud), inviável escanear sem SSH
- Nenhum frontend consegue renderizar a string bruta

**Solução:** Usar a lib `qrcode` para gerar base64 data URL:

```javascript
import QRCode from 'qrcode'

// No evento connection.update:
if (qr) {
  qrCode = await QRCode.toDataURL(qr)  // "data:image/png;base64,..."
  connectionStatus = 'qr'
}
```

**Dependência a adicionar:** `qrcode`

**Opcional:** Criar endpoint dedicado `GET /api/qr` que retorne uma página HTML com o QR renderizado, para escaneamento via browser direto.

---

## 🟠 4. Endpoints de Logout e Restart (Alta)

**Status:** Não implementado  
**Impacto:** Operação sem SSH

Não existe forma de desconectar o WhatsApp, forçar re-autenticação ou limpar a sessão via API. Quando o status 401 ocorre (sessão inválida), a app para de funcionar e exige intervenção manual (SSH → deletar `auth/` → reiniciar container).

**Endpoints sugeridos:**

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/logout` | `sock.logout()` + limpa diretório `auth/` |
| POST | `/api/restart` | Destrói socket atual + chama `startWhatsApp()` |

**Exemplo de implementação:**

```javascript
router.post('/logout', async (req, res) => {
  try {
    const sock = getSock()
    if (sock) {
      await sock.logout()
    }
    // Limpar diretório auth/
    await fs.rm('auth', { recursive: true, force: true })
    return res.json({ status: 'success', message: 'Desconectado. Escaneie o QR novamente.' })
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

router.post('/restart', async (req, res) => {
  try {
    const sock = getSock()
    if (sock) await sock.end()
    startWhatsApp()
    return res.json({ status: 'success', message: 'Reconectando...' })
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message })
  }
})
```

---

## 🟠 5. Graceful Shutdown (Alta)

**Status:** Não implementado  
**Impacto:** Estabilidade da sessão

Sem tratamento de `SIGTERM`/`SIGINT`, quando o container Docker para:
- O socket WebSocket não é fechado corretamente
- Pode corromper os arquivos de sessão em `auth/`
- Pode causar "conflito de sessão" no WhatsApp ("seu WhatsApp Web foi aberto em outro lugar")

**Solução:**

```javascript
async function gracefulShutdown(signal) {
  logger.info({ event: 'shutdown', msg: `Recebido ${signal}, encerrando...` })
  if (sock) {
    await sock.end()
  }
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

---

## 🟡 6. Reconexão com Backoff Exponencial (Média)

**Status:** Implementação frágil  
**Impacto:** Resiliência

Problemas atuais:
- Reconexão imediata sem backoff (flood de reconexões)
- Sem limite de retries (loop infinito se WhatsApp estiver fora)
- Socket anterior não é destruído (potencial memory leak)
- Event listeners do socket anterior não são limpos

**Solução:**

```javascript
let retryCount = 0
const MAX_RETRIES = 10

if (connection === 'close' && statusCode !== 401) {
  if (retryCount < MAX_RETRIES) {
    const delay = Math.min(1000 * 2 ** retryCount, 60000) // max 60s
    retryCount++
    logger.info({ event: 'reconnecting', attempt: retryCount, delay })
    setTimeout(startWhatsApp, delay)
  } else {
    logger.error({ event: 'max_retries_reached' })
    connectionStatus = 'error'
  }
}

if (connection === 'open') {
  retryCount = 0 // reset ao conectar
}
```

**Importante:** Antes de criar novo socket, destruir o anterior:

```javascript
if (sock) {
  sock.ev.removeAllListeners()
  sock.end()
  sock = null
}
```

---

## 🟡 7. Suporte Multi-Sessão / Multi-Login (Média)

**Status:** Não implementado  
**Impacto:** Escalabilidade

Toda a aplicação gira em torno de variáveis globais únicas (`sock`, `connectionStatus`, `qrCode`), com path de auth hardcoded (`'auth'`). Apenas 1 número WhatsApp pode estar conectado por vez.

**Para suportar múltiplos logins:**

1. **Map de sessões** em vez de variáveis globais:
```javascript
// sessions = Map<sessionId, { sock, status, qrCode }>
const sessions = new Map()
```

2. **Path dinâmico** para auth:
```javascript
useMultiFileAuthState(`auth/${sessionId}`)
```

3. **Session ID no path da API**:
```
POST /api/sessions              → Criar sessão (gera QR)
GET  /api/sessions              → Listar sessões ativas
DELETE /api/sessions/:id        → Desconectar sessão
GET  /api/sessions/:id/qr      → QR da sessão
POST /api/sessions/:id/send-message → Enviar via sessão específica
```

4. **Middleware adaptado**: Selecionar socket correto por sessionId no path

**Nota:** Esta é uma refatoração significativa. Avaliar se realmente necessário antes de implementar.

---

## 🟡 8. CORS Middleware (Média)

**Status:** Não implementado  
**Impacto:** Integração com frontend

Sem CORS configurado, nenhum frontend (incluindo o `kaizen-wpp-scheduler-frontend` do ecossistema) consegue consumir a API diretamente do browser.

**Solução:**

```javascript
import cors from 'cors'

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}))
```

**Dependência a adicionar:** `cors`

---

## 🟢 9. Limpeza de Código (Baixa)

### 9.1 Remover `body-parser`
Express 5 já tem `express.json()` built-in. O `body-parser` é dependência desnecessária.

```diff
- import bodyParser from 'body-parser'
- app.use(bodyParser.json())
+ app.use(express.json())
```

### 9.2 Porta via variável de ambiente
```diff
- const port = 3000
+ const port = process.env.PORT || 3000
```

### 9.3 `console.log` no socket.js
Linha 30 de `socket.js` usa `console.log` em vez do `logger`:
```diff
- console.log('📲 Escaneie o QR code no WhatsApp:')
+ logger.info({ event: 'qr_generated', msg: 'Escaneie o QR code no WhatsApp' })
```

---

## 🟢 10. Rate Limiting (Baixa)

**Status:** Não implementado  
**Impacto:** Prevenção de ban no WhatsApp

Sem rate limiting, um loop ou ataque poderia enviar milhares de mensagens instantaneamente, resultando em ban permanente do número no WhatsApp.

**Solução:**

```javascript
import rateLimit from 'express-rate-limit'

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 30,              // máximo 30 mensagens/minuto
  message: { error: 'Rate limit excedido. Aguarde.' }
})

app.use('/api/send-', messageLimiter)
```

**Dependência a adicionar:** `express-rate-limit`

---

## 🟢 11. Health Check Endpoint (Baixa)

**Status:** Não implementado  
**Impacto:** Monitoramento / Load Balancer

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    whatsapp: getConnectionStatus(),
    timestamp: new Date().toISOString()
  })
})
```

---

## 🟢 12. Log Rotation (Baixa)

**Status:** Não implementado  
**Impacto:** Disco pode encher

O arquivo `logs/app.log` cresce indefinidamente. Adicionar rotação via Winston:

```javascript
import 'winston-daily-rotate-file'

new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
})
```

**Dependência a adicionar:** `winston-daily-rotate-file`

---

## 🟢 13. Remover Pasta `baileys/` Órfã (Baixa)

A pasta `baileys/` na raiz contém uma cópia inteira do código-fonte do Baileys (fork/cópia local), mas a aplicação usa o pacote npm `@whiskeysockets/baileys`. Esta pasta é peso morto no repositório.

**Ação:** Verificar se realmente não é usada e remover:
```bash
rm -rf baileys/
# Adicionar ao .gitignore se necessário
```

---

## Resumo Visual

| # | Melhoria | Prioridade | Complexidade |
|---|---|---|---|
| 1 | Autenticação API (API Key) | 🔴 Crítica | Baixa |
| 2 | Fix port mismatch Docker | 🔴 Crítica | Trivial |
| 3 | QR Code como base64/imagem | 🟠 Alta | Baixa |
| 4 | Endpoints logout/restart | 🟠 Alta | Baixa |
| 5 | Graceful shutdown | 🟠 Alta | Baixa |
| 6 | Reconexão com backoff | 🟡 Média | Média |
| 7 | Multi-sessão / multi-login | 🟡 Média | Alta |
| 8 | CORS middleware | 🟡 Média | Trivial |
| 9 | Limpeza de código | 🟢 Baixa | Trivial |
| 10 | Rate limiting | 🟢 Baixa | Baixa |
| 11 | Health check endpoint | 🟢 Baixa | Trivial |
| 12 | Log rotation | 🟢 Baixa | Baixa |
| 13 | Remover `baileys/` órfã | 🟢 Baixa | Trivial |
