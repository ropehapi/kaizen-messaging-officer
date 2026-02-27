# Messaging Officer

## Visão geral

API REST em Node.js que funciona como bridge para o WhatsApp usando a biblioteca **Baileys** (cliente não oficial do WhatsApp Web via WebSocket). Permite enviar mensagens de texto, mídias, gerenciar grupos, consultar contatos e muito mais, com sessão persistente e reconexão automática.

> **Aviso**: Baileys viola os Termos de Serviço do WhatsApp. Use apenas para fins pessoais, educativos ou experimentais.

## Ecossistema

Este projeto faz parte do ecossistema **"manda-pra-mim"** de automação WhatsApp:
- **kaizen-wpp-scheduler-backend** → API REST em Go para gerenciamento de agendamentos (porta 8080)
- **kaizen-wpp-scheduler-frontend** → Frontend React para interface de agendamentos
- **kaizen-secretary** → Worker de cronjobs que **consome esta API** para enviar mensagens automatizadas

## Stack

- **Node.js 22+** (ES Modules — `"type": "module"`)
- **Express 5** → Framework web
- **@whiskeysockets/baileys 6** → Cliente WhatsApp Web via WebSocket
- **swagger-ui-express** → Documentação interativa OpenAPI 3.0
- **qrcode-terminal** → Exibe QR code no terminal para pareamento
- **body-parser** → Parsing JSON do corpo das requisições
- **Winston** → Logging estruturado em JSON (arquivo + console)

## Arquitetura

```
src/
├── index.js                    # Entry point — Express app, registra rotas e Swagger
├── socket.js                   # Gerenciamento da conexão WhatsApp (Baileys)
├── helpers.js                  # Funções auxiliares (formatJid, formatGroupJid) + middleware requireConnection
├── logger.js                   # Configuração Winston (logs JSON em logs/app.log)
├── swagger.js                  # Especificação OpenAPI 3.0 completa
└── routes/
    ├── messageRoutes.js        # Envio de mensagens (texto, imagem, vídeo, áudio, documento, localização, contato, reação, enquete, delete, edit)
    ├── contactRoutes.js        # Consultas de contatos e perfil
    ├── groupRoutes.js          # Operações com grupos
    └── chatRoutes.js           # Operações de chat (presença, leitura, arquivo, mute, pin, reject call, connection status)
auth/                           # Credenciais da sessão Baileys (NÃO versionar)
logs/                           # Logs da aplicação (app.log)
baileys/                        # Fork/cópia local da lib Baileys
```

## Fluxo de conexão WhatsApp

1. `startWhatsApp()` é chamado na inicialização do servidor
2. Baileys usa `useMultiFileAuthState('auth')` para persistir sessão
3. Se não há sessão, gera QR code no terminal para escaneamento
4. Após autenticação, o socket fica disponível via `getSock()`
5. Em caso de desconexão (exceto status 401 — sessão inválida), reconecta automaticamente
6. Status 401 requer deletar `auth/` e reescanear o QR code

### Estados de conexão
| Status | Descrição |
|---|---|
| `disconnected` | Não conectado |
| `qr` | Aguardando escaneamento do QR code |
| `connected` | Conectado e operacional |
| `error` | Erro na inicialização |

## Middleware de conexão

Todas as rotas (exceto connection-status) usam o middleware `requireConnection`:
- Verifica se `connectionStatus === 'connected'`
- Verifica se o socket existe
- Retorna **503** se não conectado, com `{ status: "error", error: "WhatsApp não está conectado", connectionStatus }` 
- Injeta o socket em `req.sock` para uso nos handlers

## Endpoints da API

Porta: **3000** | Swagger: `http://localhost:3000/docs`

