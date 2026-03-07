FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "--max-old-space-size=200", "src/index.js"]