#!/bin/sh
set -e

echo "🕒 DEPLOY TIMESTAMP: $(date)"  # ← ADICIONE ESTA LINHA
echo "========================================="
echo "🚀 INICIANDO CHROMADB"
echo "========================================="

#!/bin/sh
set -e

echo "========================================="
echo "🚀 INICIANDO CHROMADB"
echo "========================================="

# Remover variável problemática
unset CHROMA_SERVER_CORS_ALLOW_ORIGINS

# Criar diretório de dados
mkdir -p /data

# Verificar ChromaDB (nosso NOVO script)
echo "🔧 Executando verificação..."
cd /app/scripts
node github-backup.js check

# Iniciar ChromaDB
echo "⚡ Iniciando servidor ChromaDB..."
exec chroma run --host 0.0.0.0 --port 8000 --path /data
