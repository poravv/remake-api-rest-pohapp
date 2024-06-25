FROM node:20.12.2-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-dependencies

COPY . .

EXPOSE 3000

CMD ["npm","run", "start"]
