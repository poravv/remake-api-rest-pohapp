FROM node:20.12.2

# Instalar Python y dependencias necesarias para ONNX
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && pip3 install joblib scikit-learn numpy \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps

# Copiar archivos de la aplicación
COPY . .

# Verificar que los modelos ONNX existen
RUN ls -la ONNX/

# Puerto de la API
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm","run", "start"]12.2-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-dependencies

COPY . .

EXPOSE 3000

CMD ["npm","run", "start"]
