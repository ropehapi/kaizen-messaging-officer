import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'

async function startBot() {
  try {
    // Cria/usa pasta para guardar credenciais
    const { state, saveCreds } = await useMultiFileAuthState('auth')

    // Busca versão mais recente do WhatsApp Web
    const { version } = await fetchLatestBaileysVersion()
    console.log('📦 Usando versão WhatsApp Web:', version.join('.'))

    // Inicializa conexão
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // vamos usar qrcode-terminal
      markOnlineOnConnect: false,
      browser: ['Safari', 'iOS', '14.8'] // simula iPhone Safari
    })

    // Salva credenciais sempre que atualizarem
    sock.ev.on('creds.update', saveCreds)

    // Monitora atualizações de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // Exibe QR code se houver
      if (qr) {
        console.log('📲 Escaneie este QR code no WhatsApp:')
        qrcode.generate(qr, { small: true })
      }

      // Conexão aberta
      if (connection === 'open') {
        console.log('✅ Conectado ao WhatsApp!')
        await sendMessage(sock)
      }

      // Conexão fechada
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        console.log('🔌 Conexão fechada, statusCode:', statusCode)
        // Reconecta automaticamente se não for erro 401 (sessão inválida)
        if (statusCode !== 401) {
          console.log('🔄 Tentando reconectar...')
          startBot()
        } else {
          console.log('❌ Sessão inválida. Exclua a pasta auth/ e reescaneie o QR code.')
        }
      }
    })
  } catch (err) {
    console.error('❌ Erro ao iniciar bot:', err)
    // Tenta reiniciar após 5s em caso de erro inesperado
    setTimeout(startBot, 5000)
  }
}

// Função para enviar mensagem
async function sendMessage(sock) {
  try {
    const number = '554396160255' // Substitua pelo número de destino
    const jid = `${number}@s.whatsapp.net`
    const message = 'Olá! 🤖 Esta é uma mensagem enviada via Baileys com reconexão automática.'

    await sock.sendMessage(jid, { text: message })
    console.log('📤 Mensagem enviada com sucesso!')
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err)
  }
}

// Inicia o bot
startBot()
