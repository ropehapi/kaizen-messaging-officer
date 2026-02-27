# Messaging Officer - WhatsApp API

Uma **API REST** para interagir com o WhatsApp usando a biblioteca **Baileys** (cliente não oficial do WhatsApp Web).  
Permite enviar mensagens de texto, mídias, gerenciar grupos, consultar contatos e muito mais, com suporte a **múltiplas sessões simultâneas**, persistência e reconexão automática.

> Para instruções detalhadas de uso e gerenciamento de sessões, consulte o [USAGE.md](./docs/USAGE.md).

---

## Tecnologias utilizadas

- **Node.js 22+** (ES Modules)
- **Express 5** → Framework web para API REST
- **Baileys** → Cliente WhatsApp Web via WebSocket
- **Swagger UI** → Documentação interativa da API (OpenAPI 3.0)
- **qrcode** → Geração de QR code como base64 (data URL) para renderização via browser
- **qrcode-terminal** → Exibe QR code no terminal (fallback)
- **Winston** → Logging estruturado em JSON

---

## Estrutura do projeto

```
messaging-officer/
├── auth/                              # Credenciais das sessões (não versionar)
│   ├── pedro/                         # Sessão "pedro"
│   │   ├── creds.json
│   │   └── pre-key-*.json
│   └── maria/                         # Sessão "maria"
├── logs/                              # Logs da aplicação
├── docs/                              # Documentação
│   ├── USAGE.md                       # Instruções de uso e gerenciamento de sessões
│   └── MELHORIAS.md                   # Backlog de melhorias e diagnósticos
├── src/
│   ├── index.js                       # Entry point — Express app, rotas e Swagger
│   ├── socket.js                      # SessionManager — Map de sessões Baileys
│   ├── helpers.js                     # Funções auxiliares + middleware requireConnection
│   ├── logger.js                      # Configuração do Winston logger
│   ├── swagger.js                     # Especificação OpenAPI 3.0
│   └── routes/
│       ├── sessionRoutes.js           # CRUD de sessões + página QR
│       ├── messageRoutes.js           # Envio de mensagens (texto, mídia, etc.)
│       ├── contactRoutes.js           # Consultas de contatos e perfil
│       ├── groupRoutes.js             # Operações com grupos
│       └── chatRoutes.js              # Operações de chat (presença, leitura, etc.)
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados  
  **ou**
- [Node.js 22+](https://nodejs.org/) instalado

---

## Rodando com Docker (recomendado)

```bash
# 1. Clone o repositório
git clone <repositório>
cd messaging-officer

# 2. Suba a aplicação
docker compose up -d

# 3. Acompanhe os logs
docker compose logs -f

# 4. Pare a aplicação
docker compose down

# 5. Reconstrua após alterações
docker compose up -d --build
```

---

## Rodando sem Docker

```bash
# 1. Instale as dependências
npm install

