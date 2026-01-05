// scripts/init-backup.js
const GitHubBackupChroma = require('./github-backup.js');

async function inicializarSistema() {
  console.log('🚀 INICIANDO SISTEMA DE BACKUP CHROMADB');
  console.log('='.repeat(60));
  console.log('📁 Repositório: GillSandro/Vetor_escola_bck');
  console.log('🔐 Usando: Secret File do Render');
  console.log('='.repeat(60));
  
  const backupSystem = new GitHubBackupChroma();
  
  try {
    // 1. Verificar configuração
    await backupSystem.carregarConfig();
    
    // 2. Verificar e restaurar se necessário
    console.log('\n🔍 Verificando estado do ChromaDB...');
    const ok = await backupSystem.verificarERestaurar();
    
    if (ok) {
      console.log('\n✅ Sistema de backup inicializado com sucesso!');
      
      // 3. Agendar backup a cada 2 horas
      const intervaloBackup = 2 * 60 * 60 * 1000; // 2 horas
      setInterval(async () => {
        console.log('\n⏰ Backup periódico iniciado...');
        try {
          await backupSystem.fazerBackupChroma();
          console.log('✅ Backup periódico concluído');
        } catch (error) {
          console.error('❌ Erro no backup periódico:', error.message);
        }
      }, intervaloBackup);
      
      console.log(`⏰ Próximo backup em: ${intervaloBackup / 1000 / 60} minutos`);
      
      // 4. Fazer backup inicial após 5 minutos
      setTimeout(async () => {
        console.log('\n💾 Executando backup inicial...');
        try {
          await backupSystem.fazerBackupChroma();
          console.log('✅ Backup inicial concluído');
        } catch (error) {
          console.error('❌ Erro no backup inicial:', error.message);
        }
      }, 5 * 60 * 1000); // 5 minutos
      
      return true;
    } else {
      console.error('\n❌ Falha ao inicializar sistema de backup');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Erro crítico na inicialização:', error.message);
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  inicializarSistema().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = inicializarSistema;
