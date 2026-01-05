#!/bin/sh
set -e

echo "========================================="
echo "🚀 CHROMADB COM BACKUP GITHUB - IMAGEM PYTHON"
echo "========================================="
echo "📁 Backup repo: GillSandro/Vetor_escola_bck"
echo "💾 Dados em: /data"
echo "🌐 URL: http://localhost:8000"
echo "========================================="

# Criar diretório de dados
mkdir -p /data

# Iniciar ChromaDB (agora com python/chromadb instalado via pip)
echo "⚡ Iniciando ChromaDB..."
uvicorn chromadb.app:app --host 0.0.0.0 --port 8000 --workers 1 &

# Aguardar iniciar
echo "⏳ Aguardando ChromaDB iniciar (20 segundos)..."
sleep 20

# Verificar
echo "🔍 Testando conexão..."
if curl -s -f http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB ONLINE!"
else
    echo "⚠️  Aguardando mais 10 segundos..."
    sleep 10
fi

# Iniciar sistema de backup
echo "🔧 Iniciando sistema de backup GitHub..."
cd /app/scripts
node init-backup.js

echo "========================================="
echo "✅ SISTEMA OPERACIONAL"
echo "========================================="
echo "ChromaDB: http://localhost:8000"
echo "Backup: automático a cada 2h"
echo "Repo: GillSandro/Vetor_escola_bck"
echo "========================================="

# Manter container vivo
exec tail -f /dev/null
