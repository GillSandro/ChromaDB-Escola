#!/bin/sh
set -e

echo "🕒 DEPLOY TIMESTAMP: $(date)"
echo "========================================="
echo "🚀 INICIANDO CHROMADB - VERSÃO ATUALIZADA"
echo "========================================="

# Remover variável problemática que causa erro no ChromaDB
unset CHROMA_SERVER_CORS_ALLOW_ORIGINS

# Forçar valor correto se necessário
export CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'

# Criar diretório de dados
mkdir -p /data

# Verificar ChromaDB (nosso NOVO script)
echo "🔧 Executando verificação do ChromaDB..."
cd /app/scripts
node github-backup.js check

# Iniciar ChromaDB
echo "⚡ Iniciando servidor ChromaDB..."
exec chroma run --host 0.0.0.0 --port 8000 --path /data
