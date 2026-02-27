import { Router } from 'express'
import { formatJid, requireConnection } from '../helpers.js'
import { getConnectionStatus, getQrCode } from '../socket.js'
import logger from '../logger.js'

const router = Router()

// Status da conexão (não precisa de conexão ativa)
router.get('/connection-status', (req, res) => {
  const status = getConnectionStatus()
  const qrDataUrl = getQrCode()

  return res.json({
    status: 'success',
    connection: status,
    hasQrCode: !!qrDataUrl,
    qrCode: qrDataUrl || null
  })
})

// Página HTML para escanear o QR code via browser (não precisa de conexão ativa)
router.get('/qr', (req, res) => {
  const status = getConnectionStatus()
  const qrDataUrl = getQrCode()

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Messaging Officer — QR Code</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b141a;
      color: #e9edef;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1f2c34;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,.3);
    }
    .card h1 {
      font-size: 1.4rem;
      margin-bottom: 8px;
      color: #00a884;
    }
    .card p {
      font-size: 0.9rem;
      color: #8696a0;
      margin-bottom: 24px;
    }
    .qr-container {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin-bottom: 24px;
    }
    .qr-container img {
      display: block;
      width: 264px;
      height: 264px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
    }
    .status.connected { background: #00a88422; color: #00a884; }
    .status.qr { background: #f7c94822; color: #f7c948; }
    .status.disconnected { background: #ea434322; color: #ea4343; }
    .status.error { background: #ea434322; color: #ea4343; }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.connected { background: #00a884; }
    .dot.qr { background: #f7c948; animation: pulse 1.5s infinite; }
    .dot.disconnected { background: #ea4343; }
    .dot.error { background: #ea4343; }
    .connected-msg {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .hint {
      font-size: 0.8rem;
      color: #8696a0;
      margin-top: 16px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .4; }
    }
  </style>
  ${status === 'qr' ? '<meta http-equiv="refresh" content="30">' : ''}
  ${status === 'disconnected' || status === 'error' ? '<meta http-equiv="refresh" content="5">' : ''}
</head>
<body>
  <div class="card">
    <h1>Messaging Officer</h1>
    <p>WhatsApp Web — Autenticação</p>

    ${status === 'qr' && qrDataUrl ? `
      <div class="qr-container">
        <img src="${qrDataUrl}" alt="QR Code WhatsApp" />
      </div>
      <p>Abra o WhatsApp no celular → Menu → Dispositivos conectados → Conectar dispositivo</p>
    ` : ''}

    ${status === 'connected' ? `
      <div class="connected-msg">✅</div>
      <p>WhatsApp conectado com sucesso!</p>
    ` : ''}

    ${status === 'disconnected' ? `
      <div class="connected-msg">⏳</div>
      <p>Aguardando conexão... Esta página atualiza automaticamente.</p>
    ` : ''}

    ${status === 'error' ? `
      <div class="connected-msg">❌</div>
      <p>Erro na conexão. Verifique os logs da aplicação.</p>
    ` : ''}

    <div>
      <span class="status ${status}">
        <span class="dot ${status}"></span>
        ${status === 'connected' ? 'Conectado' : ''}
        ${status === 'qr' ? 'Aguardando escaneamento' : ''}
        ${status === 'disconnected' ? 'Desconectado' : ''}
        ${status === 'error' ? 'Erro' : ''}
      </span>
    </div>

    <p class="hint">Página atualiza automaticamente</p>
  </div>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html')
  return res.send(html)
})

// Endpoints abaixo requerem conexão ativa
router.use(requireConnection)

// Atualizar presença (digitando, online, etc.)
router.post('/presence', async (req, res) => {
  try {
    const { number, presence } = req.body
    const validPresences = ['available', 'unavailable', 'composing', 'recording', 'paused']

    if (!presence || !validPresences.includes(presence)) {
      return res.status(400).json({
        error: 'presence é obrigatório (available/unavailable/composing/recording/paused)'
      })
    }

    if (presence === 'available' || presence === 'unavailable') {
      await req.sock.sendPresenceUpdate(presence)
    } else {
      if (!number) {
        return res.status(400).json({ error: 'number é obrigatório para composing/recording/paused' })
      }
      const jid = formatJid(number)
      await req.sock.sendPresenceUpdate(presence, jid)
    }

    logger.info({ event: 'presence_updated', number, presence, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', presence, number: number || null })
  } catch (err) {
    logger.error({ event: 'presence_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Marcar mensagens como lidas
router.post('/read-messages', async (req, res) => {
  try {
    const { keys } = req.body
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        error: 'keys é obrigatório (array de objetos com remoteJid e id)',
        example: [{ remoteJid: '5511999999999@s.whatsapp.net', id: 'MESSAGE_ID' }]
      })
    }

    await req.sock.readMessages(keys)

    logger.info({ event: 'messages_read', count: keys.length, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', readCount: keys.length })
  } catch (err) {
    logger.error({ event: 'read_messages_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Arquivar/Desarquivar chat
router.post('/archive', async (req, res) => {
  try {
    const { number, archive, lastMessageKey, lastMessageTimestamp } = req.body
    if (!number || archive === undefined) {
      return res.status(400).json({ error: 'number e archive (boolean) são obrigatórios' })
    }

    const jid = formatJid(number)
    const lastMessage = lastMessageKey
      ? { key: lastMessageKey, messageTimestamp: lastMessageTimestamp }
      : undefined

    await req.sock.chatModify(
      { archive: archive, lastMessages: lastMessage ? [lastMessage] : [] },
      jid
    )

    logger.info({ event: archive ? 'chat_archived' : 'chat_unarchived', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, archived: archive })
  } catch (err) {
    logger.error({ event: 'archive_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Mutar/Desmutar chat
router.post('/mute', async (req, res) => {
  try {
    const { number, mute, duration } = req.body
    if (!number || mute === undefined) {
      return res.status(400).json({
        error: 'number e mute (boolean) são obrigatórios. duration em horas (8 ou 168 para 7 dias) é opcional para mute=true'
      })
    }

    const jid = formatJid(number)
    const muteValue = mute ? (duration || 8) * 60 * 60 * 1000 : null

    await req.sock.chatModify({ mute: muteValue }, jid)

    logger.info({ event: mute ? 'chat_muted' : 'chat_unmuted', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, muted: mute })
  } catch (err) {
    logger.error({ event: 'mute_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Fixar/Desfixar chat
router.post('/pin', async (req, res) => {
  try {
    const { number, pin } = req.body
    if (!number || pin === undefined) {
      return res.status(400).json({ error: 'number e pin (boolean) são obrigatórios' })
    }

    const jid = formatJid(number)
    await req.sock.chatModify({ pin: pin }, jid)

    logger.info({ event: pin ? 'chat_pinned' : 'chat_unpinned', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, pinned: pin })
  } catch (err) {
    logger.error({ event: 'pin_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Rejeitar chamada
router.post('/reject-call', async (req, res) => {
  try {
    const { callId, callFrom } = req.body
    if (!callId || !callFrom) {
      return res.status(400).json({ error: 'callId e callFrom são obrigatórios' })
    }

    await req.sock.rejectCall(callId, callFrom)

    logger.info({ event: 'call_rejected', callId, callFrom, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', callId, callFrom })
  } catch (err) {
    logger.error({ event: 'reject_call_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

export default router
