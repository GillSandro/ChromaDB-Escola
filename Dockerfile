FROM python:3.11-slim-bookworm

# Instalar ChromaDB diretamente via pip
RUN pip install chromadb

# Variáveis de ambiente do ChromaDB - CORRIGIDAS
ENV CHROMA_SERVER_HOST=0.0.0.0
ENV CHROMA_SERVER_HTTP_PORT=8000
ENV CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'  # 🔥 CORRIGIDO: JSON array
ENV ALLOW_RESET=true
ENV PERSIST_DIRECTORY=/data

EXPOSE 8000

# Instalar Node.js e dependências para backup
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório para scripts de backup
RUN mkdir -p /app/scripts /data

WORKDIR /app

# Copiar scripts de backup
COPY scripts/ ./scripts/

# Dar permissão de execução
RUN chmod +x /app/scripts/entrypoint.sh

# Instalar dependências Node.js para backup
WORKDIR /app/scripts
RUN npm init -y && npm install chromadb axios

# Script de inicialização
ENTRYPOINT ["/bin/sh", "/app/scripts/entrypoint.sh"]
