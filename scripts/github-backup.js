// scripts/github-backup.js
const fs = require('fs').promises;
const { exec } = require('child_process').promises;
const path = require('path');
const { ChromaClient } = require('chromadb');

class GitHubBackupChroma {
  constructor() {
    this.config = {};
    this.localPath = '/tmp/chroma-backup';
    this.backupFile = 'chroma_data.json';
  }

  async carregarConfig() {
    try {
      // 1. Tentar carregar do Secret File do Render
      const secretPath = '/etc/secrets/.chroma-backup.env';
      const content = await fs.readFile(secretPath, 'utf8');
      
      content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          this.config[key.trim()] = value.trim();
        }
      });
      
      console.log('✅ Configuração carregada do Secret File');
      
    } catch (error) {
      console.log('⚠️  Secret File não encontrado, usando variáveis de ambiente');
      
      // 2. Fallback para variáveis de ambiente
      this.config = {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GITHUB_REPO: process.env.GITHUB_REPO || 'GillSandro/Vetor_escola_bck',
        ALLOW_RESET: process.env.ALLOW_RESET || 'true'
      };
    }

    // Validar configuração
    if (!this.config.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN não configurado!');
    }
    
    if (!this.config.GITHUB_REPO) {
      this.config.GITHUB_REPO = 'GillSandro/Vetor_escola_bck';
    }

    this.repoUrl = `https://${this.config.GITHUB_TOKEN}@github.com/${this.config.GITHUB_REPO}.git`;
    
    console.log(`📁 Repositório: ${this.config.GITHUB_REPO}`);
    console.log(`🔑 Token: ${this.config.GITHUB_TOKEN ? '✔️ Configurado' : '❌ Ausente'}`);
    
    return this.config;
  }

  async executarComando(cmd, cwd = this.localPath) {
    try {
      const { stdout, stderr } = await exec(cmd, { cwd });
      if (stderr && !stderr.includes('warning')) {
        console.log(`⚠️ ${cmd}:`, stderr);
      }
      return stdout;
    } catch (error) {
      console.error(`❌ Erro no comando ${cmd}:`, error.message);
      throw error;
    }
  }

  async atualizarRepo() {
    try {
      await fs.access(this.localPath);
      console.log('🔄 Atualizando repositório local...');
      await this.executarComando('git fetch origin');
      await this.executarComando('git reset --hard origin/main');
      return true;
    } catch {
      console.log('📥 Clonando repositório do GitHub...');
      await this.executarComando(`git clone ${this.repoUrl} ${this.localPath}`, '.');
      return true;
    }
  }

  async salvarBackupNoGitHub(dados) {
    try {
      const backupPath = path.join(this.localPath, this.backupFile);
      await fs.writeFile(backupPath, JSON.stringify(dados, null, 2));
      
      await this.executarComando('git config user.name "Render Backup"');
      await this.executarComando('git config user.email "backup@render.com"');
      
      await this.executarComando('git add .');
      await this.executarComando(`git commit -m "Backup Chroma - ${new Date().toISOString().split('T')[0]}"`);
      await this.executarComando('git push origin main');
      
      console.log('✅ Backup salvo no GitHub!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar no GitHub:', error.message);
      return false;
    }
  }

  async fazerBackupChroma() {
    console.log('💾 Iniciando backup do ChromaDB...');
    
    await this.carregarConfig();
    
    const client = new ChromaClient({
      host: 'localhost',
      port: 8000,
    });

    try {
      const colecoes = await client.listCollections();
      console.log(`📊 Coleções encontradas: ${colecoes.length}`);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        totalColecoes: colecoes.length,
        colecoes: []
      };

      for (const colecaoInfo of colecoes) {
        console.log(`  📦 Processando: ${colecaoInfo.name}...`);
        
        const colecao = await client.getCollection({
          name: colecaoInfo.name
        });

        const todosDados = await colecao.get({});
        
        backupData.colecoes.push({
          nome: colecaoInfo.name,
          metadata: colecaoInfo.metadata,
          totalDocumentos: todosDados.ids.length,
          dados: {
            ids: todosDados.ids,
            documents: todosDados.documents,
            metadatas: todosDados.metadatas
          }
        });
        
        console.log(`    ✅ ${todosDados.ids.length} documentos`);
      }

      await this.atualizarRepo();
      const salvo = await this.salvarBackupNoGitHub(backupData);
      
      return salvo ? backupData : null;
      
    } catch (error) {
      console.error('❌ Erro no backup:', error.message);
      return null;
    }
  }

  async restaurarDoGitHub() {
    console.log('🔄 Restaurando ChromaDB do GitHub...');
    
    await this.carregarConfig();
    
    try {
      await this.atualizarRepo();
      
      const backupPath = path.join(this.localPath, this.backupFile);
      const data = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(data);
      
      console.log(`📁 Backup encontrado: ${backupData.totalColecoes} coleções`);
      
      const client = new ChromaClient({
        host: 'localhost',
        port: 8000,
      });

      let totalRestaurado = 0;

      for (const colecaoBackup of backupData.colecoes) {
        console.log(`🔧 Restaurando: ${colecaoBackup.nome} (${colecaoBackup.totalDocumentos} docs)...`);
        
        try {
          await client.deleteCollection({ name: colecaoBackup.nome });
        } catch (e) {
          // Ignorar se não existir
        }

        const colecao = await client.createCollection({
          name: colecaoBackup.nome,
          metadata: colecaoBackup.metadata
        });

        const batchSize = 50;
        const totalDocs = colecaoBackup.dados.ids.length;
        
        for (let i = 0; i < totalDocs; i += batchSize) {
          const batchIds = colecaoBackup.dados.ids.slice(i, i + batchSize);
          const batchDocs = colecaoBackup.dados.documents.slice(i, i + batchSize);
          const batchMetas = colecaoBackup.dados.metadatas.slice(i, i + batchSize);
          
          if (batchIds.length > 0) {
            await colecao.add({
              ids: batchIds,
              documents: batchDocs,
              metadatas: batchMetas
            });
          }
          
          const progress = Math.min(i + batchSize, totalDocs);
          if (progress % 100 === 0 || progress === totalDocs) {
            console.log(`    📊 ${progress}/${totalDocs} documentos...`);
          }
        }
        
        totalRestaurado += totalDocs;
        console.log(`    ✅ ${colecaoBackup.nome} restaurada`);
      }

      console.log(`🎯 TOTAL RESTAURADO: ${totalRestaurado} documentos`);
      return totalRestaurado;
      
    } catch (error) {
      console.error('❌ Erro na restauração:', error.message);
      return 0;
    }
  }

  async verificarERestaurar() {
    console.log('🔍 Verificando estado do ChromaDB...');
    
    await this.carregarConfig();
    
    const client = new ChromaClient({
      host: 'localhost',
      port: 8000,
    });

    try {
      const colecoes = await client.listCollections();
      const colecaoPrincipal = colecoes.find(c => c.name === 'regras_sistema');
      
      if (!colecaoPrincipal || colecoes.length === 0) {
        console.log('⚠️  ChromaDB vazio ou sem coleção principal');
        const restaurado = await this.restaurarDoGitHub();
        if (restaurado > 0) {
          console.log('✅ Dados restaurados do GitHub com sucesso!');
          return true;
        } else {
          console.log('⚠️  Não foi possível restaurar. ChromaDB permanecerá vazio.');
          return false;
        }
      }
      
      // Verificar se tem documentos
      const colecao = await client.getCollection({ name: 'regras_sistema' });
      const totalDocs = await colecao.count();
      
      console.log(`✅ ChromaDB OK: ${totalDocs} documentos em "regras_sistema"`);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao verificar ChromaDB:', error.message);
      const restaurado = await this.restaurarDoGitHub();
      return restaurado > 0;
    }
  }
}

// Exportar para uso
if (require.main === module) {
  const backup = new GitHubBackupChroma();
  
  const comando = process.argv[2];
  
  if (comando === 'backup') {
    backup.fazerBackupChroma().then(result => {
      if (result) {
        console.log('✅ Backup concluído com sucesso!');
        process.exit(0);
      } else {
        console.error('❌ Falha no backup');
        process.exit(1);
      }
    });
  } else if (comando === 'restore') {
    backup.restaurarDoGitHub().then(total => {
      if (total > 0) {
        console.log('✅ Restauração concluída!');
        process.exit(0);
      } else {
        console.error('❌ Falha na restauração');
        process.exit(1);
      }
    });
  } else {
    console.log('Comandos disponíveis:');
    console.log('  node github-backup.js backup    - Fazer backup');
    console.log('  node github-backup.js restore   - Restaurar do backup');
  }
} else {
  module.exports = GitHubBackupChroma;
}
