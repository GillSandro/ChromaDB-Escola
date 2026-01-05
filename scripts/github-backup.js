// scripts/github-backup.js
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const { ChromaClient } = require('chromadb');

// Promisify exec para melhor controle
const execAsync = util.promisify(exec);

class GitHubBackupChroma {
  constructor() {
    this.config = {};
    this.localPath = '/tmp/chroma-backup';
    this.backupFile = 'chroma_data.json';
    this.repoUrl = null;
  }

  async carregarConfig() {
    console.log('🔍 Carregando configurações...');
    
    // INICIALIZAR config vazio
    this.config = {};
    this.repoUrl = null;

    try {
      // 1. Tentar carregar do Secret File do Render (para versões que têm)
      const secretPath = '/etc/secrets/.chroma-backup.env';
      try {
        const content = await fs.readFile(secretPath, 'utf8');
        content.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            this.config[key.trim()] = value.trim().replace(/['"]/g, '');
          }
        });
        console.log('✅ Configuração carregada do Secret File');
      } catch (fileError) {
        // Ignorar se não existir - é normal no Render Free
        console.log('ℹ️  Secret File não encontrado (normal no Render Free)');
      }
    } catch (error) {
      console.log('⚠️  Erro ao tentar ler Secret File:', error.message);
    }

    // 2. Variáveis de ambiente (SOBRESCREVEM Secret File)
    const envConfig = {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GITHUB_REPO: process.env.GITHUB_REPO || 'GillSandro/Vetor_escola_bck',
      ALLOW_RESET: process.env.ALLOW_RESET || 'true',
      CHROMA_HOST: process.env.CHROMA_HOST || 'localhost',
      CHROMA_PORT: process.env.CHROMA_PORT || '8000'
    };

    // Combinar (variáveis de ambiente têm prioridade)
    this.config = { ...this.config, ...envConfig };

    console.log('📊 Configurações finais:');
    console.log(`   - Repositório: ${this.config.GITHUB_REPO}`);
    console.log(`   - Token: ${this.config.GITHUB_TOKEN ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`   - Chroma: ${this.config.CHROMA_HOST}:${this.config.CHROMA_PORT}`);

    // Se tem token, configura URL do repositório
    if (this.config.GITHUB_TOKEN) {
      this.repoUrl = `https://${this.config.GITHUB_TOKEN}@github.com/${this.config.GITHUB_REPO}.git`;
      console.log('🔗 Backup/restore HABILITADO');
    } else {
      console.log('⚠️  GITHUB_TOKEN não configurado');
      console.log('💡 Backup/restore DESABILITADO');
      console.log('💡 Para habilitar, adicione GITHUB_TOKEN nas variáveis de ambiente');
    }

    return this.config;
  }
