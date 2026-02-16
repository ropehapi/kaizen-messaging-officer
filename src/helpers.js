import { getSock, getConnectionStatus } from './socket.js'

/**
 * Formata um número de telefone para o JID do WhatsApp.
 * Aceita números com ou sem @s.whatsapp.net
 */
export function formatJid(number) {
  if (!number) return null
  const cleaned = number.toString().replace(/[^0-9]/g, '')
  return `${cleaned}@s.whatsapp.net`
}

/**
 * Formata um ID de grupo para o JID do WhatsApp.
 * Aceita IDs com ou sem @g.us
 */
export function formatGroupJid(groupId) {
  if (!groupId) return null
  if (groupId.endsWith('@g.us')) return groupId
  return `${groupId}@g.us`
}

/**
 * Middleware que verifica se o socket está conectado antes de processar a requisição.
 */
export function requireConnection(req, res, next) {
  const status = getConnectionStatus()
  if (status !== 'connected') {
    return res.status(503).json({
      status: 'error',
      error: 'WhatsApp não está conectado',
      connectionStatus: status
    })
  }

  const sock = getSock()
  if (!sock) {
    return res.status(503).json({
      status: 'error',
      error: 'Socket não inicializado'
    })
  }

  req.sock = sock
  next()
}
