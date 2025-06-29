const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração do banco de dados MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'senha123',
  database: 'qualidade',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware de autenticação
function autenticarToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, 'segredo', (err, usuario) => {
    if (err) return res.sendStatus(403);
    req.usuario = usuario;
    next();
  });
}

// Cadastro de funcionário
app.post('/api/funcionarios', async (req, res) => {
  try {
    const { nome, cpf, email, funcao, senha } = req.body;
    // Verifica duplicidade
    const [existe] = await pool.execute(
      'SELECT * FROM funcionarios WHERE email = ? OR cpf = ?', 
      [email, cpf]
    );
    if (existe.length > 0) {
      return res.status(400).json({ erro: 'E-mail ou CPF já cadastrado.' });
    }
    const hash = await bcrypt.hash(senha, 10);
    await pool.execute(
      'INSERT INTO funcionarios (nome, cpf, email, funcao, senha, perfil) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, cpf, email, funcao, hash, 'funcionario']
    );
    res.status(201).json({ mensagem: 'Funcionário cadastrado com sucesso.' });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Login de usuário
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const [resultado] = await pool.execute(
      'SELECT * FROM funcionarios WHERE email = ?', 
      [email]
    );
    if (resultado.length === 0) {
      return res.status(400).json({ erro: 'Usuário não encontrado.' });
    }
    const usuario = resultado[0];
    if (!(await bcrypt.compare(senha, usuario.senha))) {
      return res.status(400).json({ erro: 'Senha incorreta.' });
    }
    // Gera token JWT
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil }, 
      'segredo', 
      { expiresIn: '2h' }
    );
    res.json({ token, perfil: usuario.perfil });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Preenchimento de documento de qualidade
app.post('/api/documentos', autenticarToken, async (req, res) => {
  try {
    const { produto, campos, finalizado } = req.body;
    const usuarioId = req.usuario.id;
    const data = new Date();
    await pool.execute(
      'INSERT INTO documentos (usuario_id, produto, campos, data_preenchimento, finalizado) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, produto, JSON.stringify(campos), data, finalizado]
    );
    res.status(201).json({ mensagem: 'Documento salvo.' });
  } catch (error) {
    console.error('Erro ao salvar documento:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Listagem de documentos (funcionário vê só os seus, admin vê todos)
app.get('/api/documentos', autenticarToken, async (req, res) => {
  try {
    let documentos;
    if (req.usuario.perfil === 'admin') {
      const [resultado] = await pool.execute('SELECT * FROM documentos');
      documentos = resultado;
    } else {
      const [resultado] = await pool.execute(
        'SELECT * FROM documentos WHERE usuario_id = ?', 
        [req.usuario.id]
      );
      documentos = resultado;
    }
    res.json(documentos);
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Exportação para CSV (exemplo simples)
app.get('/api/exportar', autenticarToken, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'admin') {
      return res.sendStatus(403);
    }
    const [documentos] = await pool.execute('SELECT * FROM documentos');
    res.json(documentos); // Exemplo: exportação em JSON
  } catch (error) {
    console.error('Erro na exportação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({ mensagem: 'Sistema de Controle da Qualidade - Backend funcionando!' });
});

// Inicialização do servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});