### Conexão
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/connection-status` | Status da conexão + QR code (se disponível) |

### Mensagens (todas requerem conexão)
| Método | Rota | Body obrigatório |
|---|---|---|
| POST | `/api/send-message` | `{ number, message }` |
| POST | `/api/send-image` | `{ number, imageUrl, caption? }` |
| POST | `/api/send-video` | `{ number, videoUrl, caption? }` |
| POST | `/api/send-audio` | `{ number, audioUrl, ptt? }` |
| POST | `/api/send-document` | `{ number, documentUrl, mimetype?, fileName? }` |
| POST | `/api/send-location` | `{ number, latitude, longitude }` |
| POST | `/api/send-contact` | `{ number, contactName, contactNumber }` |
| POST | `/api/send-reaction` | `{ number, messageId, reaction? }` |
| POST | `/api/send-poll` | `{ number, name, options[], selectableCount? }` |
| POST | `/api/delete-message` | `{ number, messageId, fromMe? }` |
| POST | `/api/edit-message` | `{ number, messageId, newMessage }` |

### Contatos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/check-number/:number` | Verifica existência no WhatsApp |
| GET | `/api/profile-picture/:number` | Foto de perfil |
| GET | `/api/status/:number` | Status (recado) |
| GET | `/api/business-profile/:number` | Perfil comercial |
| POST | `/api/block` | Bloquear usuário |
| POST | `/api/unblock` | Desbloquear usuário |
| GET | `/api/blocklist` | Lista de bloqueados |

### Perfil
| Método | Rota | Descrição |
|---|---|---|
| PUT | `/api/profile-name` | Atualizar nome |
| PUT | `/api/profile-status` | Atualizar status/recado |

### Grupos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/groups` | Listar grupos |
| POST | `/api/groups/create` | Criar grupo |
| GET | `/api/groups/:groupId/metadata` | Metadados |
| GET | `/api/groups/:groupId/invite-code` | Código de convite |
| POST | `/api/groups/:groupId/revoke-invite` | Revogar convite |
| POST | `/api/groups/join` | Entrar via código |
| GET | `/api/groups/invite-info/:inviteCode` | Info do convite |
| POST | `/api/groups/:groupId/participants` | Add/Remove/Promote/Demote |
| PUT | `/api/groups/:groupId/subject` | Atualizar nome |
| PUT | `/api/groups/:groupId/description` | Atualizar descrição |
| PUT | `/api/groups/:groupId/settings` | Configurações |
| POST | `/api/groups/:groupId/leave` | Sair do grupo |
| GET | `/api/groups/:groupId/profile-picture` | Foto do grupo |

### Chat
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/presence` | Atualizar presença |
| POST | `/api/read-messages` | Marcar como lidas |
| POST | `/api/archive` | Arquivar/desarquivar |
| POST | `/api/mute` | Mutar/desmutar |
| POST | `/api/pin` | Fixar/desfixar |
| POST | `/api/reject-call` | Rejeitar chamada |

## Formatação de números

- `formatJid(number)` → Remove tudo exceto dígitos e adiciona `@s.whatsapp.net`
- `formatGroupJid(groupId)` → Adiciona `@g.us` se não tiver
- Números devem ser enviados no formato internacional sem `+` (ex: `5511999999999`)

## Padrão de resposta

**Sucesso:**
```json
{ "status": "success", "number": "5511...", "messageId": "...", ...dados_extras }
```

**Erro de validação (400):**
```json
{ "error": "number e message são obrigatórios" }
```

**Erro de conexão (503):**
```json
{ "status": "error", "error": "WhatsApp não está conectado", "connectionStatus": "disconnected" }
```

**Erro interno (500):**
```json
{ "status": "error", "error": "mensagem do erro" }
```

## Logging

- Winston configurado com JSON format
- Arquivo: `logs/app.log`
- Console: formato simples
- Eventos logados: `server_start`, `connected`, `connection_closed`, `reconnecting`, `message_sent`, `*_error`, etc.
- Todo log inclui `event` e `timestamp`

## Docker

```bash
docker compose up -d           # Sobe a aplicação (porta 3000)
docker compose logs -f         # Ver logs (necessário para QR code)
docker compose up -d --build   # Rebuild após alterações
```

Volumes persistidos:
- `./auth:/app/auth` → Sessão do WhatsApp
- `./logs:/app/logs` → Logs da aplicação

## Convenções de código

- ES Modules (`import/export`, não `require`)
- Sem TypeScript — JavaScript puro
- Cada categoria de rota em arquivo separado em `routes/`
- Middleware `requireConnection` aplicado por router (não globalmente)
- Handlers seguem padrão try/catch com logging estruturado
- Validação de input manual (sem biblioteca de validação)
- Sem testes automatizados (teste manual via Swagger)

## Como executar

```bash
# Com Docker (recomendado)
docker compose up -d
docker compose logs -f  # Escanear QR code

# Sem Docker
npm install
npm start
```
