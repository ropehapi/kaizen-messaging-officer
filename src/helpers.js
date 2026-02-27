import { getSession } from './socket.js'

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
 * Middleware que resolve a sessão via header X-Session-Id
 * e verifica se o socket está conectado antes de processar a requisição.
 *
 * - Lê o header X-Session-Id
 * - Busca a sessão no SessionManager
 * - Verifica se está conectada
 * - Injeta req.sock e req.sessionId
 */
export function requireConnection(req, res, next) {
  const sessionId = req.headers['x-session-id']

  if (!sessionId) {
    return res.status(400).json({
      status: 'error',
      error: 'Header X-Session-Id é obrigatório'
    })
  }

  const session = getSession(sessionId)

  if (!session) {
    return res.status(404).json({
      status: 'error',
      error: `Sessão "${sessionId}" não encontrada. Crie via POST /api/sessions`,
      sessionId
    })
  }

  if (session.status !== 'connected') {
    return res.status(503).json({
      status: 'error',
      error: 'WhatsApp não está conectado',
      sessionId,
      connectionStatus: session.status
    })
  }

  if (!session.sock) {
    return res.status(503).json({
      status: 'error',
      error: 'Socket não inicializado',
      sessionId
    })
  }

  req.sock = session.sock
  req.sessionId = sessionId
  next()
}
