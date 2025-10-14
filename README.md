# WhatsApp Bot API

Uma **API REST** para enviar mensagens pelo WhatsApp usando a biblioteca **Baileys** (cliente não oficial do WhatsApp Web).  
Permite enviar mensagens de texto para qualquer número com persistência de sessão e reconexão automática.

---

## Tecnologias utilizadas

- Node.js  
- Express.js → framework web para API REST  
- Baileys → cliente WhatsApp Web  
- qrcode-terminal → exibe QR code no terminal  
- body-parser → faz parsing de JSON do corpo das requisições  

---

## Estrutura do projeto

```
whatsapp-bot/
├── auth/                 # Credenciais da sessão Baileys (não versionar)
├── src/
│   └── index.js          # Arquivo principal da API e conexão WhatsApp
├── package.json
└── README.md
```

---

## Instalação

1. Clone o repositório:

```bash
git clone <repositório>
cd whatsapp-bot
```

2. Instale dependências:

```bash
npm install
```

3. (Opcional) Crie a pasta para credenciais:

```bash
mkdir auth
```

---

## Rodando a aplicação

```bash
node src/index.js
```

- O terminal exibirá um **QR code**.  
- Escaneie com o WhatsApp (em *Aparelhos conectados*).  
- A sessão será salva em `auth/` para evitar reescaneamentos futuros.  

---

## Endpoint da API

### `POST /send-message`

Envia uma mensagem de texto para um número de WhatsApp.

**URL:** `http://localhost:3000/send-message`  
**Método:** `POST`  
**Headers:**

```http
Content-Type: application/json
```

**Body JSON:**

```json
{
  "number": "5599999999999",
  "message": "Olá do bot via API!"
}
```

- `number`: Número do destinatário com **código do país + DDD**.  
- `message`: Texto da mensagem a ser enviada.

**Resposta de sucesso:**

```json
{
  "status": "success",
  "number": "5599999999999",
  "message": "Olá do bot via API!"
}
```

**Resposta de erro:**

```json
{
  "status": "error",
  "error": "Mensagem ou número não informados"
}
```

---

## Funcionamento interno

- Conecta ao WhatsApp Web usando **Baileys**.  
- **Sessão persistente**: credenciais salvas em `auth/` para evitar reescanear QR code.  
- **Reconexão automática**: reinicia conexão se houver queda.  
- Compatível com **iOS** simulando Safari no iPhone para evitar erros de conexão.

---

## Observações importantes

- ⚠️ **Uso não oficial**: Baileys viola os Termos de Serviço do WhatsApp.  
- ✅ Use somente para **fins pessoais, educativos ou experimentais**.  
- Para uso comercial, utilize a **WhatsApp Business Cloud API**.

---

## Próximos passos / melhorias

- Adicionar envio de **mídia** (imagens, áudios, PDFs) via API.  
- Criar **logs detalhados** de mensagens enviadas e falhas.  
- Adicionar **autenticação** na API (JWT, API Key).  
- Implementar **fila de envio** para múltiplas mensagens simultâneas.  
- Criar **dashboard web** para monitorar status do bot e histórico de mensagens.

---

## Exemplo de uso com cURL

```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{"number":"5599999999999","message":"Olá do bot via API!"}'
```

---

## Licença

Projeto open-source para fins educativos. ⚠️ Não use para automações comerciais sem a API oficial.
