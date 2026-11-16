FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY --chown=node:node . .
USER node
EXPOSE 8081

# Validação completa do código: Lint + Checagem TypeScript
CMD ["sh", "-c", "npm run lint && npx tsc --noEmit"]