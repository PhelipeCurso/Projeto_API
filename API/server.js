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

const arquivosPorCompeticao = {
  'brasileirao': 'brasileirao2025.json',
  'libertadores': 'libertadores2025.json',
  'copa do brasil': 'copadobrasil2025.json',
  'super mundial': 'supermundial2025.json'
};

// 🔥 Listar jogos
app.get('/jogos', (req, res) => {
  const { competicao } = req.query;
  const nomeArquivo = arquivosPorCompeticao[competicao?.toLowerCase()];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ erro: 'Erro ao ler os dados' });

    const jogos = JSON.parse(data);
    res.json(jogos);
  });
});

// ➕ Adicionar jogo
app.post('/jogos', [
  body('data').notEmpty(),
  body('hora').notEmpty(),
  body('local').notEmpty(),
  body('time_casa').notEmpty(),
  body('time_fora').notEmpty(),
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
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    const jogos = err ? [] : JSON.parse(data || '[]');
    novoJogo.id = jogos.length > 0 ? jogos[jogos.length - 1].id + 1 : 1;
    jogos.push(novoJogo);

    fs.writeFile(caminho, JSON.stringify(jogos, null, 2), err => {
      if (err) return res.status(500).json({ erro: 'Erro ao salvar o jogo' });
      res.status(201).json(novoJogo);
    });
  });
});

// ✍️ Atualizar jogo
app.patch('/jogos/:id', (req, res) => {
  const { id } = req.params;
  const { competicao } = req.query;
  const nomeArquivo = arquivosPorCompeticao[competicao?.toLowerCase()];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ erro: 'Erro ao ler os dados' });

    const jogos = JSON.parse(data);
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
  const nomeArquivo = arquivosPorCompeticao[competicao?.toLowerCase()];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ erro: 'Erro ao ler os dados' });

    const jogos = JSON.parse(data).filter(j => j.concluido);
    const tabela = {};

    jogos.forEach(jogo => {
      const { time_casa, time_fora, gols_time_casa, gols_time_fora } = jogo;

      [time_casa, time_fora].forEach(time => {
        if (!tabela[time]) {
          tabela[time] = {
            time,
            pontos: 0,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            golsPro: 0,
            golsContra: 0,
            saldoGols: 0,
            escudo: gerarUrlEscudo(time)
          };
        }
      });

      // Time Casa
      tabela[time_casa].jogos += 1;
      tabela[time_casa].golsPro += gols_time_casa;
      tabela[time_casa].golsContra += gols_time_fora;
      tabela[time_casa].saldoGols = tabela[time_casa].golsPro - tabela[time_casa].golsContra;

      // Time Fora
      tabela[time_fora].jogos += 1;
      tabela[time_fora].golsPro += gols_time_fora;
      tabela[time_fora].golsContra += gols_time_casa;
      tabela[time_fora].saldoGols = tabela[time_fora].golsPro - tabela[time_fora].golsContra;

      if (gols_time_casa > gols_time_fora) {
        tabela[time_casa].vitorias += 1;
        tabela[time_casa].pontos += 3;
        tabela[time_fora].derrotas += 1;
      } else if (gols_time_casa < gols_time_fora) {
        tabela[time_fora].vitorias += 1;
        tabela[time_fora].pontos += 3;
        tabela[time_casa].derrotas += 1;
      } else {
        tabela[time_casa].empates += 1;
        tabela[time_fora].empates += 1;
        tabela[time_casa].pontos += 1;
        tabela[time_fora].pontos += 1;
      }
    });

    const classificacao = Object.values(tabela).sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
      return b.golsPro - a.golsPro;
    }).map((item, index) => ({
      posicao: index + 1,
      ...item
    }));

    res.json(classificacao);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
