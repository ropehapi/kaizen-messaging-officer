import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcodeTerminal from 'qrcode-terminal'
import QRCode from 'qrcode'
import fs from 'fs/promises'
import path from 'path'
import logger from './logger.js'

const sessions = new Map()
const AUTH_DIR = 'auth'

/**
 * Cria uma nova sessão WhatsApp.
 * Se a sessão já existir e estiver conectada, retorna sem recriar.
 * Se existir mas não estiver conectada, destrói e recria.
 */
async function createSession(sessionId) {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId)
    if (existing.status === 'connected') {
      return { alreadyConnected: true }
    }
    // Sessão existe mas não está conectada — limpa e recria
    await cleanupSocket(sessionId)
  }

  const sessionAuthDir = path.join(AUTH_DIR, sessionId)
  await fs.mkdir(sessionAuthDir, { recursive: true })

  sessions.set(sessionId, {
    sock: null,
    status: 'disconnected',
    qrCodeDataUrl: null
  })

  await connectSession(sessionId)
  return { alreadyConnected: false }
}

/**
 * Conecta (ou reconecta) uma sessão ao WhatsApp via Baileys.
 */
async function connectSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return

  // Limpa socket anterior se existir
  if (session.sock) {
    try {
      session.sock.ev.removeAllListeners()
      session.sock.end()
    } catch (_) { /* socket já fechado */ }
    session.sock = null
  }

  try {
    const sessionAuthDir = path.join(AUTH_DIR, sessionId)
    const { state, saveCreds } = await useMultiFileAuthState(sessionAuthDir)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      browser: ['Safari', 'iOS', '14.8']
    })

    session.sock = sock

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          session.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
        } catch (err) {
          logger.error({ event: 'qr_generation_error', sessionId, msg: err.message })
          session.qrCodeDataUrl = null
        }
        session.status = 'qr'
        logger.info({ event: 'qr_generated', sessionId, msg: `QR gerado para sessão "${sessionId}". Escaneie via /api/sessions/${sessionId}/qr` })
        qrcodeTerminal.generate(qr, { small: true })
      }

      if (connection === 'open') {
        session.status = 'connected'
        session.qrCodeDataUrl = null
        logger.info({ event: 'connected', sessionId, msg: `Sessão "${sessionId}" conectada ao WhatsApp!` })
      }

      if (connection === 'close') {
        session.status = 'disconnected'
        const statusCode = lastDisconnect?.error?.output?.statusCode
        logger.info({ event: 'connection_closed', sessionId, statusCode })

        if (statusCode !== 401) {
          // Reconecta somente se a sessão ainda existir no Map
          setTimeout(() => {
            if (sessions.has(sessionId)) {
              logger.info({ event: 'reconnecting', sessionId })
              connectSession(sessionId)
            }
          }, 3000)
        } else {
          session.status = 'error'
          logger.error({ event: 'session_invalid', sessionId, msg: `Sessão "${sessionId}" inválida. Recrie a sessão.` })
        }
      }
    })
  } catch (err) {
    session.status = 'error'
    logger.error({ event: 'startup_error', sessionId, msg: err.message, stack: err.stack })
    setTimeout(() => {
      if (sessions.has(sessionId)) {
        connectSession(sessionId)
      }
    }, 5000)
  }
}

/**
 * Limpa o socket de uma sessão sem removê-la do Map.
 */
async function cleanupSocket(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return

  try {
    if (session.sock) {
      session.sock.ev.removeAllListeners()
      session.sock.end()
    }
  } catch (_) { /* socket já fechado */ }

  session.sock = null
  session.status = 'disconnected'
  session.qrCodeDataUrl = null
}

/**
 * Remove uma sessão: desconecta o socket e deleta os arquivos de auth.
 */
async function deleteSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return false

  await cleanupSocket(sessionId)
  sessions.delete(sessionId)

  const sessionAuthDir = path.join(AUTH_DIR, sessionId)
  await fs.rm(sessionAuthDir, { recursive: true, force: true }).catch(() => {})

  logger.info({ event: 'session_deleted', sessionId })
  return true
}

/**
 * Reinicia uma sessão: fecha o socket atual e reconecta.
 * Mantém os arquivos de auth (reconecta sem novo QR se possível).
 */
async function restartSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return false

  await cleanupSocket(sessionId)
  await connectSession(sessionId)

  logger.info({ event: 'session_restarted', sessionId })
  return true
}

/**
 * Retorna os dados de uma sessão pelo ID.
 */
function getSession(sessionId) {
  return sessions.get(sessionId) || null
}

/**
 * Lista todas as sessões com seus status.
 */
function getAllSessions() {
  const result = []
  for (const [id, session] of sessions) {
    result.push({
      id,
      status: session.status
    })
  }
  return result
}

/**
 * Restaura automaticamente todas as sessões que possuem credenciais salvas em auth/.
 * Chamada na inicialização da aplicação.
 */
async function restoreAllSessions() {
  try {
    await fs.mkdir(AUTH_DIR, { recursive: true })
    const entries = await fs.readdir(AUTH_DIR, { withFileTypes: true })
    const directories = entries.filter(e => e.isDirectory())

    if (directories.length === 0) {
      logger.info({ event: 'restore', msg: 'Nenhuma sessão encontrada para restaurar.' })
      return
    }

    logger.info({ event: 'restore', msg: `Restaurando ${directories.length} sessão(ões)...` })

    for (const dir of directories) {
      const sessionId = dir.name
      const credsPath = path.join(AUTH_DIR, sessionId, 'creds.json')

      try {
        await fs.access(credsPath)
        logger.info({ event: 'restore_session', sessionId })
        await createSession(sessionId)
      } catch {
        logger.info({ event: 'skip_restore', sessionId, msg: 'Sem credenciais, ignorando.' })
      }
    }
  } catch (err) {
    logger.error({ event: 'restore_error', msg: err.message, stack: err.stack })
  }
}

export {
  createSession,
  connectSession,
  deleteSession,
  restartSession,
  getSession,
  getAllSessions,
  restoreAllSessions
}
