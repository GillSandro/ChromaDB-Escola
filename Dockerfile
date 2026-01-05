FROM python:3.11-slim-bookworm

# Instalar apenas ChromaDB
RUN pip install chromadb

# Variáveis de ambiente
ENV CHROMA_SERVER_HOST=0.0.0.0
ENV CHROMA_SERVER_HTTP_PORT=8000
ENV PERSIST_DIRECTORY=/data

EXPOSE 8000

# Criar diretórios
RUN mkdir -p /app /data

WORKDIR /app

# Copiar APENAS o entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Definir entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
