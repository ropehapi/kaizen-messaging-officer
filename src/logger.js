import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Cria pasta logs se não existir
const logDir = 'logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Logger único para info e errors em JSON
const logger = winston.createLogger({
  level: 'info', // Captura info e error
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // logs em JSON
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
    new winston.transports.Console({ format: winston.format.simple() })
  ],
});

export default logger;
