# Usa Node.js oficial (ajusta la versión si necesitas)
FROM node:20-alpine AS builder

# Define el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json
COPY package*.json ./

# Instala dependencias (solo producción para más liviano)
RUN npm install --production

# Copia el resto del código
COPY . .

# Expone el puerto (ajústalo si tu server usa otro)
EXPOSE 8080

# Comando para iniciar tu backend
CMD ["node", "server/index.js"]

# Etapa 1: Build del frontend con Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos package.json e instalamos dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del código y construimos
COPY . .
RUN npm run build

# Etapa 2: Imagen final solo con el backend y el build estático
FROM node:20-alpine

WORKDIR /app

# Copiamos solo dependencias de producción
COPY package*.json ./
RUN npm install --production

# Copiamos el backend (server) y el build del frontend
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Expone el puerto de Express (asegúrate de usar este mismo en tu server/index.js)
EXPOSE 8080

# Arranca el servidor
CMD ["node", "server/index.js"]
