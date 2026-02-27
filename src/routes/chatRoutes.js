import { Router } from 'express'
import { formatJid, requireConnection } from '../helpers.js'
import logger from '../logger.js'

const router = Router()

// Todos os endpoints de chat requerem conexão ativa via header X-Session-Id
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

    logger.info({ event: 'presence_updated', sessionId: req.sessionId, number, presence, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', presence, number: number || null })
  } catch (err) {
    logger.error({ event: 'presence_error', sessionId: req.sessionId, msg: err.message, stack: err.stack })
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

    logger.info({ event: 'messages_read', sessionId: req.sessionId, count: keys.length, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', readCount: keys.length })
  } catch (err) {
    logger.error({ event: 'read_messages_error', sessionId: req.sessionId, msg: err.message, stack: err.stack })
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

    logger.info({ event: archive ? 'chat_archived' : 'chat_unarchived', sessionId: req.sessionId, number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, archived: archive })
  } catch (err) {
    logger.error({ event: 'archive_error', sessionId: req.sessionId, msg: err.message, stack: err.stack })
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

    logger.info({ event: mute ? 'chat_muted' : 'chat_unmuted', sessionId: req.sessionId, number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, muted: mute })
  } catch (err) {
    logger.error({ event: 'mute_error', sessionId: req.sessionId, msg: err.message, stack: err.stack })
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

    logger.info({ event: pin ? 'chat_pinned' : 'chat_unpinned', sessionId: req.sessionId, number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, pinned: pin })
  } catch (err) {
    logger.error({ event: 'pin_error', sessionId: req.sessionId, msg: err.message, stack: err.stack })
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

    logger.info({ event: 'call_rejected', sessionId: req.sessionId, callId, callFrom, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', callId, callFrom })
  } catch (err) {
    logger.error({ event: 'reject_call_error', sessionId: req.sessionId, msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

export default router
