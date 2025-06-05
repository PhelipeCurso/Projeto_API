const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/escudos', express.static(path.join(__dirname, 'public', 'escudos')));

// 🔧 Função para normalizar nomes de times (acentos, espaços etc)
function gerarUrlEscudo(nomeTime) {
  if (!nomeTime) return null;
  const nome = nomeTime
    .toLowerCase()
    .normalize('NFD') // remove acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '') // remove espaços
    .replace(/[^\w]/g, ''); // remove caracteres especiais

  return `https://projetoapi-production-a6f9.up.railway.app/escudos/${nome}.png`;
}

// 🗂 Mapeamento de nome da competição para arquivo correspondente
const arquivosPorCompeticao = {
  'brasileirao': 'brasileirao2025.json',
  'libertadores': 'libertadores2025.json',
  'copa do brasil': 'copadobrasil2025.json',
  'super mundial': 'supermundial2025.json'
};

// 📦 Rota para listar jogos
app.get('/jogos', (req, res) => {
  const { competicao } = req.query;

  if (!competicao) {
    return res.status(400).json({ erro: 'Informe a competição como parâmetro: ?competicao=brasileirao' });
  }

  const nomeArquivo = arquivosPorCompeticao[competicao.toLowerCase()];
  if (!nomeArquivo) {
    return res.status(400).json({ erro: 'Competição inválida' });
  }

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo:', err);
      return res.status(500).json({ erro: 'Erro ao carregar os jogos' });
    }

    let jogos = JSON.parse(data);

    // Adiciona os escudos dinamicamente
    jogos = jogos.map(jogo => ({
      ...jogo,
      escudo_time: gerarUrlEscudo('Flamengo'),
      escudo_adversario: gerarUrlEscudo(jogo.adversario)
    }));

    res.json(jogos);
  });
});

// 📝 Rota para adicionar novo jogo
app.post('/jogos', [
  body('data').notEmpty(),
  body('hora').notEmpty(),
  body('local').notEmpty(),
  body('adversario').notEmpty(),
  body('competicao').notEmpty(),
  body('concluido').isBoolean(),
  body('etapa').notEmpty()
], (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }

  const novoJogo = req.body;
  const nomeArquivo = arquivosPorCompeticao[novoJogo.competicao.toLowerCase()];

  if (!nomeArquivo) {
    return res.status(400).json({ erro: 'Competição inválida' });
  }

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    let jogos = [];

    if (!err && data) {
      try {
        jogos = JSON.parse(data);
      } catch (e) {
        return res.status(500).json({ erro: 'Erro ao processar o arquivo de jogos' });
      }
    }

    novoJogo.id = jogos.length > 0 ? jogos[jogos.length - 1].id + 1 : 1;

    // Adiciona dinamicamente as URLs dos escudos
    novoJogo.escudo_time = gerarUrlEscudo('Flamengo');
    novoJogo.escudo_adversario = gerarUrlEscudo(novoJogo.adversario);

    jogos.push(novoJogo);

    fs.writeFile(caminho, JSON.stringify(jogos, null, 2), err => {
      if (err) {
        console.error('Erro ao salvar o novo jogo:', err);
        return res.status(500).json({ erro: 'Erro ao salvar o novo jogo' });
      }

      res.status(201).json(novoJogo);
    });
  });
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
