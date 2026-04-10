FROM node:18-alpine

WORKDIR /app

# Next requires some specific dependencies in alpine
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install

COPY . .

# Set telemetry to disabled during build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

EXPOSE 3000

ENV PORT 3000
CMD ["npm", "start"]
