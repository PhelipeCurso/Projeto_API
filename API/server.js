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

// 🔧 Gera URL do escudo com base no nome do time
function gerarUrlEscudo(nomeTime) {
  if (!nomeTime) return null;
  const nome = nomeTime
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w]/g, '');

  return `https://projetoapi-production-a6f9.up.railway.app/escudos/${nome}.png`;
}

// 🗂 Mapeia competições para arquivos
const arquivosPorCompeticao = {
  'brasileirao': 'brasileirao2025.json',
  'libertadores': 'libertadores2025.json',
  'copa do brasil': 'copadobrasil2025.json',
  'super mundial': 'supermundial2025.json',
  'supermundial': 'supermundial2025.json'
};

// 📦 Rota para listar jogos
app.get('/jogos', (req, res) => {
  const { competicao } = req.query;
  if (!competicao) return res.status(400).json({ erro: 'Informe a competição como parâmetro: ?competicao=brasileirao' });

  const nomeArquivo = arquivosPorCompeticao[
    competicao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  ];

  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ erro: 'Erro ao carregar os jogos' });

    let jogos = JSON.parse(data);
    jogos = jogos.map(jogo => ({
      ...jogo,
      escudo_time_casa: gerarUrlEscudo(jogo.time_casa),
      escudo_time_fora: gerarUrlEscudo(jogo.time_fora)
    }));

    res.json(jogos);
  });
});

// ➕ Adicionar novo jogo
app.post('/jogos', [
  body('data').notEmpty(),
  body('hora').notEmpty(),
  body('local').notEmpty(),
  body('rodada').isInt(),
  body('time_casa').notEmpty(),
  body('time_fora').notEmpty(),
  body('competicao').notEmpty(),
  body('concluido').isBoolean(),
  body('gols_time_casa').isInt(),
  body('gols_time_fora').isInt(),
  body('etapa').notEmpty()
], (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

  const novoJogo = req.body;
  const nomeArquivo = arquivosPorCompeticao[novoJogo.competicao.toLowerCase()];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    let jogos = [];
    if (!err && data) {
      try {
        jogos = JSON.parse(data);
      } catch {
        return res.status(500).json({ erro: 'Erro ao processar o arquivo de jogos' });
      }
    }

    novoJogo.id = jogos.length > 0 ? jogos[jogos.length - 1].id + 1 : 1;
    novoJogo.escudo_time_casa = gerarUrlEscudo(novoJogo.time_casa);
    novoJogo.escudo_time_fora = gerarUrlEscudo(novoJogo.time_fora);

    jogos.push(novoJogo);
    fs.writeFile(caminho, JSON.stringify(jogos, null, 2), err => {
      if (err) return res.status(500).json({ erro: 'Erro ao salvar o novo jogo' });
      res.status(201).json(novoJogo);
    });
  });
});

// ✏️ Atualizar jogo
app.patch('/jogos/:id', (req, res) => {
  const { id } = req.params;
  const { competicao } = req.query;

  const nomeArquivo = arquivosPorCompeticao[
    competicao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  ];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ erro: 'Erro ao ler os dados' });

    let jogos = JSON.parse(data);
    const index = jogos.findIndex(j => j.id == id);
    if (index === -1) return res.status(404).json({ erro: 'Jogo não encontrado' });

    jogos[index] = { ...jogos[index], ...req.body };
    fs.writeFile(caminho, JSON.stringify(jogos, null, 2), err => {
      if (err) return res.status(500).json({ erro: 'Erro ao salvar' });
      res.json(jogos[index]);
    });
  });
});

// 🏆 Classificação
app.get('/classificacao', (req, res) => {
  const { competicao } = req.query;
  if (!competicao) return res.status(400).json({ erro: 'Informe a competição como parâmetro: ?competicao=brasileirao' });

  const nomeArquivo = arquivosPorCompeticao[
    competicao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  ];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ erro: 'Erro ao ler os dados dos jogos' });

    const jogos = JSON.parse(data).filter(j => j.concluido);
    const tabela = {};
    const historico = {};

    jogos.forEach(jogo => {
      const { time_casa, time_fora, gols_time_casa, gols_time_fora } = jogo;

      [time_casa, time_fora].forEach(time => {
        if (!tabela[time]) {
          tabela[time] = {
            time,
            escudo: gerarUrlEscudo(time),
            pontos: 0,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            golsPro: 0,
            golsContra: 0,
            saldoGols: 0
          };
        }
      });

      tabela[time_casa].jogos++;
      tabela[time_fora].jogos++;
      tabela[time_casa].golsPro += gols_time_casa;
      tabela[time_casa].golsContra += gols_time_fora;
      tabela[time_fora].golsPro += gols_time_fora;
      tabela[time_fora].golsContra += gols_time_casa;

      if (gols_time_casa > gols_time_fora) {
        tabela[time_casa].vitorias++;
        tabela[time_casa].pontos += 3;
        tabela[time_fora].derrotas++;
      } else if (gols_time_fora > gols_time_casa) {
        tabela[time_fora].vitorias++;
        tabela[time_fora].pontos += 3;
        tabela[time_casa].derrotas++;
      } else {
        tabela[time_casa].empates++;
        tabela[time_fora].empates++;
        tabela[time_casa].pontos += 1;
        tabela[time_fora].pontos += 1;
      }

      if (!historico[time_casa]) historico[time_casa] = [];
      if (!historico[time_fora]) historico[time_fora] = [];

      if (gols_time_casa > gols_time_fora) {
        historico[time_casa].push('v');
        historico[time_fora].push('d');
      } else if (gols_time_fora > gols_time_casa) {
        historico[time_fora].push('v');
        historico[time_casa].push('d');
      } else {
        historico[time_casa].push('e');
        historico[time_fora].push('e');
      }
    });

    const classificacao = Object.values(tabela)
      .map(time => ({
        ...time,
        saldoGols: time.golsPro - time.golsContra,
        ultimos5: (historico[time.time] || []).slice(-5)
      }))
      .sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
        return b.golsPro - a.golsPro;
      })
      .map((time, index) => ({
        ...time,
        posicao: index + 1
      }));

    res.json(classificacao);
  });
});

// 🚀 Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
