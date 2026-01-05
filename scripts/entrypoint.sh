#!/bin/sh
set -e

echo "🚀 Iniciando ChromaDB com sistema de backup GitHub..."
echo "📁 Repositório: GillSandro/Vetor_escola_bck"

# Configurar diretório de persistência
export PERSIST_DIRECTORY=/data
mkdir -p /data

echo "⚡ Iniciando ChromaDB..."
echo "📁 Diretório de dados: /data"

# Iniciar ChromaDB usando uvicorn (forma correta para versão atual)
uvicorn chromadb.app:app --host 0.0.0.0 --port 8000 --workers 1 &

# Aguardar ChromaDB iniciar
echo "⏳ Aguardando ChromaDB iniciar (20 segundos)..."
sleep 20

# Verificar se ChromaDB está respondendo
echo "🔍 Verificando se ChromaDB está online..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null; then
    echo "✅ ChromaDB está respondendo!"
else
    echo "❌ ChromaDB não está respondendo. Tentando continuar..."
fi

# Inicializar sistema de backup
echo "🔧 Inicializando sistema de backup..."
node /app/scripts/init-backup.js

# Health check simples para manter container ativo
echo "✅ Sistema pronto e em execução!"
echo "📊 Status:"
echo "   - ChromaDB: rodando na porta 8000"
echo "   - Backup: automático a cada 2 horas"
echo "   - Repositório: GillSandro/Vetor_escola_bck"
echo "   - Persistência: /data"

# Manter container rodando
tail -f /dev/null
