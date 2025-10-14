import express from 'express'
import bodyParser from 'body-parser'
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import logger from './logger.js'

const app = express()
const port = 3000
app.use(bodyParser.json())

let sock

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
      // browser: ['Ubuntu', 'Chrome', '22.04.4'] # Para Linux
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log('📲 Escaneie o QR code no WhatsApp:')
        qrcode.generate(qr, { small: true })
      }

      if (connection === 'open') logger.info({ event: 'connected', msg: 'Conectado ao WhatsApp!' })

      if (connection === 'close') {
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
    logger.error({ event: 'startup_error', msg: err.message, stack: err.stack })
    setTimeout(startWhatsApp, 5000)
  }
}

app.post('/send-message', async (req, res) => {
  try {
    const { number, message } = req.body
    if (!number || !message) {
      logger.error({ event: 'invalid_request', msg: 'Número ou mensagem não fornecidos' })
      return res.status(400).json({ error: 'number e message são obrigatórios' })
    }

    const jid = `${number}@s.whatsapp.net`
    await sock.sendMessage(jid, { text: message })

    logger.info({
      event: 'message_sent',
      number,
      message,
      timestamp: new Date().toISOString()
    })

    return res.json({ status: 'success', number, message })
  } catch (err) {
    logger.error({ event: 'send_message_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

app.listen(port, () => {
  logger.info({ event: 'server_start', msg: `API rodando em http://localhost:${port}` })
  startWhatsApp()
})
