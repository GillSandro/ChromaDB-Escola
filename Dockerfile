FROM python:3.11-slim-bookworm

# 1. Instalar ChromaDB
RUN pip install chromadb

# 2. Instalar Node.js para scripts
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 3. Variáveis de ambiente
ENV CHROMA_SERVER_HOST=0.0.0.0
ENV CHROMA_SERVER_HTTP_PORT=8000
ENV PERSIST_DIRECTORY=/data

EXPOSE 8000

# 4. Criar diretórios
RUN mkdir -p /app /data

WORKDIR /app

# 5. Copiar entrypoint da RAIZ (o seu que já está correto)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 6. Copiar scripts
COPY scripts/ ./scripts/

# 7. REMOVER automaticamente o entrypoint duplicado dos scripts
RUN rm -f /app/scripts/entrypoint.sh

# 8. Instalar dependências Node dos scripts
WORKDIR /app/scripts
RUN npm init -y --silent && npm install chromadb dotenv

# 9. Voltar para diretório principal
WORKDIR /app

# 10. Usar entrypoint da raiz
ENTRYPOINT ["/app/entrypoint.sh"]
