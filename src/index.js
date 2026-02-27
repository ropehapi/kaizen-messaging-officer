import 'dotenv/config'
import express from 'express'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import logger from './logger.js'
import swaggerDocument from './swagger.js'
import { restoreAllSessions } from './socket.js'
import { requireApiKey } from './helpers.js'
import sessionRoutes from './routes/sessionRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import groupRoutes from './routes/groupRoutes.js'
import chatRoutes from './routes/chatRoutes.js'

const app = express()
const port = 3000
app.use(bodyParser.json())

// Documentação Swagger (pública, sem autenticação)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Messaging Officer - API Docs'
}))

// Middleware de autenticação via API Key para todas as rotas /api
// (páginas de QR code são isentas automaticamente pelo middleware)
app.use('/api', requireApiKey)

// Rotas de sessão (não exigem X-Session-Id): criar, listar, QR, deletar
app.use('/api/sessions', sessionRoutes)

// Rotas abaixo exigem header X-Session-Id para identificar a sessão
app.use('/api', chatRoutes)
app.use('/api', messageRoutes)
app.use('/api', contactRoutes)
app.use('/api/groups', groupRoutes)

app.listen(port, () => {
  logger.info({ event: 'server_start', msg: `API rodando em http://localhost:${port}` })
  logger.info({ event: 'swagger_docs', msg: `Documentação Swagger disponível em http://localhost:${port}/docs` })

  // Restaura sessões que tinham credenciais salvas em auth/
  restoreAllSessions()
})
