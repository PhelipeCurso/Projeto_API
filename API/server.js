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
  'super mundial': 'supermundial2025.json',
  'supermundial': 'supermundial2025.json'
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
     escudo_time_casa: gerarUrlEscudo(jogo.time_casa),
     escudo_time_fora: gerarUrlEscudo(jogo.time_fora)
    }));

    res.json(jogos);
  });
});

// 📝 Rota para adicionar novo jogo
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

  const novoJogo = {
  ...req.body,
  id: jogos.length > 0 ? jogos[jogos.length - 1].id + 1 : 1
};
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
    novoJogo.escudo_time = gerarUrlEscudo('fla');
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

// 🔥 Atualizar placar
app.patch('/jogos/:id', (req, res) => {
  const { id } = req.params;
  const { competicao } = req.query;

  const nomeArquivo = arquivosPorCompeticao[competicao.toLowerCase()];
  if (!nomeArquivo) {
    return res.status(400).json({ erro: 'Competição inválida' });
  }

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  fs.readFile(caminho, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao ler os dados' });
    }

    let jogos = JSON.parse(data);
    const index = jogos.findIndex(j => j.id == id);
    if (index === -1) {
      return res.status(404).json({ erro: 'Jogo não encontrado' });
    }

    jogos[index] = { ...jogos[index], ...req.body };

    fs.writeFile(caminho, JSON.stringify(jogos, null, 2), err => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao salvar' });
      }
      res.json(jogos[index]);
    });
  });
});

// 🏆 Rota para classificação do Brasileirão
app.get('/classificacao', (req, res) => {
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
      return res.status(500).json({ erro: 'Erro ao ler os dados dos jogos' });
    }

    const jogos = JSON.parse(data).filter(j => j.concluido);

    const tabela = {};

    jogos.forEach(jogo => {
      const { time_casa, time_fora, gols_time_casa, gols_time_fora } = jogo;

      // Inicializa os times na tabela se ainda não existirem
      [timeFla, timeAdv].forEach(time => {
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

     
// Atualiza time casa
tabela[time_casa].jogos += 1;
tabela[time_casa].golsPro += gols_time_casa;
tabela[time_casa].golsContra += gols_time_fora;

// Atualiza time fora
tabela[time_fora].jogos += 1;
tabela[time_fora].golsPro += gols_time_fora;
tabela[time_fora].golsContra += gols_time_casa;

// Vitórias, empates, derrotas
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

    // Organiza a classificação
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

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
