import { Router } from 'express'
import { formatGroupJid, formatJid, requireConnection } from '../helpers.js'
import logger from '../logger.js'

const router = Router()
router.use(requireConnection)

// Listar todos os grupos
router.get('/', async (req, res) => {
  try {
    const groups = await req.sock.groupFetchAllParticipating()
    const groupList = Object.values(groups).map(group => ({
      id: group.id,
      subject: group.subject,
      owner: group.owner,
      creation: group.creation,
      participantsCount: group.participants?.length || 0
    }))

    logger.info({ event: 'groups_listed', count: groupList.length, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groups: groupList })
  } catch (err) {
    logger.error({ event: 'list_groups_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Criar grupo
router.post('/create', async (req, res) => {
  try {
    const { name, participants } = req.body
    if (!name || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'name e participants (array de números) são obrigatórios' })
    }

    const participantJids = participants.map(p => formatJid(p))
    const group = await req.sock.groupCreate(name, participantJids)

    logger.info({ event: 'group_created', groupId: group.id, name, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', group })
  } catch (err) {
    logger.error({ event: 'create_group_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Obter metadados do grupo
router.get('/:groupId/metadata', async (req, res) => {
  try {
    const { groupId } = req.params
    const jid = formatGroupJid(groupId)
    const metadata = await req.sock.groupMetadata(jid)

    logger.info({ event: 'group_metadata_fetched', groupId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', metadata })
  } catch (err) {
    logger.error({ event: 'group_metadata_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Obter código de convite do grupo
router.get('/:groupId/invite-code', async (req, res) => {
  try {
    const { groupId } = req.params
    const jid = formatGroupJid(groupId)
    const code = await req.sock.groupInviteCode(jid)

    logger.info({ event: 'invite_code_fetched', groupId, timestamp: new Date().toISOString() })
    return res.json({
      status: 'success',
      groupId,
      inviteCode: code,
      inviteLink: `https://chat.whatsapp.com/${code}`
    })
  } catch (err) {
    logger.error({ event: 'invite_code_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Revogar código de convite do grupo
router.post('/:groupId/revoke-invite', async (req, res) => {
  try {
    const { groupId } = req.params
    const jid = formatGroupJid(groupId)
    const code = await req.sock.groupRevokeInvite(jid)

    logger.info({ event: 'invite_code_revoked', groupId, timestamp: new Date().toISOString() })
    return res.json({
      status: 'success',
      groupId,
      newInviteCode: code,
      newInviteLink: `https://chat.whatsapp.com/${code}`
    })
  } catch (err) {
    logger.error({ event: 'revoke_invite_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Entrar em grupo pelo código de convite
router.post('/join', async (req, res) => {
  try {
    const { inviteCode } = req.body
    if (!inviteCode) {
      return res.status(400).json({ error: 'inviteCode é obrigatório' })
    }

    const code = inviteCode.replace('https://chat.whatsapp.com/', '')
    const groupId = await req.sock.groupAcceptInvite(code)

    logger.info({ event: 'group_joined', groupId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId })
  } catch (err) {
    logger.error({ event: 'join_group_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Obter info do grupo pelo código de convite
router.get('/invite-info/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params
    const code = inviteCode.replace('https://chat.whatsapp.com/', '')
    const info = await req.sock.groupGetInviteInfo(code)

    logger.info({ event: 'invite_info_fetched', inviteCode, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupInfo: info })
  } catch (err) {
    logger.error({ event: 'invite_info_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Adicionar/Remover/Promover/Rebaixar participantes
router.post('/:groupId/participants', async (req, res) => {
  try {
    const { groupId } = req.params
    const { participants, action } = req.body

    const validActions = ['add', 'remove', 'promote', 'demote']
    if (!participants || !Array.isArray(participants) || !action || !validActions.includes(action)) {
      return res.status(400).json({
        error: 'participants (array de números) e action (add/remove/promote/demote) são obrigatórios'
      })
    }

    const jid = formatGroupJid(groupId)
    const participantJids = participants.map(p => formatJid(p))
    const result = await req.sock.groupParticipantsUpdate(jid, participantJids, action)

    logger.info({ event: 'participants_updated', groupId, action, participants, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId, action, result })
  } catch (err) {
    logger.error({ event: 'participants_update_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Atualizar nome do grupo
router.put('/:groupId/subject', async (req, res) => {
  try {
    const { groupId } = req.params
    const { subject } = req.body
    if (!subject) {
      return res.status(400).json({ error: 'subject é obrigatório' })
    }

    const jid = formatGroupJid(groupId)
    await req.sock.groupUpdateSubject(jid, subject)

    logger.info({ event: 'group_subject_updated', groupId, subject, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId, subject })
  } catch (err) {
    logger.error({ event: 'group_subject_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Atualizar descrição do grupo
router.put('/:groupId/description', async (req, res) => {
  try {
    const { groupId } = req.params
    const { description } = req.body
    if (description === undefined) {
      return res.status(400).json({ error: 'description é obrigatório' })
    }

    const jid = formatGroupJid(groupId)
    await req.sock.groupUpdateDescription(jid, description)

    logger.info({ event: 'group_description_updated', groupId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId, description })
  } catch (err) {
    logger.error({ event: 'group_description_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Alterar configurações do grupo
router.put('/:groupId/settings', async (req, res) => {
  try {
    const { groupId } = req.params
    const { setting } = req.body

    const validSettings = ['announcement', 'not_announcement', 'locked', 'unlocked']
    if (!setting || !validSettings.includes(setting)) {
      return res.status(400).json({
        error: 'setting é obrigatório (announcement/not_announcement/locked/unlocked)'
      })
    }

    const jid = formatGroupJid(groupId)
    await req.sock.groupSettingUpdate(jid, setting)

    logger.info({ event: 'group_settings_updated', groupId, setting, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId, setting })
  } catch (err) {
    logger.error({ event: 'group_settings_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Sair do grupo
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params
    const jid = formatGroupJid(groupId)
    await req.sock.groupLeave(jid)

    logger.info({ event: 'group_left', groupId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId, action: 'left' })
  } catch (err) {
    logger.error({ event: 'leave_group_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

// Foto de perfil do grupo
router.get('/:groupId/profile-picture', async (req, res) => {
  try {
    const { groupId } = req.params
    const { highRes } = req.query
    const jid = formatGroupJid(groupId)
    const ppUrl = await req.sock.profilePictureUrl(jid, highRes === 'true' ? 'image' : 'preview')

    logger.info({ event: 'group_picture_fetched', groupId, timestamp: new Date().toISOString() })
    return res.json({ status: 'success', groupId, profilePictureUrl: ppUrl })
  } catch (err) {
    if (err.message?.includes('not-authorized') || err.message?.includes('item-not-found')) {
      return res.json({ status: 'success', groupId: req.params.groupId, profilePictureUrl: null })
    }
    logger.error({ event: 'group_picture_error', msg: err.message, stack: err.stack })
    return res.status(500).json({ status: 'error', error: err.message })
  }
})

export default router