criarClienteChroma() {
  const isHttps = this.config.CHROMA_PORT === '443' || 
                  this.config.CHROMA_HOST.includes('render.com');
  
  return new ChromaClient({
    host: this.config.CHROMA_HOST,
    port: parseInt(this.config.CHROMA_PORT),
    ssl: isHttps,
    fetchOptions: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  });
}

  

  async executarComando(cmd, cwd = this.localPath) {
    try {
      console.log(`⚡ Executando: ${cmd}`);
      const { stdout, stderr } = await execAsync(cmd, { cwd });
      
      if (stderr && !stderr.includes('warning') && !stderr.includes('Cloning')) {
        console.log(`⚠️  Stderr: ${stderr}`);
      }
      
      return stdout.trim();
    } catch (error) {
      console.error(`❌ Erro no comando ${cmd}:`, error.message);
      if (error.stderr) {
        console.error(`❌ Detalhes: ${error.stderr}`);
      }
      throw error;
    }
  }

  async atualizarRepo() {
    // Se não tem repoUrl (sem token), não tenta git
    if (!this.repoUrl) {
      console.log('⚠️  Sem GITHUB_TOKEN - Pulando operações git');
      return false;
    }
    
    try {
      await fs.access(this.localPath);
      console.log('🔄 Atualizando repositório local...');
      
      // Garantir que estamos no branch correto
      await this.executarComando('git checkout main 2>/dev/null || git checkout -b main');
      
      // Limpar mudanças locais
      await this.executarComando('git reset --hard HEAD');
      
      // Fetch e pull com rebase
      await this.executarComando('git fetch origin');
      await this.executarComando('git reset --hard origin/main');
      
      console.log('✅ Repositório atualizado');
      return true;
    } catch (error) {
      console.log('📥 Clonando repositório do GitHub...');
      
      // Limpar diretório se existir
      try {
        await fs.rm(this.localPath, { recursive: true, force: true });
      } catch (rmError) {
        // Ignorar erros de remoção
      }
      
      await this.executarComando(`git clone ${this.repoUrl} ${this.localPath}`, '.');
      console.log('✅ Repositório clonado');
      return true;
    }
  }

  async salvarBackupNoGitHub(dados) {
    // Se não tem repoUrl (sem token), não tenta salvar
    if (!this.repoUrl) {
      console.log('⚠️  Sem GITHUB_TOKEN - Pulando salvamento no GitHub');
      return false;
    }
    
    try {
      console.log('💾 Salvando backup no GitHub...');
      const backupPath = path.join(this.localPath, this.backupFile);
      
      // Criar backup incremental
      const timestamp = new Date().toISOString();
      const backupData = {
        ...dados,
        timestamp,
        version: '1.0'
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`📁 Backup salvo localmente: ${backupData.totalColecoes} coleções`);
      
      // Configurar git
      await this.executarComando('git config user.name "Render Backup Bot"');
      await this.executarComando('git config user.email "backup-bot@render.com"');
      
      // Fazer commit
      await this.executarComando('git add .');
      const commitMessage = `Backup ChromaDB - ${timestamp}`;
      await this.executarComando(`git commit -m "${commitMessage}" --allow-empty`);
      
      // Fazer push
      await this.executarComando('git push origin main');
      
      console.log('✅ Backup salvo no GitHub!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar no GitHub:', error.message);
      
      // Tentar fazer push forçado em caso de conflito
      if (error.message.includes('failed to push') || error.message.includes('rejected')) {
        console.log('🔄 Tentando push forçado...');
        try {
          await this.executarComando('git push --force-with-lease origin main');
          console.log('✅ Push forçado bem-sucedido');
          return true;
        } catch (forceError) {
          console.error('❌ Falha no push forçado:', forceError.message);
        }
      }
      
      return false;
    }
  }

  async fazerBackupChroma() {
    console.log('💾 Iniciando backup do ChromaDB...');
    
    await this.carregarConfig();
    
    // Se não tem token, não faz backup
    if (!this.config.GITHUB_TOKEN || !this.repoUrl) {
      console.log('⚠️  GITHUB_TOKEN não configurado - Pulando backup');
      return null;
    }
const client = this.criarClienteChroma();

    try {
      const colecoes = await client.listCollections();
      console.log(`📊 Coleções encontradas: ${colecoes.length}`);
      
      if (colecoes.length === 0) {
        console.log('⚠️  Nenhuma coleção encontrada no ChromaDB');
        return null;
      }

      const backupData = {
        timestamp: new Date().toISOString(),
        totalColecoes: colecoes.length,
        colecoes: []
      };

      for (const colecaoInfo of colecoes) {
        console.log(`  📦 Processando: ${colecaoInfo.name}...`);
        
        try {
          const colecao = await client.getCollection({
            name: colecaoInfo.name
          });

          const todosDados = await colecao.get({
            include: ['documents', 'metadatas', 'embeddings']
          });
          
          // Extrair apenas dados essenciais
          const colecaoBackup = {
            nome: colecaoInfo.name,
            metadata: colecaoInfo.metadata || {},
            totalDocumentos: todosDados.ids.length,
            dados: {
              ids: todosDados.ids || [],
              documents: todosDados.documents || [],
              metadatas: todosDados.metadatas || []
            }
          };
          
          backupData.colecoes.push(colecaoBackup);
          console.log(`    ✅ ${colecaoBackup.totalDocumentos} documentos`);
        } catch (error) {
          console.error(`    ❌ Erro ao processar coleção ${colecaoInfo.name}:`, error.message);
          continue;
        }
      }

      await this.atualizarRepo();
      const salvo = await this.salvarBackupNoGitHub(backupData);
      
      return salvo ? backupData : null;
      
    } catch (error) {
      console.error('❌ Erro no backup do ChromaDB:', error.message);
      return null;
    }
  }

  async restaurarDoGitHub() {
    console.log('🔄 Restaurando ChromaDB do GitHub...');
    
    await this.carregarConfig();
    
    // SE não tem token ou repoUrl, retorna 0
    if (!this.config.GITHUB_TOKEN || !this.repoUrl) {
      console.log('⚠️  GITHUB_TOKEN não configurado - Pulando restauração');
      return 0;
    }
    
    try {
      const atualizado = await this.atualizarRepo();
      if (!atualizado) {
        return 0;
      }
      
      const backupPath = path.join(this.localPath, this.backupFile);
      const data = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(data);
      
      console.log(`📁 Backup encontrado: ${backupData.totalColecoes} coleções (${backupData.timestamp})`);

const client = this.criarClienteChroma();
      let totalRestaurado = 0;

      for (const colecaoBackup of backupData.colecoes) {
        console.log(`🔧 Restaurando: ${colecaoBackup.nome} (${colecaoBackup.totalDocumentos} docs)...`);
        
        try {
          // Tentar deletar coleção existente
          await client.deleteCollection({ name: colecaoBackup.nome });
          console.log(`    ♻️  Coleção antiga removida: ${colecaoBackup.nome}`);
        } catch (deleteError) {
          // Coleção não existia, continuar normalmente
          console.log(`    📝 Criando nova coleção: ${colecaoBackup.nome}`);
        }

        // Criar nova coleção
        const colecao = await client.createCollection({
          name: colecaoBackup.nome,
          metadata: colecaoBackup.metadata || {}
        });

        // Restaurar documentos em lotes
        const batchSize = 100;
        const totalDocs = colecaoBackup.dados.ids.length;
        
        for (let i = 0; i < totalDocs; i += batchSize) {
          const batchIds = colecaoBackup.dados.ids.slice(i, i + batchSize);
          const batchDocs = colecaoBackup.dados.documents.slice(i, i + batchSize);
          const batchMetas = colecaoBackup.dados.metadatas.slice(i, i + batchSize);
          
          if (batchIds.length > 0) {
            try {
              await colecao.add({
                ids: batchIds,
                documents: batchDocs,
                metadatas: batchMetas
              });
            } catch (batchError) {
              console.error(`    ⚠️  Erro no batch ${i}-${i + batchSize}:`, batchError.message);
              // Continuar com os próximos lotes
            }
          }
          
          const progress = Math.min(i + batchSize, totalDocs);
          if (progress % 500 === 0 || progress === totalDocs) {
            console.log(`    📊 Progresso: ${progress}/${totalDocs} documentos`);
          }
        }
        
        totalRestaurado += totalDocs;
        console.log(`    ✅ ${colecaoBackup.nome} restaurada com ${totalDocs} documentos`);
      }

      console.log(`🎯 TOTAL RESTAURADO: ${totalRestaurado} documentos em ${backupData.totalColecoes} coleções`);
      return totalRestaurado;
      
    } catch (error) {
      console.error('❌ Erro na restauração:', error.message);
      return 0;
    }
  }

  async verificarERestaurar() {
    console.log('🔍 Verificando estado do ChromaDB...');
    
    await this.carregarConfig();
    
    // Se não tem token, só verifica local
    if (!this.config.GITHUB_TOKEN || !this.repoUrl) {
      console.log('⚠️  Sem GITHUB_TOKEN - Apenas verificando ChromaDB local');
      
      try {
const client = this.criarClienteChroma();  // ← APENAS ESTA LINHA!
        const colecoes = await client.listCollections();
        console.log(`📊 ChromaDB local: ${colecoes.length} coleções`);
        return true; // Retorna true mesmo se vazio
        
      } catch (error) {
        console.log('⚠️  ChromaDB não acessível ou vazio');
        return false;
      }
    }
    
const client = this.criarClienteChroma();
    try {
      const colecoes = await client.listCollections();
      console.log(`📊 Coleções encontradas: ${colecoes.length}`);
      
      if (colecoes.length === 0) {
        console.log('⚠️  ChromaDB vazio. Restaurando do GitHub...');
        const restaurado = await this.restaurarDoGitHub();
        if (restaurado > 0) {
          console.log('✅ Dados restaurados do GitHub com sucesso!');
          return true;
        } else {
          console.log('⚠️  Não foi possível restaurar. ChromaDB permanecerá vazio.');
          return false;
        }
      }
      
      // Verificar coleção principal
      let colecaoPrincipal;
      try {
        colecaoPrincipal = await client.getCollection({ name: 'regras_sistema' });
        const totalDocs = await colecaoPrincipal.count();
        
        if (totalDocs === 0) {
          console.log('⚠️  Coleção "regras_sistema" vazia. Restaurando...');
          const restaurado = await this.restaurarDoGitHub();
          return restaurado > 0;
        }
        
        console.log(`✅ ChromaDB OK: ${totalDocs} documentos em "regras_sistema"`);
        return true;
      } catch (error) {
        console.log('⚠️  Coleção "regras_sistema" não encontrada. Restaurando...');
        const restaurado = await this.restaurarDoGitHub();
        return restaurado > 0;
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar ChromaDB:', error.message);
      console.log('🔄 Tentando restaurar do GitHub...');
      const restaurado = await this.restaurarDoGitHub();
      return restaurado > 0;
    }
  }
}

