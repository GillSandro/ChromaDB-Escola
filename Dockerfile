FROM chromadb/chroma:latest

# Variáveis de ambiente do ChromaDB
ENV CHROMA_SERVER_HOST=0.0.0.0
ENV CHROMA_SERVER_HTTP_PORT=8000
ENV CHROMA_SERVER_CORS_ALLOW_ORIGINS=*
ENV ALLOW_RESET=true
ENV PERSIST_DIRECTORY=/data

EXPOSE 8000

# Instalar Node.js e dependências para backup
USER root
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório para scripts de backup
RUN mkdir -p /app/scripts

# Copiar scripts de backup
COPY scripts/ /app/scripts/

# Dar permissão de execução
RUN chmod +x /app/scripts/entrypoint.sh

# Instalar dependências Node.js para backup
WORKDIR /app/scripts
RUN npm init -y && npm install chromadb axios

# Voltar para o diretório do Chroma
WORKDIR /chroma

# Script de inicialização
ENTRYPOINT ["/app/scripts/entrypoint.sh"]

