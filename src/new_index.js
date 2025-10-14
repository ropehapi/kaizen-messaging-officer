import express from 'express'
import bodyParser from 'body-parser'
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'

const app = express()
const port = 3000

app.use(bodyParser.json())

let sock

// Inicia conexão com WhatsApp
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
        console.log('📲 Escaneie este QR code no WhatsApp:')
        qrcode.generate(qr, { small: true })
      }

      if (connection === 'open') console.log('✅ Conectado ao WhatsApp!')

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        console.log('🔌 Conexão fechada, statusCode:', statusCode)
        if (statusCode !== 401) startWhatsApp()
        else console.log('❌ Sessão inválida. Delete auth/ e reescaneie o QR code.')
      }
    })
  } catch (err) {
    console.error('❌ Erro ao iniciar WhatsApp:', err)
    setTimeout(startWhatsApp, 5000)
  }
}

// Endpoint /send-message
app.post('/send-message', async (req, res) => {
  try {
    const { number, message } = req.body
    if (!number || !message) return res.status(400).json({ error: 'number e message são obrigatórios' })

    const jid = `${number}@s.whatsapp.net`
    await sock.sendMessage(jid, { text: message })

    return res.json({ status: 'success', number, message })
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err)
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Inicia servidor e WhatsApp
app.listen(port, () => {
  console.log(`🌐 API rodando em http://localhost:${port}`)
  startWhatsApp()
})
