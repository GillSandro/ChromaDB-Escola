#!/bin/sh
set -e

echo "========================================="
echo "🚀 INICIANDO CHROMADB"
echo "========================================="

# Configurar CORS
export CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'

# Criar diretório de dados
mkdir -p /data

# Iniciar ChromaDB (APENAS ISSO)
echo "⚡ Iniciando servidor ChromaDB..."
exec chroma run --host 0.0.0.0 --port 8000 --path /data
