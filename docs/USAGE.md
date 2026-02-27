# Guia de Uso — Messaging Officer

Este documento explica como gerenciar sessões e consumir a API do Messaging Officer na prática.

> Para informações técnicas e de execução, consulte o [README.md](../README.md).

---

## Conceitos

- **Sessão**: Representa uma conexão WhatsApp ativa. Cada sessão tem um `sessionId` (ex: `"pedro"`, `"bot-vendas"`), um socket Baileys independente e seu próprio QR code.
- **Header `X-Session-Id`**: Todas as rotas operacionais (enviar mensagem, consultar contato, etc.) exigem esse header para identificar qual sessão WhatsApp usar.
- **Rotas de sessão** (`/api/sessions`): Gerenciamento de sessões (criar, listar, deletar). **Não** exigem o header.

---

## 1. Criando uma sessão

Para começar a usar a API, primeiro crie uma sessão:

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{ "sessionId": "pedro" }'
```

**Resposta:**

```json
{
  "status": "success",
  "sessionId": "pedro",
  "message": "Sessão criada. Escaneie o QR em /api/sessions/pedro/qr",
  "qrUrl": "/api/sessions/pedro/qr"
}
```

> O `sessionId` aceita letras, números, hífens e underscores. Exemplos: `"pedro"`, `"bot-vendas"`, `"whatsapp_01"`.

---

## 2. Escaneando o QR code

Abra o link no navegador:

```
http://localhost:3000/api/sessions/pedro/qr
```

Você verá uma página com o QR code renderizado:

1. Abra o **WhatsApp** no celular
2. Vá em **Menu → Dispositivos conectados → Conectar dispositivo**
3. Escaneie o QR code exibido na página

A página atualiza automaticamente:
- Enquanto aguarda escaneamento, atualiza a cada 30 segundos
- Quando conectado, exibe ✅
- Se desconectado ou com erro, atualiza a cada 5 segundos

---

## 3. Enviando mensagens

Após a sessão estar conectada, use os endpoints normalmente adicionando o header `X-Session-Id`:

### Mensagem de texto

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: pedro" \
  -d '{
    "number": "5511999999999",
    "message": "Olá! Mensagem enviada via API."
  }'
```

## 7. Múltiplas sessões simultâneas

Você pode conectar vários números WhatsApp ao mesmo tempo:

```bash
# Criar sessão do Pedro
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{ "sessionId": "pedro" }'

# Criar sessão da Maria (sem reiniciar a aplicação)
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{ "sessionId": "maria" }'
```

Cada um escaneia seu QR:

```
http://localhost:3000/api/sessions/pedro/qr
http://localhost:3000/api/sessions/maria/qr
```

Depois, envie mensagens pela sessão desejada trocando o header:

```bash
# Pedro envia
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: pedro" \
  -d '{ "number": "5511999999999", "message": "Oi, sou o Pedro!" }'

# Maria envia
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: maria" \
  -d '{ "number": "5511999999999", "message": "Oi, sou a Maria!" }'
```

---

## 8. Gerenciamento de sessões

### Listar todas as sessões

```bash
curl http://localhost:3000/api/sessions
```

```json
{
  "status": "success",
  "sessions": [
    { "id": "pedro", "status": "connected" },
    { "id": "maria", "status": "qr" }
  ]
}
```

### Ver status de uma sessão

```bash
curl http://localhost:3000/api/sessions/pedro/status
```

```json
{
  "status": "success",
  "sessionId": "pedro",
  "connection": "connected",
  "hasQrCode": false
}
```

### Reiniciar sessão

Reconecta mantendo as credenciais (sem precisar escanear QR novamente):

```bash
curl -X POST http://localhost:3000/api/sessions/pedro/restart
```

### Deletar sessão

Desconecta e **remove** as credenciais salvas. Será necessário escanear QR novamente se recriada:

```bash
curl -X DELETE http://localhost:3000/api/sessions/pedro
```

---

## 9. Persistência entre restarts

As sessões são restauradas automaticamente quando a aplicação reinicia.

**Como funciona:**
1. As credenciais ficam salvas em `auth/{sessionId}/`
2. Ao iniciar, a aplicação lê os diretórios dentro de `auth/`
3. Para cada diretório com `creds.json`, reconecta automaticamente
4. Não é necessário escanear QR novamente

```
auth/
├── pedro/      → reconectado automaticamente ✅
│   ├── creds.json
│   └── pre-key-*.json
└── maria/      → reconectado automaticamente ✅
    ├── creds.json
    └── pre-key-*.json
```

> **Atenção:** Se uma sessão for invalidada pelo WhatsApp (logout pelo celular), será necessário deletá-la e recriá-la.

---

## 10. Formato dos números

Os números devem ser enviados no formato internacional **sem** o `+`:

| Formato correto    | Formato incorreto       |
|---------------------|-------------------------|
| `5511999999999`     | `+5511999999999`        |
| `5511999999999`     | `(11) 99999-9999`      |
| `5543936180709`     | `43 9 3618-0709`        |

---

## 11. Códigos de erro

| Código | Erro | Causa |
|--------|------|-------|
| `400` | `Header X-Session-Id é obrigatório` | Esqueceu o header na chamada |
| `400` | `sessionId é obrigatório` | Não enviou o body ao criar sessão |
| `404` | `Sessão "xxx" não encontrada` | Sessão não foi criada via POST /api/sessions |
| `503` | `WhatsApp não está conectado` | Sessão existe mas QR ainda não foi escaneado |

---

## 12. Usando com Postman

1. Importe o arquivo `messaging-officer-openapi.json` no Postman
2. Na collection, vá em **Variables** e configure a URL base (`http://localhost:3000`)
3. Para cada request, adicione o header:
   - **Key**: `X-Session-Id`
   - **Value**: o ID da sua sessão (ex: `pedro`)

> **Dica**: Configure o header `X-Session-Id` na aba **Headers** da collection inteira para não precisar adicionar em cada request individual.
