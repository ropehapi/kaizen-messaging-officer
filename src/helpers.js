import { getSession } from './socket.js'
import logger from './logger.js'

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
 * Middleware de autenticação via API Key.
 *
 * - Se a variável de ambiente API_KEY não estiver definida, a autenticação
 *   é desabilitada (modo desenvolvimento) e todas as requisições passam.
 * - Rotas de páginas HTML para QR code (/sessions/:id/qr) são isentas,
 *   pois são acessadas diretamente pelo browser.
 * - Todas as demais rotas /api exigem o header x-api-key com o valor correto.
 */
export function requireApiKey(req, res, next) {
  const API_KEY = process.env.API_KEY

  // Se API_KEY não está configurada, autenticação desabilitada (modo dev)
  if (!API_KEY) {
    return next()
  }

  // Rotas de QR code via browser são isentas (GET /sessions/:id/qr)
  const isQrPage = req.method === 'GET' && /^\/sessions\/[^/]+\/qr$/.test(req.path)
  if (isQrPage) {
    return next()
  }

  const providedKey = req.headers['x-api-key']

  if (!providedKey) {
    logger.warn({ event: 'auth_missing_key', ip: req.ip, path: req.originalUrl })
    return res.status(401).json({
      status: 'error',
      error: 'Header x-api-key é obrigatório'
    })
  }

  if (providedKey !== API_KEY) {
    logger.warn({ event: 'auth_invalid_key', ip: req.ip, path: req.originalUrl })
    return res.status(401).json({
      status: 'error',
      error: 'API key inválida'
    })
  }

  next()
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