// Exportar para uso
if (require.main === module) {
  const backup = new GitHubBackupChroma();
  
  const comando = process.argv[2] || 'check';
  
  (async () => {
    try {
      switch (comando) {
        case 'backup':
          const result = await backup.fazerBackupChroma();
          if (result) {
            console.log('✅ Backup concluído com sucesso!');
            process.exit(0);
          } else {
            console.error('❌ Falha no backup');
            process.exit(1);
          }
          break;
          
        case 'restore':
          const total = await backup.restaurarDoGitHub();
          if (total > 0) {
            console.log('✅ Restauração concluída!');
            process.exit(0);
          } else {
            console.error('❌ Falha na restauração');
            process.exit(1);
          }
          break;
          
        case 'check':
          const ok = await backup.verificarERestaurar();
          if (ok) {
            console.log('✅ Verificação concluída - ChromaDB OK');
            process.exit(0);
          } else {
            console.error('⚠️  ChromaDB precisa de atenção');
            process.exit(1);
          }
          break;
          
        default:
          console.log('Comandos disponíveis:');
          console.log('  node github-backup.js backup    - Fazer backup do ChromaDB');
          console.log('  node github-backup.js restore   - Restaurar do backup no GitHub');
          console.log('  node github-backup.js check     - Verificar e restaurar se necessário (padrão)');
          process.exit(0);
      }
    } catch (error) {
      console.error('❌ Erro fatal:', error.message);
      process.exit(1);
    }
  })();
} else {
  module.exports = GitHubBackupChroma;
}
