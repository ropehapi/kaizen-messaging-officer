import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import logger from './logger.js'

let sock = null
let connectionStatus = 'disconnected'
let qrCode = null

async function startWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      browser: ['Safari', 'iOS', '14.8']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        qrCode = qr
        connectionStatus = 'qr'
        console.log('📲 Escaneie o QR code no WhatsApp:')
        qrcode.generate(qr, { small: true })
      }

      if (connection === 'open') {
        connectionStatus = 'connected'
        qrCode = null
        logger.info({ event: 'connected', msg: 'Conectado ao WhatsApp!' })
      }

      if (connection === 'close') {
        connectionStatus = 'disconnected'
        const statusCode = lastDisconnect?.error?.output?.statusCode
        logger.info({ event: 'connection_closed', statusCode })
        if (statusCode !== 401) {
          logger.info({ event: 'reconnecting', msg: 'Tentando reconectar...' })
          startWhatsApp()
        } else {
          logger.error({ event: 'session_invalid', msg: 'Sessão inválida. Delete auth/ e reescaneie o QR code.' })
        }
      }
    })
  } catch (err) {
    connectionStatus = 'error'
    logger.error({ event: 'startup_error', msg: err.message, stack: err.stack })
    setTimeout(startWhatsApp, 5000)
  }
}

function getSock() {
  return sock
}

function getConnectionStatus() {
  return connectionStatus
}

function getQrCode() {
  return qrCode
}

export { startWhatsApp, getSock, getConnectionStatus, getQrCode }
