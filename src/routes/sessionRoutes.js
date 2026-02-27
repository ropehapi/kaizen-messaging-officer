import { Router } from 'express'
import { createSession, getSession, getAllSessions, deleteSession, restartSession } from '../socket.js'
import logger from '../logger.js'

const router = Router()

// Criar nova sessão
router.post('/', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ status: 'error', error: 'sessionId é obrigatório' })
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return res.status(400).json({
        status: 'error',
        error: 'sessionId deve conter apenas letras, números, hífens e underscores'
      })
    }

    const result = await createSession(sessionId)

    if (result.alreadyConnected) {
      return res.json({
        status: 'success',
        sessionId,
        message: 'Sessão já está conectada',
        connectionStatus: 'connected'
      })
    }

    logger.info({ event: 'session_created', sessionId })
    return res.status(201).json({
      status: 'success',
      sessionId,
      message: `Sessão criada. Escaneie o QR em /api/sessions/${sessionId}/qr`,
      qrUrl: `/api/sessions/${sessionId}/qr`
    })
  } catch (err) {
    logger.error({ event: 'create_session_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Listar todas as sessões
router.get('/', (req, res) => {
  const sessions = getAllSessions()
  return res.json({ status: 'success', sessions })
})

// Status de uma sessão específica
router.get('/:sessionId/status', (req, res) => {
  const { sessionId } = req.params
  const session = getSession(sessionId)

  if (!session) {
    return res.status(404).json({
      status: 'error',
      error: `Sessão "${sessionId}" não encontrada`
    })
  }

  return res.json({
    status: 'success',
    sessionId,
    connection: session.status,
    hasQrCode: !!session.qrCodeDataUrl
  })
})

// Página HTML com QR code para escaneamento via browser
router.get('/:sessionId/qr', (req, res) => {
  const { sessionId } = req.params
  const session = getSession(sessionId)

  if (!session) {
    return res.status(404).json({
      status: 'error',
      error: `Sessão "${sessionId}" não encontrada`
    })
  }

  const { status, qrCodeDataUrl } = session

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Messaging Officer — ${sessionId}</title>
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
      margin-bottom: 4px;
      color: #00a884;
    }
    .session-name {
      font-size: 0.95rem;
      color: #aebac1;
      margin-bottom: 8px;
      font-family: monospace;
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
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
    }
    .status-badge.connected { background: #00a88422; color: #00a884; }
    .status-badge.qr { background: #f7c94822; color: #f7c948; }
    .status-badge.disconnected { background: #ea434322; color: #ea4343; }
    .status-badge.error { background: #ea434322; color: #ea4343; }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.connected { background: #00a884; }
    .dot.qr { background: #f7c948; animation: pulse 1.5s infinite; }
    .dot.disconnected { background: #ea4343; }
    .dot.error { background: #ea4343; }
    .icon {
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
    <div class="session-name">${sessionId}</div>
    <p>WhatsApp Web — Autenticação</p>

    ${status === 'qr' && qrCodeDataUrl ? `
      <div class="qr-container">
        <img src="${qrCodeDataUrl}" alt="QR Code WhatsApp" />
      </div>
      <p>Abra o WhatsApp no celular → Menu → Dispositivos conectados → Conectar dispositivo</p>
    ` : ''}

    ${status === 'connected' ? `
      <div class="icon">✅</div>
      <p>WhatsApp conectado com sucesso!</p>
    ` : ''}

    ${status === 'disconnected' ? `
      <div class="icon">⏳</div>
      <p>Aguardando conexão... Esta página atualiza automaticamente.</p>
    ` : ''}

    ${status === 'error' ? `
      <div class="icon">❌</div>
      <p>Erro na conexão. Recrie a sessão ou verifique os logs.</p>
    ` : ''}

    <div>
      <span class="status-badge ${status}">
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

// Deletar sessão (desconecta + remove auth)
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const deleted = await deleteSession(sessionId)

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        error: `Sessão "${sessionId}" não encontrada`
      })
    }

    return res.json({
      status: 'success',
      sessionId,
      message: 'Sessão desconectada e removida'
    })
  } catch (err) {
    logger.error({ event: 'delete_session_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Reiniciar sessão (reconecta usando auth existente)
router.post('/:sessionId/restart', async (req, res) => {
  try {
    const { sessionId } = req.params
    const restarted = await restartSession(sessionId)

    if (!restarted) {
      return res.status(404).json({
        status: 'error',
        error: `Sessão "${sessionId}" não encontrada`
      })
    }

    return res.json({
      status: 'success',
      sessionId,
      message: 'Sessão reiniciada. Aguarde reconexão ou escaneie novo QR.',
      qrUrl: `/api/sessions/${sessionId}/qr`
    })
  } catch (err) {
    logger.error({ event: 'restart_session_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

export default router
