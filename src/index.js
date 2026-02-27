import express from 'express'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import logger from './logger.js'
import swaggerDocument from './swagger.js'
import { startWhatsApp } from './socket.js'
import messageRoutes from './routes/messageRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import groupRoutes from './routes/groupRoutes.js'
import chatRoutes from './routes/chatRoutes.js'

const app = express()
const port = 3000
app.use(bodyParser.json())

// Documentação Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Messaging Officer - API Docs'
}))

// Rotas de chat (PRIMEIRO — inclui /connection-status e /qr que não exigem conexão ativa)
app.use('/api', chatRoutes)

// Rotas de mensagens: /api/send-message, /api/send-image, /api/send-video, etc.
app.use('/api', messageRoutes)

// Rotas de contatos/usuários: /api/check-number/:number, /api/profile-picture/:number, etc.
app.use('/api', contactRoutes)

// Rotas de grupos: /api/groups, /api/groups/create, /api/groups/:groupId/metadata, etc.
app.use('/api/groups', groupRoutes)

app.listen(port, () => {
  logger.info({ event: 'server_start', msg: `API rodando em http://localhost:${port}` })
  logger.info({ event: 'swagger_docs', msg: `Documentação Swagger disponível em http://localhost:${port}/docs` })
  startWhatsApp()
})
