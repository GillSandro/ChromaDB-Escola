#!/bin/sh
set -e

echo "========================================="
echo "🚀 INICIANDO CHROMADB NO RENDER"
echo "========================================="

# Remover variável problemática que causa erro no ChromaDB
unset CHROMA_SERVER_CORS_ALLOW_ORIGINS

# Forçar valor correto
export CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'

# Criar diretório de dados
mkdir -p /data

# Iniciar ChromaDB
echo "⚡ Iniciando servidor ChromaDB..."
exec chroma run --host 0.0.0.0 --port 8000 --path /data
