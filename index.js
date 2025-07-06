const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Dados em memória para teste (substituir por MySQL depois)
const usuarios = [
  {
    id: 1,
    nome: 'Administrador',
    cpf: '00000000000',
    email: 'admin@steck.com.br',
    funcao: 'Administrador',
    senha: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
    perfil: 'admin'
  },
  {
    id: 2,
    nome: 'Usuário Teste',
    cpf: '11111111111',
    email: 'teste@steck.com.br',
    funcao: 'Operador',
    senha: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // teste123
    perfil: 'funcionario'
  }
];

const documentos = [];

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

// Login de usuário
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Buscar usuário
    const usuario = usuarios.find(u => u.email === email);
    if (!usuario) {
      return res.status(400).json({ erro: 'Usuário não encontrado.' });
    }
    
    // Verificar senha (usando senhas fixas para teste)
    const senhaCorreta = (email === 'admin@steck.com.br' && senha === 'admin123') ||
                        (email === 'teste@steck.com.br' && senha === 'teste123');
    
    if (!senhaCorreta) {
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

// Cadastro de funcionário (agora restrito para admin)
app.post('/api/funcionarios', autenticarToken, async (req, res) => {
  try {
    // Só admin pode cadastrar
    if (req.usuario.perfil !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem cadastrar novos usuários.' });
    }
    const { nome, cpf, email, funcao, senha, perfil } = req.body;
    
    // Verifica duplicidade
    const existe = usuarios.find(u => u.email === email || u.cpf === cpf);
    if (existe) {
      return res.status(400).json({ erro: 'E-mail ou CPF já cadastrado.' });
    }
    
    const novoUsuario = {
      id: usuarios.length + 1,
      nome,
      cpf,
      email,
      funcao,
      senha: await bcrypt.hash(senha, 10),
      perfil: perfil === 'admin' ? 'admin' : 'funcionario'
    };
    
    usuarios.push(novoUsuario);
    res.status(201).json({ mensagem: 'Funcionário cadastrado com sucesso.' });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Preenchimento de documento de qualidade
app.post('/api/documentos', autenticarToken, async (req, res) => {
  try {
    const { produto, campos, finalizado } = req.body;
    const usuarioId = req.usuario.id;
    const data = new Date();
    
    const novoDocumento = {
      id: documentos.length + 1,
      usuario_id: usuarioId,
      produto,
      campos: JSON.stringify(campos),
      data_preenchimento: data,
      finalizado
    };
    
    documentos.push(novoDocumento);
    res.status(201).json({ mensagem: 'Documento salvo.' });
  } catch (error) {
    console.error('Erro ao salvar documento:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Listagem de documentos (funcionário vê só os seus, admin vê todos)
app.get('/api/documentos', autenticarToken, async (req, res) => {
  try {
    let documentosFiltrados;
    if (req.usuario.perfil === 'admin') {
      documentosFiltrados = documentos;
    } else {
      documentosFiltrados = documentos.filter(d => d.usuario_id === req.usuario.id);
    }
    res.json(documentosFiltrados);
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

// Rota para verificar usuários disponíveis (apenas para teste)
app.get('/api/usuarios-teste', (req, res) => {
  res.json({
    usuarios: usuarios.map(u => ({ email: u.email, perfil: u.perfil })),
    credenciais: {
      admin: { email: 'admin@steck.com.br', senha: 'admin123' },
      teste: { email: 'teste@steck.com.br', senha: 'teste123' }
    }
  });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log('\n👥 Usuários disponíveis para teste:');
  console.log('👨‍💼 Admin: admin@steck.com.br / admin123');
  console.log('👤 Teste: teste@steck.com.br / teste123');
});