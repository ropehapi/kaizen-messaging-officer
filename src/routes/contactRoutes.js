import { Router } from 'express'
import { formatJid, requireConnection } from '../helpers.js'
import logger from '../logger.js'

const router = Router()
router.use(requireConnection)

// Verificar se número existe no WhatsApp
router.get('/check-number/:number', async (req, res) => {
  try {
    const { number } = req.params
    if (!number) {
      return res.status(400).json({ error: 'number é obrigatório' })
    }

    const jid = formatJid(number)
    const [result] = await req.sock.onWhatsApp(jid)

    logger.info({ event: 'check_number', number, exists: !!result?.exists, timestamp: new Date().toISOString() })
    return res.json({
      status: 'success',
      number,
      exists: !!result?.exists,
      jid: result?.jid || null
    })
  } catch (err) {
    logger.error({ event: 'check_number_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Buscar foto de perfil
router.get('/profile-picture/:number', async (req, res) => {
  try {
    const { number } = req.params
    const { highRes } = req.query
    if (!number) {
      return res.status(400).json({ error: 'number é obrigatório' })
    }

    const jid = formatJid(number)
    const ppUrl = await req.sock.profilePictureUrl(jid, highRes === 'true' ? 'image' : 'preview')

    logger.info({ event: 'profile_picture_fetched', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, profilePictureUrl: ppUrl })
  } catch (err) {
    if (err.message?.includes('not-authorized') || err.message?.includes('item-not-found')) {
      return res.json({ status: 'success', number: req.params.number, profilePictureUrl: null })
    }
    logger.error({ event: 'profile_picture_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Buscar status do contato
router.get('/status/:number', async (req, res) => {
  try {
    const { number } = req.params
    if (!number) {
      return res.status(400).json({ error: 'number é obrigatório' })
    }

    const jid = formatJid(number)
    const status = await req.sock.fetchStatus(jid)

    logger.info({ event: 'status_fetched', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, userStatus: status })
  } catch (err) {
    logger.error({ event: 'fetch_status_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Buscar perfil comercial
router.get('/business-profile/:number', async (req, res) => {
  try {
    const { number } = req.params
    if (!number) {
      return res.status(400).json({ error: 'number é obrigatório' })
    }

    const jid = formatJid(number)
    const profile = await req.sock.getBusinessProfile(jid)

    logger.info({ event: 'business_profile_fetched', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, businessProfile: profile })
  } catch (err) {
    logger.error({ event: 'business_profile_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Bloquear usuário
router.post('/block', async (req, res) => {
  try {
    const { number } = req.body
    if (!number) {
      return res.status(400).json({ error: 'number é obrigatório' })
    }

    const jid = formatJid(number)
    await req.sock.updateBlockStatus(jid, 'block')

    logger.info({ event: 'user_blocked', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, action: 'blocked' })
  } catch (err) {
    logger.error({ event: 'block_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Desbloquear usuário
router.post('/unblock', async (req, res) => {
  try {
    const { number } = req.body
    if (!number) {
      return res.status(400).json({ error: 'number é obrigatório' })
    }

    const jid = formatJid(number)
    await req.sock.updateBlockStatus(jid, 'unblock')

    logger.info({ event: 'user_unblocked', number, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', number, action: 'unblocked' })
  } catch (err) {
    logger.error({ event: 'unblock_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Buscar lista de bloqueados
router.get('/blocklist', async (req, res) => {
  try {
    const blocklist = await req.sock.fetchBlocklist()

    logger.info({ event: 'blocklist_fetched', timestamp: new Date().toISOString() })
    return res.json({ status: 'success', blocklist })
  } catch (err) {
    logger.error({ event: 'blocklist_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Atualizar nome do perfil
router.put('/profile-name', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'name é obrigatório' })
    }

    await req.sock.updateProfileName(name)

    logger.info({ event: 'profile_name_updated', name, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', name })
  } catch (err) {
    logger.error({ event: 'profile_name_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Atualizar status do perfil
router.put('/profile-status', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) {
      return res.status(400).json({ error: 'text é obrigatório' })
    }

    await req.sock.updateProfileStatus(text)

    logger.info({ event: 'profile_status_updated', text, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', text })
  } catch (err) {
    logger.error({ event: 'profile_status_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

export default router
