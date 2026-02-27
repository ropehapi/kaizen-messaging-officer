const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Messaging Officer - WhatsApp API',
    description: 'API REST para interagir com o WhatsApp via Baileys com suporte a **múltiplas sessões**.\n\n## Autenticação\n\nTodas as rotas `/api` exigem o header `x-api-key` com a chave configurada na variável de ambiente `API_KEY`.\n\n> Se `API_KEY` não estiver definida, a autenticação é desabilitada (modo desenvolvimento).\n\n> Páginas HTML de QR code (`/api/sessions/{sessionId}/qr`) são públicas.\n\n## Sessões\n\nTodas as rotas operacionais (mensagens, contatos, grupos, chat) exigem o header `X-Session-Id` para identificar qual sessão WhatsApp utilizar.\n\n**Fluxo básico:**\n1. Crie uma sessão via `POST /api/sessions`\n2. Escaneie o QR code em `/api/sessions/{sessionId}/qr`\n3. Use os endpoints passando os headers `x-api-key` e `X-Session-Id`',
    version: '2.0.0',
    license: {
      name: 'ISC'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local'
    }
  ],
  tags: [
    { name: 'Sessões', description: 'Gerenciamento de sessões WhatsApp (criar, listar, QR, deletar, reiniciar)' },
    { name: 'Mensagens', description: 'Envio e gerenciamento de mensagens (requer X-Session-Id)' },
    { name: 'Contatos', description: 'Consultas e operações com contatos/usuários (requer X-Session-Id)' },
    { name: 'Perfil', description: 'Gerenciamento do perfil próprio (requer X-Session-Id)' },
    { name: 'Grupos', description: 'Operações com grupos do WhatsApp (requer X-Session-Id)' },
    { name: 'Chat', description: 'Operações de chat — presença, leitura, arquivar, etc. (requer X-Session-Id)' }
  ],
  paths: {
    // ===================== SESSÕES =====================
    '/api/sessions': {
      post: {
        tags: ['Sessões'],
        summary: 'Criar nova sessão',
        description: 'Cria uma nova sessão WhatsApp. Após criar, escaneie o QR code na URL retornada.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sessionId'],
                properties: {
                  sessionId: { type: 'string', description: 'Identificador único da sessão (letras, números, hífens e underscores)', example: 'pedro' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Sessão criada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    sessionId: { type: 'string', example: 'pedro' },
                    message: { type: 'string', example: 'Sessão criada. Escaneie o QR em /api/sessions/pedro/qr' },
                    qrUrl: { type: 'string', example: '/api/sessions/pedro/qr' }
                  }
                }
              }
            }
          },
          200: {
            description: 'Sessão já está conectada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    sessionId: { type: 'string', example: 'pedro' },
                    message: { type: 'string', example: 'Sessão já está conectada' },
                    connectionStatus: { type: 'string', example: 'connected' }
                  }
                }
              }
            }
          },
          400: {
            description: 'sessionId inválido ou ausente',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } }
          },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } }
        }
      },
      get: {
        tags: ['Sessões'],
        summary: 'Listar todas as sessões',
        description: 'Retorna todas as sessões ativas com seus respectivos status.',
        responses: {
          200: {
            description: 'Lista de sessões',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    sessions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'pedro' },
                          status: { type: 'string', enum: ['connected', 'disconnected', 'qr', 'error'], example: 'connected' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/sessions/{sessionId}/status': {
      get: {
        tags: ['Sessões'],
        summary: 'Status de uma sessão',
        description: 'Retorna o status de conexão e se há QR code disponível para uma sessão específica.',
        parameters: [
          { $ref: '#/components/parameters/SessionIdPath' }
        ],
        responses: {
          200: {
            description: 'Status retornado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    sessionId: { type: 'string', example: 'pedro' },
                    connection: { type: 'string', enum: ['connected', 'disconnected', 'qr', 'error'], example: 'connected' },
                    hasQrCode: { type: 'boolean', example: false }
                  }
                }
              }
            }
          },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } }
        }
      }
    },
    '/api/sessions/{sessionId}/qr': {
      get: {
        tags: ['Sessões'],
        summary: 'Página HTML do QR code',
        description: 'Retorna uma página HTML com o QR code para escaneamento via browser. Atualiza automaticamente.\n\n**Este endpoint é público** — não exige `x-api-key` pois é acessado diretamente pelo navegador.',
        security: [],
        parameters: [
          { $ref: '#/components/parameters/SessionIdPath' }
        ],
        responses: {
          200: {
            description: 'Página HTML com QR code',
            content: {
              'text/html': {
                schema: { type: 'string' }
              }
            }
          },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } }
        }
      }
    },
    '/api/sessions/{sessionId}/restart': {
      post: {
        tags: ['Sessões'],
        summary: 'Reiniciar sessão',
        description: 'Fecha a conexão atual e reconecta. Se as credenciais ainda forem válidas, reconecta sem novo QR.',
        parameters: [
          { $ref: '#/components/parameters/SessionIdPath' }
        ],
        responses: {
          200: {
            description: 'Sessão reiniciada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    sessionId: { type: 'string', example: 'pedro' },
                    message: { type: 'string', example: 'Sessão reiniciada. Aguarde reconexão ou escaneie novo QR.' },
                    qrUrl: { type: 'string', example: '/api/sessions/pedro/qr' }
                  }
                }
              }
            }
          },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } }
        }
      }
    },
    '/api/sessions/{sessionId}': {
      delete: {
        tags: ['Sessões'],
        summary: 'Deletar sessão',
        description: 'Desconecta a sessão do WhatsApp e remove os arquivos de credenciais permanentemente.',
        parameters: [
          { $ref: '#/components/parameters/SessionIdPath' }
        ],
        responses: {
          200: {
            description: 'Sessão deletada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    sessionId: { type: 'string', example: 'pedro' },
                    message: { type: 'string', example: 'Sessão desconectada e removida' }
                  }
                }
              }
            }
          },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } }
        }
      }
    },

    // ===================== MENSAGENS =====================
    '/api/send-message': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar mensagem de texto',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'message'],
                properties: {
                  number: { type: 'string', description: 'Número com código do país + DDD', example: '5511999999999' },
                  message: { type: 'string', description: 'Texto da mensagem', example: 'Olá! Esta é uma mensagem de teste.' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Mensagem enviada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-image': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar imagem',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'imageUrl'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  imageUrl: { type: 'string', description: 'URL da imagem', example: 'https://example.com/image.jpg' },
                  caption: { type: 'string', description: 'Legenda da imagem (opcional)', example: 'Veja esta foto!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Imagem enviada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-video': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar vídeo',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'videoUrl'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  videoUrl: { type: 'string', description: 'URL do vídeo', example: 'https://example.com/video.mp4' },
                  caption: { type: 'string', description: 'Legenda do vídeo (opcional)', example: 'Assista este vídeo!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Vídeo enviado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-audio': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar áudio',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'audioUrl'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  audioUrl: { type: 'string', description: 'URL do áudio', example: 'https://example.com/audio.mp3' },
                  ptt: { type: 'boolean', description: 'Enviar como mensagem de voz (push-to-talk)', default: false, example: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Áudio enviado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-document': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar documento',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'documentUrl'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  documentUrl: { type: 'string', description: 'URL do documento', example: 'https://example.com/file.pdf' },
                  mimetype: { type: 'string', description: 'Tipo MIME do documento', default: 'application/pdf', example: 'application/pdf' },
                  fileName: { type: 'string', description: 'Nome do arquivo', default: 'document', example: 'relatorio.pdf' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Documento enviado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-location': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar localização',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'latitude', 'longitude'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  latitude: { type: 'number', format: 'double', description: 'Latitude', example: -23.5505 },
                  longitude: { type: 'number', format: 'double', description: 'Longitude', example: -46.6333 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Localização enviada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-contact': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar contato (vCard)',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'contactName', 'contactNumber'],
                properties: {
                  number: { type: 'string', description: 'Destinatário', example: '5511999999999' },
                  contactName: { type: 'string', description: 'Nome do contato a enviar', example: 'João Silva' },
                  contactNumber: { type: 'string', description: 'Número do contato a enviar', example: '5511988888888' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Contato enviado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-reaction': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar reação a uma mensagem',
        description: 'Envia uma reação (emoji) a uma mensagem existente. Envie reaction vazio para remover a reação.',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'messageId'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  messageId: { type: 'string', description: 'ID da mensagem a reagir', example: 'ABCDEF1234567890' },
                  reaction: { type: 'string', description: 'Emoji da reação (vazio para remover)', example: '👍' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Reação enviada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/send-poll': {
      post: {
        tags: ['Mensagens'],
        summary: 'Enviar enquete (poll)',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'name', 'options'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  name: { type: 'string', description: 'Pergunta da enquete', example: 'Qual sua linguagem favorita?' },
                  options: { type: 'array', items: { type: 'string' }, description: 'Opções de resposta', example: ['JavaScript', 'Python', 'Go', 'Rust'] },
                  selectableCount: { type: 'integer', description: 'Quantas opções podem ser selecionadas', default: 1, example: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Enquete enviada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/delete-message': {
      post: {
        tags: ['Mensagens'],
        summary: 'Deletar mensagem (para todos)',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'messageId'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  messageId: { type: 'string', description: 'ID da mensagem a deletar', example: 'ABCDEF1234567890' },
                  fromMe: { type: 'boolean', description: 'Se a mensagem foi enviada por mim', default: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Mensagem deletada com sucesso', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, number: { type: 'string' }, messageId: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/edit-message': {
      post: {
        tags: ['Mensagens'],
        summary: 'Editar mensagem',
        description: 'Edita o texto de uma mensagem enviada anteriormente.',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'messageId', 'newMessage'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  messageId: { type: 'string', description: 'ID da mensagem a editar', example: 'ABCDEF1234567890' },
                  newMessage: { type: 'string', description: 'Novo texto da mensagem', example: 'Mensagem corrigida!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Mensagem editada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageSuccess' } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },

    // ===================== CONTATOS =====================
    '/api/check-number/{number}': {
      get: {
        tags: ['Contatos'],
        summary: 'Verificar se número existe no WhatsApp',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' }, description: 'Número com código do país + DDD', example: '5511999999999' }
        ],
        responses: {
          200: {
            description: 'Consulta realizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    number: { type: 'string', example: '5511999999999' },
                    exists: { type: 'boolean', example: true },
                    jid: { type: 'string', nullable: true, example: '5511999999999@s.whatsapp.net' }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/profile-picture/{number}': {
      get: {
        tags: ['Contatos'],
        summary: 'Buscar foto de perfil',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' }, description: 'Número do contato', example: '5511999999999' },
          { name: 'highRes', in: 'query', required: false, schema: { type: 'string', enum: ['true', 'false'] }, description: 'Retornar em alta resolução' }
        ],
        responses: {
          200: {
            description: 'Foto retornada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    number: { type: 'string' },
                    profilePictureUrl: { type: 'string', nullable: true }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/status/{number}': {
      get: {
        tags: ['Contatos'],
        summary: 'Buscar status (recado) do contato',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' }, description: 'Número do contato', example: '5511999999999' }
        ],
        responses: {
          200: {
            description: 'Status retornado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    number: { type: 'string' },
                    userStatus: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/business-profile/{number}': {
      get: {
        tags: ['Contatos'],
        summary: 'Buscar perfil comercial',
        description: 'Retorna informações do perfil comercial como descrição e categoria.',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' }, description: 'Número do contato', example: '5511999999999' }
        ],
        responses: {
          200: {
            description: 'Perfil comercial retornado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    number: { type: 'string' },
                    businessProfile: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/block': {
      post: {
        tags: ['Contatos'],
        summary: 'Bloquear usuário',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number'],
                properties: {
                  number: { type: 'string', example: '5511999999999' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Usuário bloqueado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, number: { type: 'string' }, action: { type: 'string', example: 'blocked' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/unblock': {
      post: {
        tags: ['Contatos'],
        summary: 'Desbloquear usuário',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number'],
                properties: {
                  number: { type: 'string', example: '5511999999999' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Usuário desbloqueado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, number: { type: 'string' }, action: { type: 'string', example: 'unblocked' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/blocklist': {
      get: {
        tags: ['Contatos'],
        summary: 'Listar usuários bloqueados',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        responses: {
          200: {
            description: 'Lista retornada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    blocklist: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },

    // ===================== PERFIL =====================
    '/api/profile-name': {
      put: {
        tags: ['Perfil'],
        summary: 'Atualizar nome do perfil',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', description: 'Novo nome do perfil', example: 'Meu Nome' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Nome atualizado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, name: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/profile-status': {
      put: {
        tags: ['Perfil'],
        summary: 'Atualizar status (recado) do perfil',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string', description: 'Novo texto do status/recado', example: 'Disponível para contato!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Status atualizado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, text: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },

    // ===================== GRUPOS =====================
    '/api/groups': {
      get: {
        tags: ['Grupos'],
        summary: 'Listar todos os grupos',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        responses: {
          200: {
            description: 'Grupos listados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    groups: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: '120363040469999999@g.us' },
                          subject: { type: 'string', example: 'Meu Grupo' },
                          owner: { type: 'string' },
                          creation: { type: 'integer' },
                          participantsCount: { type: 'integer', example: 15 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/create': {
      post: {
        tags: ['Grupos'],
        summary: 'Criar grupo',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'participants'],
                properties: {
                  name: { type: 'string', description: 'Nome do grupo', example: 'Novo Grupo' },
                  participants: { type: 'array', items: { type: 'string' }, description: 'Números dos participantes', example: ['5511999999999', '5511888888888'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Grupo criado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, group: { type: 'object' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/metadata': {
      get: {
        tags: ['Grupos'],
        summary: 'Obter metadados do grupo',
        description: 'Retorna participantes, nome, descrição e outras informações do grupo.',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo (com ou sem @g.us)', example: '120363040469999999@g.us' }
        ],
        responses: {
          200: { description: 'Metadados retornados', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, metadata: { type: 'object' } } } } } },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/invite-code': {
      get: {
        tags: ['Grupos'],
        summary: 'Obter código de convite do grupo',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        responses: {
          200: {
            description: 'Código retornado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    groupId: { type: 'string' },
                    inviteCode: { type: 'string', example: 'AbCdEfGhIjK' },
                    inviteLink: { type: 'string', example: 'https://chat.whatsapp.com/AbCdEfGhIjK' }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/revoke-invite': {
      post: {
        tags: ['Grupos'],
        summary: 'Revogar código de convite',
        description: 'Revoga o código de convite atual e gera um novo.',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        responses: {
          200: {
            description: 'Código revogado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    groupId: { type: 'string' },
                    newInviteCode: { type: 'string' },
                    newInviteLink: { type: 'string' }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/join': {
      post: {
        tags: ['Grupos'],
        summary: 'Entrar em grupo pelo código de convite',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['inviteCode'],
                properties: {
                  inviteCode: { type: 'string', description: 'Código ou link de convite', example: 'AbCdEfGhIjK' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Entrou no grupo', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupId: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/invite-info/{inviteCode}': {
      get: {
        tags: ['Grupos'],
        summary: 'Obter info do grupo pelo código de convite',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'inviteCode', in: 'path', required: true, schema: { type: 'string' }, description: 'Código de convite', example: 'AbCdEfGhIjK' }
        ],
        responses: {
          200: { description: 'Info retornada', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupInfo: { type: 'object' } } } } } },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/participants': {
      post: {
        tags: ['Grupos'],
        summary: 'Adicionar/Remover/Promover/Rebaixar participantes',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['participants', 'action'],
                properties: {
                  participants: { type: 'array', items: { type: 'string' }, description: 'Números dos participantes', example: ['5511999999999'] },
                  action: { type: 'string', enum: ['add', 'remove', 'promote', 'demote'], description: 'Ação a realizar', example: 'add' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Participantes atualizados', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupId: { type: 'string' }, action: { type: 'string' }, result: { type: 'object' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/subject': {
      put: {
        tags: ['Grupos'],
        summary: 'Atualizar nome do grupo',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject'],
                properties: {
                  subject: { type: 'string', description: 'Novo nome do grupo', example: 'Novo Nome do Grupo' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Nome atualizado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupId: { type: 'string' }, subject: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/description': {
      put: {
        tags: ['Grupos'],
        summary: 'Atualizar descrição do grupo',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['description'],
                properties: {
                  description: { type: 'string', description: 'Nova descrição do grupo', example: 'Descrição atualizada do grupo.' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Descrição atualizada', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupId: { type: 'string' }, description: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/settings': {
      put: {
        tags: ['Grupos'],
        summary: 'Alterar configurações do grupo',
        description: '`announcement` = somente admins enviam mensagens. `not_announcement` = todos enviam. `locked` = somente admins editam info. `unlocked` = todos editam.',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['setting'],
                properties: {
                  setting: { type: 'string', enum: ['announcement', 'not_announcement', 'locked', 'unlocked'], example: 'announcement' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Configuração atualizada', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupId: { type: 'string' }, setting: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/leave': {
      post: {
        tags: ['Grupos'],
        summary: 'Sair do grupo',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' }
        ],
        responses: {
          200: { description: 'Saiu do grupo', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, groupId: { type: 'string' }, action: { type: 'string', example: 'left' } } } } } },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/groups/{groupId}/profile-picture': {
      get: {
        tags: ['Grupos'],
        summary: 'Buscar foto de perfil do grupo',
        parameters: [
          { $ref: '#/components/parameters/XSessionId' },
          { name: 'groupId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do grupo', example: '120363040469999999@g.us' },
          { name: 'highRes', in: 'query', required: false, schema: { type: 'string', enum: ['true', 'false'] }, description: 'Alta resolução' }
        ],
        responses: {
          200: {
            description: 'Foto retornada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    groupId: { type: 'string' },
                    profilePictureUrl: { type: 'string', nullable: true }
                  }
                }
              }
            }
          },
          400: { description: 'X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },

    // ===================== CHAT =====================
    '/api/presence': {
      post: {
        tags: ['Chat'],
        summary: 'Atualizar presença',
        description: 'Define o status de presença (digitando, gravando, online, etc.). Para `composing`, `recording` e `paused`, o campo `number` é obrigatório.',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['presence'],
                properties: {
                  number: { type: 'string', description: 'Número do contato (obrigatório para composing/recording/paused)', example: '5511999999999' },
                  presence: { type: 'string', enum: ['available', 'unavailable', 'composing', 'recording', 'paused'], example: 'composing' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Presença atualizada', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, presence: { type: 'string' }, number: { type: 'string', nullable: true } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/read-messages': {
      post: {
        tags: ['Chat'],
        summary: 'Marcar mensagens como lidas',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['keys'],
                properties: {
                  keys: {
                    type: 'array',
                    description: 'Array de chaves de mensagens',
                    items: {
                      type: 'object',
                      required: ['remoteJid', 'id'],
                      properties: {
                        remoteJid: { type: 'string', description: 'JID do remetente', example: '5511999999999@s.whatsapp.net' },
                        id: { type: 'string', description: 'ID da mensagem', example: 'ABCDEF1234567890' },
                        fromMe: { type: 'boolean', description: 'Se a mensagem foi enviada por mim', example: false }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Mensagens marcadas como lidas', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, readCount: { type: 'integer', example: 2 } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/archive': {
      post: {
        tags: ['Chat'],
        summary: 'Arquivar/Desarquivar chat',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'archive'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  archive: { type: 'boolean', description: 'true para arquivar, false para desarquivar', example: true },
                  lastMessageKey: { type: 'object', description: 'Chave da última mensagem (opcional)' },
                  lastMessageTimestamp: { type: 'integer', description: 'Timestamp da última mensagem (opcional)' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Chat arquivado/desarquivado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, number: { type: 'string' }, archived: { type: 'boolean' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/mute': {
      post: {
        tags: ['Chat'],
        summary: 'Mutar/Desmutar chat',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'mute'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  mute: { type: 'boolean', description: 'true para mutar, false para desmutar', example: true },
                  duration: { type: 'integer', description: 'Duração em horas (padrão: 8h)', example: 8 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Chat mutado/desmutado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, number: { type: 'string' }, muted: { type: 'boolean' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/pin': {
      post: {
        tags: ['Chat'],
        summary: 'Fixar/Desfixar chat',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['number', 'pin'],
                properties: {
                  number: { type: 'string', example: '5511999999999' },
                  pin: { type: 'boolean', description: 'true para fixar, false para desfixar', example: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Chat fixado/desfixado', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, number: { type: 'string' }, pinned: { type: 'boolean' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    },
    '/api/reject-call': {
      post: {
        tags: ['Chat'],
        summary: 'Rejeitar chamada',
        parameters: [{ $ref: '#/components/parameters/XSessionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['callId', 'callFrom'],
                properties: {
                  callId: { type: 'string', description: 'ID da chamada', example: 'CALL_ID_123' },
                  callFrom: { type: 'string', description: 'Quem está ligando', example: '5511999999999@s.whatsapp.net' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Chamada rejeitada', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'success' }, callId: { type: 'string' }, callFrom: { type: 'string' } } } } } },
          400: { description: 'Parâmetros inválidos ou X-Session-Id ausente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          404: { description: 'Sessão não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404Session' } } } },
          500: { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
          503: { description: 'WhatsApp desconectado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error503' } } } }
        }
      }
    }
  },
  security: [
    { ApiKeyAuth: [] }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Chave de API configurada na variável de ambiente API_KEY. Se API_KEY não estiver definida, a autenticação é desabilitada.'
      }
    },
    parameters: {
      XSessionId: {
        name: 'X-Session-Id',
        in: 'header',
        required: true,
        description: 'Identificador da sessão WhatsApp a ser utilizada',
        schema: { type: 'string', example: 'pedro' }
      },
      SessionIdPath: {
        name: 'sessionId',
        in: 'path',
        required: true,
        description: 'Identificador da sessão WhatsApp',
        schema: { type: 'string', example: 'pedro' }
      }
    },
    schemas: {
      MessageSuccess: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          number: { type: 'string', example: '5511999999999' },
          messageId: { type: 'string', example: 'BAE5F4A2C3D1E6F0' }
        }
      },
      Error400: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: { type: 'string', example: 'Header X-Session-Id é obrigatório' }
        }
      },
      Error401: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: { type: 'string', example: 'API key inválida' }
        }
      },
      Error404Session: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: { type: 'string', example: 'Sessão "xxx" não encontrada. Crie via POST /api/sessions' },
          sessionId: { type: 'string', example: 'xxx' }
        }
      },
      Error500: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: { type: 'string', example: 'Mensagem de erro interno' }
        }
      },
      Error503: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          error: { type: 'string', example: 'WhatsApp não está conectado' },
          sessionId: { type: 'string', example: 'pedro' },
          connectionStatus: { type: 'string', example: 'disconnected' }
        }
      }
    }
  }
}

export default swaggerDocument
