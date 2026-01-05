#!/bin/sh
set -e

echo "========================================="
echo "🚀 CHROMADB COM BACKUP GITHUB"
echo "========================================="
echo "📁 Backup repo: GillSandro/Vetor_escola_bck"
echo "💾 Dados em: /data"
echo "🌐 URL: http://localhost:8000"
echo "========================================="

# ChromaDB já inicia automaticamente na imagem oficial
# Apenas aguardar ele estar pronto
echo "⏳ Aguardando ChromaDB iniciar (15 segundos)..."
sleep 15

# Verificar se está respondendo (tentativa simples)
echo "🔍 Testando conexão com ChromaDB..."
if curl -s -f http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB ONLINE!"
else
    echo "⚠️  ChromaDB pode não estar respondendo, mas continuando..."
fi

# Iniciar sistema de backup
echo "🔧 Iniciando sistema de backup GitHub..."
cd /app/scripts
node init-backup.js

# Manter container rodando
echo "========================================="
echo "✅ SISTEMA OPERACIONAL"
echo "========================================="
echo "ChromaDB: http://localhost:8000"
echo "Backup: automático a cada 2h"
echo "Repo: GillSandro/Vetor_escola_bck"
echo "========================================="

# Manter container vivo
exec tail -f /dev/null