# 2. Inicie a aplicação
npm start
```

---

## Documentação da API (Swagger)

Após iniciar a aplicação, a documentação interativa estará disponível em:

```
http://localhost:3000/docs
```

---

## Arquitetura Multi-Sessão

A aplicação suporta **múltiplas sessões WhatsApp simultâneas**. Cada sessão representa um número/dispositivo conectado.

- Sessões são criadas sob demanda via `POST /api/sessions`
- Cada sessão tem seu próprio socket Baileys, status e QR code
- Credenciais são persistidas em `auth/{sessionId}/`
- Sessões são restauradas automaticamente ao reiniciar a aplicação
- A sessão é identificada via header `X-Session-Id` em todas as chamadas da API

> Para o guia completo de uso, veja [docs/USAGE.md](./docs/USAGE.md).

---

## Endpoints da API

### Sessões (não exigem `X-Session-Id`)

| Método   | Rota                           | Descrição                          |
|----------|--------------------------------|------------------------------------|
| `POST`   | `/api/sessions`                | Criar nova sessão                  |
| `GET`    | `/api/sessions`                | Listar todas as sessões            |
| `GET`    | `/api/sessions/:id/status`     | Status de uma sessão               |
| `GET`    | `/api/sessions/:id/qr`         | Página HTML com QR para escaneamento |
| `DELETE` | `/api/sessions/:id`            | Desconectar e remover sessão       |
| `POST`   | `/api/sessions/:id/restart`    | Reiniciar sessão                   |

### Mensagens (exigem `X-Session-Id`)

| Método | Rota                    | Descrição                     |
|--------|-------------------------|-------------------------------|
| `POST` | `/api/send-message`     | Enviar mensagem de texto      |
| `POST` | `/api/send-image`       | Enviar imagem                 |
| `POST` | `/api/send-video`       | Enviar vídeo                  |
| `POST` | `/api/send-audio`       | Enviar áudio                  |
| `POST` | `/api/send-document`    | Enviar documento              |
| `POST` | `/api/send-location`    | Enviar localização            |
| `POST` | `/api/send-contact`     | Enviar contato (vCard)        |
| `POST` | `/api/send-reaction`    | Reagir a uma mensagem         |
| `POST` | `/api/send-poll`        | Enviar enquete                |
| `POST` | `/api/delete-message`   | Deletar mensagem (para todos) |
| `POST` | `/api/edit-message`     | Editar mensagem               |

### Contatos (exigem `X-Session-Id`)

| Método | Rota                              | Descrição                        |
|--------|-----------------------------------|----------------------------------|
| `GET`  | `/api/check-number/:number`       | Verificar se existe no WhatsApp  |
| `GET`  | `/api/profile-picture/:number`    | Foto de perfil                   |
| `GET`  | `/api/status/:number`             | Status (recado) do contato       |
| `GET`  | `/api/business-profile/:number`   | Perfil comercial                 |
| `POST` | `/api/block`                      | Bloquear usuário                 |
| `POST` | `/api/unblock`                    | Desbloquear usuário              |
| `GET`  | `/api/blocklist`                  | Lista de bloqueados              |

### Perfil (exigem `X-Session-Id`)

| Método | Rota                  | Descrição                 |
|--------|-----------------------|---------------------------|
| `PUT`  | `/api/profile-name`   | Atualizar nome do perfil  |
| `PUT`  | `/api/profile-status` | Atualizar status/recado   |

### Grupos (exigem `X-Session-Id`)

| Método | Rota                                     | Descrição                    |
|--------|------------------------------------------|------------------------------|
| `GET`  | `/api/groups`                            | Listar todos os grupos       |
| `POST` | `/api/groups/create`                     | Criar grupo                  |
| `GET`  | `/api/groups/:groupId/metadata`          | Metadados do grupo           |
| `GET`  | `/api/groups/:groupId/invite-code`       | Código de convite            |
| `POST` | `/api/groups/:groupId/revoke-invite`     | Revogar código de convite    |
| `POST` | `/api/groups/join`                       | Entrar pelo código de convite|
| `GET`  | `/api/groups/invite-info/:inviteCode`    | Info pelo código de convite  |
| `POST` | `/api/groups/:groupId/participants`      | Add/Remove/Promote/Demote    |
| `PUT`  | `/api/groups/:groupId/subject`           | Atualizar nome do grupo      |
| `PUT`  | `/api/groups/:groupId/description`       | Atualizar descrição          |
| `PUT`  | `/api/groups/:groupId/settings`          | Alterar configurações        |
| `POST` | `/api/groups/:groupId/leave`             | Sair do grupo                |
| `GET`  | `/api/groups/:groupId/profile-picture`   | Foto do grupo                |

### Chat (exigem `X-Session-Id`)

| Método | Rota                  | Descrição                              |
|--------|-----------------------|----------------------------------------|
| `POST` | `/api/presence`       | Atualizar presença (digitando, online) |
| `POST` | `/api/read-messages`  | Marcar mensagens como lidas            |
| `POST` | `/api/archive`        | Arquivar/Desarquivar chat              |
| `POST` | `/api/mute`           | Mutar/Desmutar chat                    |
| `POST` | `/api/pin`            | Fixar/Desfixar chat                    |
| `POST` | `/api/reject-call`    | Rejeitar chamada                       |

---

## Funcionamento interno

- **Multi-sessão**: Cada sessão WhatsApp é gerenciada via um `Map<sessionId, Session>` em memória, com socket, status e QR independentes.
- **Sessão persistente**: Credenciais salvas em `auth/{sessionId}/` para evitar reescanear QR code.
- **Restauração automática**: Ao reiniciar, todas as sessões com credenciais salvas são reconectadas.
- **Reconexão automática**: Reinicia conexão em caso de queda (exceto sessão invalidada — status 401).
- **Middleware de sessão**: Todas as rotas operacionais exigem o header `X-Session-Id` e retornam `503` se o WhatsApp não estiver conectado.
- **Logs estruturados** em JSON via Winston, incluindo `sessionId` em cada evento.

---

## Observações importantes

- **Uso não oficial**: Baileys viola os Termos de Serviço do WhatsApp.
- Use somente para **fins pessoais, educativos ou experimentais**.
- Para uso comercial, utilize a **WhatsApp Business Cloud API**.

---

## Licença

Projeto open-source para fins educativos. Não use para automações comerciais sem a API oficial.
