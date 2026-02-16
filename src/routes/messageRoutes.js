import { Router } from 'express'
import { formatJid, requireConnection } from '../helpers.js'
import logger from '../logger.js'

const router = Router()
router.use(requireConnection)

// Enviar mensagem de texto
router.post('/send-message', async (req, res) => {
  try {
    const { number, message } = req.body
    if (!number || !message) {
      return res.status(400).json({ error: 'number e message são obrigatórios' })
    }

    const jid = formatJid(number)
    const result = await req.sock.sendMessage(jid, { text: message })

    logger.info({ event: 'message_sent', number, message, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, message, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_message_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar imagem
router.post('/send-image', async (req, res) => {
  try {
    const { number, imageUrl, caption } = req.body
    if (!number || !imageUrl) {
      return res.status(400).json({ error: 'number e imageUrl são obrigatórios' })
    }

    const jid = formatJid(number)
    const content = { image: { url: imageUrl } }
    if (caption) content.caption = caption

    const result = await req.sock.sendMessage(jid, content)

    logger.info({ event: 'image_sent', number, imageUrl, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_image_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar vídeo
router.post('/send-video', async (req, res) => {
  try {
    const { number, videoUrl, caption } = req.body
    if (!number || !videoUrl) {
      return res.status(400).json({ error: 'number e videoUrl são obrigatórios' })
    }

    const jid = formatJid(number)
    const content = { video: { url: videoUrl } }
    if (caption) content.caption = caption

    const result = await req.sock.sendMessage(jid, content)

    logger.info({ event: 'video_sent', number, videoUrl, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_video_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar áudio
router.post('/send-audio', async (req, res) => {
  try {
    const { number, audioUrl, ptt } = req.body
    if (!number || !audioUrl) {
      return res.status(400).json({ error: 'number e audioUrl são obrigatórios' })
    }

    const jid = formatJid(number)
    const content = {
      audio: { url: audioUrl },
      mimetype: 'audio/mp4',
      ptt: ptt || false
    }

    const result = await req.sock.sendMessage(jid, content)

    logger.info({ event: 'audio_sent', number, audioUrl, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_audio_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar documento
router.post('/send-document', async (req, res) => {
  try {
    const { number, documentUrl, mimetype, fileName } = req.body
    if (!number || !documentUrl) {
      return res.status(400).json({ error: 'number e documentUrl são obrigatórios' })
    }

    const jid = formatJid(number)
    const content = {
      document: { url: documentUrl },
      mimetype: mimetype || 'application/pdf',
      fileName: fileName || 'document'
    }

    const result = await req.sock.sendMessage(jid, content)

    logger.info({ event: 'document_sent', number, documentUrl, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_document_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar localização
router.post('/send-location', async (req, res) => {
  try {
    const { number, latitude, longitude } = req.body
    if (!number || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'number, latitude e longitude são obrigatórios' })
    }

    const jid = formatJid(number)
    const result = await req.sock.sendMessage(jid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude
      }
    })

    logger.info({ event: 'location_sent', number, latitude, longitude, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_location_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar contato (vCard)
router.post('/send-contact', async (req, res) => {
  try {
    const { number, contactName, contactNumber } = req.body
    if (!number || !contactName || !contactNumber) {
      return res.status(400).json({ error: 'number, contactName e contactNumber são obrigatórios' })
    }

    const jid = formatJid(number)
    const cleanNumber = contactNumber.replace(/[^0-9]/g, '')
    const vcard = 'BEGIN:VCARD\n'
      + 'VERSION:3.0\n'
      + `FN:${contactName}\n`
      + `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n`
      + 'END:VCARD'

    const result = await req.sock.sendMessage(jid, {
      contacts: {
        displayName: contactName,
        contacts: [{ vcard }]
      }
    })

    logger.info({ event: 'contact_sent', number, contactName, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_contact_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar reação a uma mensagem
router.post('/send-reaction', async (req, res) => {
  try {
    const { number, messageId, reaction } = req.body
    if (!number || !messageId) {
      return res.status(400).json({ error: 'number e messageId são obrigatórios' })
    }

    const jid = formatJid(number)
    const result = await req.sock.sendMessage(jid, {
      react: {
        text: reaction || '',
        key: {
          remoteJid: jid,
          id: messageId
        }
      }
    })

    logger.info({ event: 'reaction_sent', number, messageId, reaction, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_reaction_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Enviar enquete (poll)
router.post('/send-poll', async (req, res) => {
  try {
    const { number, name, options, selectableCount } = req.body
    if (!number || !name || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'number, name e options (array) são obrigatórios' })
    }

    const jid = formatJid(number)
    const result = await req.sock.sendMessage(jid, {
      poll: {
        name,
        values: options,
        selectableCount: selectableCount || 1
      }
    })

    logger.info({ event: 'poll_sent', number, name, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'send_poll_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Deletar mensagem (para todos)
router.post('/delete-message', async (req, res) => {
  try {
    const { number, messageId, fromMe } = req.body
    if (!number || !messageId) {
      return res.status(400).json({ error: 'number e messageId são obrigatórios' })
    }

    const jid = formatJid(number)
    await req.sock.sendMessage(jid, {
      delete: {
        remoteJid: jid,
        id: messageId,
        fromMe: fromMe !== undefined ? fromMe : true
      }
    })

    logger.info({ event: 'message_deleted', number, messageId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId })
  } catch (err) {
    logger.error({ event: 'delete_message_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Editar mensagem
router.post('/edit-message', async (req, res) => {
  try {
    const { number, messageId, newMessage } = req.body
    if (!number || !messageId || !newMessage) {
      return res.status(400).json({ error: 'number, messageId e newMessage são obrigatórios' })
    }

    const jid = formatJid(number)
    const result = await req.sock.sendMessage(jid, {
      text: newMessage,
      edit: {
        remoteJid: jid,
        id: messageId,
        fromMe: true
      }
    })

    logger.info({ event: 'message_edited', number, messageId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, messageId: result.key.id })
  } catch (err) {
    logger.error({ event: 'edit_message_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

export default router
