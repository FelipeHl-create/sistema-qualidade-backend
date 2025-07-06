const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Configuração do banco de dados MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'senha123',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function setupDatabase() {
  try {
    console.log('🔧 Configurando banco de dados...');
    
    // Criar banco de dados se não existir
    await pool.execute('CREATE DATABASE IF NOT EXISTS qualidade');
    console.log('✅ Banco de dados "qualidade" criado/verificado');
    
    // Usar o banco de dados
    await pool.execute('USE qualidade');
    
    // Criar tabela de funcionários
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        funcao VARCHAR(255) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        perfil ENUM('admin', 'funcionario') DEFAULT 'funcionario',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela "funcionarios" criada/verificada');
    
    // Criar tabela de documentos
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS documentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        produto VARCHAR(255) NOT NULL,
        campos JSON NOT NULL,
        data_preenchimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finalizado BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (usuario_id) REFERENCES funcionarios(id)
      )
    `);
    console.log('✅ Tabela "documentos" criada/verificada');
    
    // Criar usuário admin
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.execute(`
      INSERT IGNORE INTO funcionarios (nome, cpf, email, funcao, senha, perfil) 
      VALUES ('Administrador', '00000000000', 'admin@steck.com.br', 'Administrador', ?, 'admin')
    `, [adminHash]);
    console.log('✅ Usuário admin criado/verificado');
    
    // Criar usuário teste
    const testeHash = await bcrypt.hash('teste123', 10);
    await pool.execute(`
      INSERT IGNORE INTO funcionarios (nome, cpf, email, funcao, senha, perfil) 
      VALUES ('Usuário Teste', '11111111111', 'teste@steck.com.br', 'Operador', ?, 'funcionario')
    `, [testeHash]);
    console.log('✅ Usuário teste criado/verificado');
    
    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('👨‍💼 Admin:');
    console.log('   Email: admin@steck.com.br');
    console.log('   Senha: admin123');
    console.log('\n👤 Usuário Teste:');
    console.log('   Email: teste@steck.com.br');
    console.log('   Senha: teste123');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase(); 