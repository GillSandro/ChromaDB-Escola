#!/bin/sh
set -e

echo "🚀 Iniciando ChromaDB com sistema de backup GitHub..."
echo "📁 Repositório: GillSandro/Vetor_escola_bck"

# Iniciar ChromaDB em segundo plano
echo "⚡ Iniciando ChromaDB..."
chroma run --path /data/chroma --host 0.0.0.0 --port 8000 &

# Aguardar ChromaDB iniciar
echo "⏳ Aguardando ChromaDB iniciar (15 segundos)..."
sleep 15

# Inicializar sistema de backup
echo "🔧 Inicializando sistema de backup..."
node /app/scripts/init-backup.js

# Health check simples para manter container ativo
echo "✅ Sistema pronto e em execução!"
echo "📊 Status:"
echo "   - ChromaDB: rodando na porta 8000"
echo "   - Backup: automático a cada 2 horas"
echo "   - Repositório: GillSandro/Vetor_escola_bck"

# Manter container rodando
tail -f /dev/null
