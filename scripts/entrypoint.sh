#!/bin/sh
set -e

echo "🚀 ChromaDB iniciado automaticamente pela imagem oficial"
echo "📁 Repositório de backup: GillSandro/Vetor_escola_bck"
echo "💾 Dados salvos em: /data"

# Aguardar ChromaDB iniciar completamente
echo "⏳ Aguardando ChromaDB estar pronto (10 segundos)..."
sleep 10

# Verificar se está respondendo
echo "🔍 Verificando conexão com ChromaDB..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null; then
    echo "✅ ChromaDB está online e respondendo!"
else
    echo "⚠️  ChromaDB não respondeu. Iniciando sistema de backup mesmo assim..."
fi

# Inicializar sistema de backup
echo "🔧 Inicializando sistema de backup GitHub..."
node /app/scripts/init-backup.js

# Manter container rodando
echo "✅ Sistema em execução:"
echo "   - ChromaDB: http://localhost:8000"
echo "   - Backup automático: a cada 2 horas"
echo "   - Repositório: GillSandro/Vetor_escola_bck"
echo "   - Persistência: /data"

tail -f /dev/null
