# Messaging Officer - WhatsApp API

Uma **API REST** para interagir com o WhatsApp usando a biblioteca **Baileys** (cliente não oficial do WhatsApp Web).  
Permite enviar mensagens de texto, mídias, gerenciar grupos, consultar contatos e muito mais, com persistência de sessão e reconexão automática.

---

## Tecnologias utilizadas

- Node.js  
- Express.js → framework web para API REST  
- Baileys → cliente WhatsApp Web via WebSocket  
- Swagger UI → documentação interativa da API (OpenAPI 3.0)  
- qrcode-terminal → exibe QR code no terminal  
- body-parser → faz parsing de JSON do corpo das requisições  
- Winston → logging estruturado em JSON  

---

## Estrutura do projeto

```
messaging-officer/
├── auth/                          # Credenciais da sessão Baileys (não versionar)
├── logs/                          # Logs da aplicação
├── src/
│   ├── index.js                   # Entry point - registra rotas e Swagger
│   ├── socket.js                  # Gerenciamento da conexão WhatsApp
│   ├── helpers.js                 # Funções auxiliares e middlewares
│   ├── logger.js                  # Configuração do Winston logger
│   ├── swagger.js                 # Especificação OpenAPI 3.0
│   └── routes/
│       ├── messageRoutes.js       # Envio de mensagens (texto, mídia, localização, etc.)
│       ├── contactRoutes.js       # Consultas de contatos e perfil
│       ├── groupRoutes.js         # Operações com grupos
│       └── chatRoutes.js          # Operações de chat (presença, leitura, etc.)
├── Dockerfile                     # Imagem Docker da aplicação
├── docker-compose.yml             # Orquestração com Docker Compose
├── .dockerignore                  # Arquivos ignorados no build Docker
├── package.json
└── README.md
```

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados

---

## Rodando com Docker (recomendado)

1. Clone o repositório:

```bash
git clone <repositório>
cd messaging-officer
```

2. Suba a aplicação:

```bash
docker compose up -d
```

3. Acompanhe os logs para escanear o QR code:

```bash
docker compose logs -f
```

4. Escaneie o QR code com o WhatsApp (em *Aparelhos conectados*).

5. A sessão será salva em `auth/` (volume persistente) para evitar reescaneamentos futuros.

Para parar a aplicação:

```bash
docker compose down
```

Para reconstruir após alterações no código:

```bash
docker compose up -d --build
```

---

## Rodando sem Docker

1. Certifique-se de ter o **Node.js 22+** instalado.

2. Clone o repositório e instale as dependências:

```bash
git clone <repositório>
cd messaging-officer
npm install
```

3. Inicie a aplicação:

```bash
npm start
```

- O terminal exibirá um **QR code**.  
- Escaneie com o WhatsApp (em *Aparelhos conectados*).  
- A sessão será salva em `auth/` para evitar reescaneamentos futuros.

---

## Documentação da API (Swagger)

Após iniciar a aplicação, a documentação interativa estará disponível em:

```
http://localhost:3000/docs
```

A documentação Swagger permite:
- Visualizar todos os endpoints disponíveis organizados por categoria
- Testar as requisições diretamente pelo navegador
- Consultar os schemas de request/response de cada endpoint
- Ver exemplos de payloads para cada operação

---

## Endpoints da API

Todos os endpoints estão documentados no Swagger. Abaixo um resumo por categoria:

### Conexão
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/connection-status` | Status da conexão + QR code |

### Mensagens
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/send-message` | Enviar mensagem de texto |
| `POST` | `/api/send-image` | Enviar imagem |
| `POST` | `/api/send-video` | Enviar vídeo |
| `POST` | `/api/send-audio` | Enviar áudio |
| `POST` | `/api/send-document` | Enviar documento |
| `POST` | `/api/send-location` | Enviar localização |
| `POST` | `/api/send-contact` | Enviar contato (vCard) |
| `POST` | `/api/send-reaction` | Reagir a uma mensagem |
| `POST` | `/api/send-poll` | Enviar enquete |
| `POST` | `/api/delete-message` | Deletar mensagem (para todos) |
| `POST` | `/api/edit-message` | Editar mensagem |

### Contatos
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/check-number/:number` | Verificar se existe no WhatsApp |
| `GET` | `/api/profile-picture/:number` | Foto de perfil |
| `GET` | `/api/status/:number` | Status (recado) do contato |
| `GET` | `/api/business-profile/:number` | Perfil comercial |
| `POST` | `/api/block` | Bloquear usuário |
| `POST` | `/api/unblock` | Desbloquear usuário |
| `GET` | `/api/blocklist` | Lista de bloqueados |

### Perfil
| Método | Rota | Descrição |
|--------|------|-----------|
| `PUT` | `/api/profile-name` | Atualizar nome do perfil |
| `PUT` | `/api/profile-status` | Atualizar status/recado |

### Grupos
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/groups` | Listar todos os grupos |
| `POST` | `/api/groups/create` | Criar grupo |
| `GET` | `/api/groups/:groupId/metadata` | Metadados do grupo |
| `GET` | `/api/groups/:groupId/invite-code` | Código de convite |
| `POST` | `/api/groups/:groupId/revoke-invite` | Revogar código de convite |
| `POST` | `/api/groups/join` | Entrar pelo código de convite |
| `GET` | `/api/groups/invite-info/:inviteCode` | Info pelo código de convite |
| `POST` | `/api/groups/:groupId/participants` | Add/Remove/Promote/Demote |
| `PUT` | `/api/groups/:groupId/subject` | Atualizar nome do grupo |
| `PUT` | `/api/groups/:groupId/description` | Atualizar descrição |
| `PUT` | `/api/groups/:groupId/settings` | Alterar configurações |
| `POST` | `/api/groups/:groupId/leave` | Sair do grupo |
| `GET` | `/api/groups/:groupId/profile-picture` | Foto do grupo |

### Chat
| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/presence` | Atualizar presença (digitando, online...) |
| `POST` | `/api/read-messages` | Marcar mensagens como lidas |
| `POST` | `/api/archive` | Arquivar/Desarquivar chat |
| `POST` | `/api/mute` | Mutar/Desmutar chat |
| `POST` | `/api/pin` | Fixar/Desfixar chat |
| `POST` | `/api/reject-call` | Rejeitar chamada |

---

## Exemplo de uso com cURL

```bash
# Enviar mensagem de texto
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"number":"5599999999999","message":"Olá do bot via API!"}'

# Verificar se número existe no WhatsApp
curl http://localhost:3000/api/check-number/5599999999999

# Verificar status da conexão
curl http://localhost:3000/api/connection-status
```

---

## Funcionamento interno

- Conecta ao WhatsApp Web usando **Baileys** via WebSocket.  
- **Sessão persistente**: credenciais salvas em `auth/` para evitar reescanear QR code.  
- **Reconexão automática**: reinicia conexão se houver queda (exceto sessão invalidada).  
- **Middleware de conexão**: todos os endpoints retornam `503` se o WhatsApp não estiver conectado.  
- **Logs estruturados** em JSON via Winston para todas as operações.

---

## Observações importantes

- **Uso não oficial**: Baileys viola os Termos de Serviço do WhatsApp.  
- Use somente para **fins pessoais, educativos ou experimentais**.  
- Para uso comercial, utilize a **WhatsApp Business Cloud API**.

---

## Licença

Projeto open-source para fins educativos. Não use para automações comerciais sem a API oficial.
