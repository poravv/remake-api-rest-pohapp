FROM node:20.12.2-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-dependencies

COPY . .

EXPOSE 3000

# node directo (no npm): npm no reenvia SIGTERM al proceso hijo, lo reporta
# como fallo y retrasa el apagado en cada rollout. El manejador de senales
# vive en src/server.js.
CMD ["node", "src/server.js"]
