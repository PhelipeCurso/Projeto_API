require('dotenv').config(); // garante que variáveis do .env estejam disponíveis
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const db = require('./firebase/firebase'); // já configurado no seu firebase.js

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/escudos', express.static(path.join(__dirname, 'public', 'escudos')));


// 🔹 Página inicial → home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// ---------------------- helpers ----------------------
function gerarUrlEscudo(nomeTime) {
  if (!nomeTime) return null;
  const nome = nomeTime
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w]/g, '');
  
  // 🔹 Usa BASE_URL do .env (Render) ou localhost
  return `${process.env.BASE_URL || 'http://localhost:3000'}/escudos/${nome}.png`;
}

function normalizeCompeticao(s) {
  if (!s) return s;
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function gerarDocIdFromJogo(jogo) {
  // cria um id determinístico para evitar duplicatas repetidas migrações
  const base = `${jogo.competicao || ''}-${jogo.rodada || ''}-${jogo.time_casa || ''}-${jogo.time_fora || ''}-${jogo.data || ''}-${jogo.hora || ''}`;
  return base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

const arquivosPorCompeticao = {
  'brasileirao': 'brasileirao2025.json',
  'libertadores': 'libertadores2025.json',
  'copa do brasil': 'copadobrasil2025.json',
  'super mundial': 'supermundial2025.json',
  'supermundial': 'supermundial2025.json'
};

// ---------------------- rotas ----------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});
// GET /jogos?competicao=brasileirao
app.get('/jogos', async (req, res) => {
  const { competicao } = req.query;
  if (!competicao) return res.status(400).json({ erro: 'Informe a competição: ?competicao=brasileirao' });

  const compNorm = normalizeCompeticao(competicao);
  try {
    const snapshot = await db.collection('jogos')
      .where('competicao', '==', compNorm)
      .get();

    if (snapshot.empty) return res.json([]);

    const jogos = snapshot.docs.map(doc => {
      const jogo = doc.data();
      return {
        id: doc.id,
        ...jogo,
        escudo_time_casa: gerarUrlEscudo(jogo.time_casa),
        escudo_time_fora: gerarUrlEscudo(jogo.time_fora)
      };
    });

    res.json(jogos);
  } catch (error) {
    console.error('GET /jogos erro:', error);
    res.status(500).json({ erro: 'Erro ao carregar os jogos do Firestore' });
  }
});

// POST /jogos  (adiciona novo jogo na coleção 'jogos')
app.post('/jogos', [
  body('data').notEmpty(),
  body('hora').notEmpty(),
  body('local').notEmpty(),
  body('rodada').isInt(),
  body('time_casa').notEmpty(),
  body('time_fora').notEmpty(),
  body('competicao').notEmpty(),
  body('concluido').not().isEmpty(), // aceitaremos true/false ou "true"/"false"
  body('gols_time_casa').not().isEmpty(),
  body('gols_time_fora').not().isEmpty(),
  body('etapa').notEmpty()
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

  try {
    const bodyIn = req.body;

    // normalizações / conversões simples
    const novoJogo = { ...bodyIn };
    novoJogo.competicao = normalizeCompeticao(novoJogo.competicao);
    novoJogo.concluido = (novoJogo.concluido === true || novoJogo.concluido === 'true');
    novoJogo.gols_time_casa = parseInt(novoJogo.gols_time_casa, 10) || 0;
    novoJogo.gols_time_fora = parseInt(novoJogo.gols_time_fora, 10) || 0;

    novoJogo.escudo_time_casa = gerarUrlEscudo(novoJogo.time_casa);
    novoJogo.escudo_time_fora = gerarUrlEscudo(novoJogo.time_fora);
    novoJogo.createdAt = Date.now();

    const docRef = await db.collection('jogos').add(novoJogo);
    res.status(201).json({ id: docRef.id, ...novoJogo });
  } catch (error) {
    console.error('POST /jogos erro:', error);
    res.status(500).json({ erro: 'Erro ao salvar o novo jogo no Firestore' });
  }
});

// PATCH /jogos/:id  (atualiza documento no Firestore)
app.patch('/jogos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = db.collection('jogos').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ erro: 'Jogo não encontrado' });

    const updates = { ...req.body };

    // conversões se vierem como string
    if (updates.concluido !== undefined) updates.concluido = (updates.concluido === true || updates.concluido === 'true');
    if (updates.gols_time_casa !== undefined) updates.gols_time_casa = parseInt(updates.gols_time_casa, 10) || 0;
    if (updates.gols_time_fora !== undefined) updates.gols_time_fora = parseInt(updates.gols_time_fora, 10) || 0;
    if (updates.competicao) updates.competicao = normalizeCompeticao(updates.competicao);

    // se trocar o nome do time, atualiza o escudo correspondente
    if (updates.time_casa) updates.escudo_time_casa = gerarUrlEscudo(updates.time_casa);
    if (updates.time_fora) updates.escudo_time_fora = gerarUrlEscudo(updates.time_fora);

    updates.updatedAt = Date.now();

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('PATCH /jogos/:id erro:', error);
    res.status(500).json({ erro: 'Erro ao atualizar o jogo no Firestore' });
  }
});

// DELETE /jogos/:id  (remove jogo, use com cuidado)
app.delete('/jogos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('jogos').doc(id).delete();
    res.json({ sucesso: true, id });
  } catch (error) {
    console.error('DELETE /jogos/:id erro:', error);
    res.status(500).json({ erro: 'Erro ao deletar o jogo' });
  }
});

// GET /classificacao?competicao=brasileirao
app.get('/classificacao', async (req, res) => {
  const { competicao } = req.query;
  if (!competicao) return res.status(400).json({ erro: 'Informe a competição' });

  const compNorm = normalizeCompeticao(competicao);
  try {
    const snapshot = await db.collection('jogos')
      .where('competicao', '==', compNorm)
      .where('concluido', '==', true)
      .get();

    if (snapshot.empty) return res.json([]);

    const tabela = {};
    const historico = {};

    snapshot.docs.forEach(doc => {
      const jogo = doc.data();
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
        tabela[time_casa].pontos++;
        tabela[time_fora].pontos++;
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
      .map((time, index) => ({ ...time, posicao: index + 1 }));

    res.json(classificacao);
  } catch (error) {
    console.error('GET /classificacao erro:', error);
    res.status(500).json({ erro: 'Erro ao gerar a classificação' });
  }
});

// ---------------------- migração segura de JSON -> Firestore ----------------------
// Proteção: para executar, envie cabeçalho X-MIGRATE-KEY igual à variável de ambiente MIGRATE_KEY
app.post('/migrate', async (req, res) => {
  const { competicao } = req.query;
  if (!competicao) return res.status(400).json({ erro: 'Informe ?competicao=brasileirao' });

  const migrateKeyHeader = req.header('x-migrate-key') || req.header('X-MIGRATE-KEY');
  if (!process.env.MIGRATE_KEY) {
    return res.status(500).json({ erro: 'MIGRATE_KEY não configurada no servidor (.env)' });
  }
  if (!migrateKeyHeader || migrateKeyHeader !== process.env.MIGRATE_KEY) {
    return res.status(403).json({ erro: 'Chave de migração inválida' });
  }

  const compNorm = normalizeCompeticao(competicao);
  const nomeArquivo = arquivosPorCompeticao[compNorm];
  if (!nomeArquivo) return res.status(400).json({ erro: 'Competição inválida ou arquivo não encontrado' });

  const caminho = path.join(__dirname, 'dados', nomeArquivo);
  try {
    const raw = fs.readFileSync(caminho, 'utf8');
    const jogos = JSON.parse(raw);

    let count = 0;
    for (const jogo of jogos) {
      // sanitiza/normaliza campos importantes
      jogo.competicao = compNorm;
      jogo.concluido = (jogo.concluido === true || jogo.concluido === 'true');
      jogo.gols_time_casa = parseInt(jogo.gols_time_casa, 10) || 0;
      jogo.gols_time_fora = parseInt(jogo.gols_time_fora, 10) || 0;
      jogo.escudo_time_casa = gerarUrlEscudo(jogo.time_casa);
      jogo.escudo_time_fora = gerarUrlEscudo(jogo.time_fora);
      jogo.createdAt = jogo.createdAt || Date.now();

      const docId = jogo.id ? String(jogo.id) : gerarDocIdFromJogo(jogo);
      await db.collection('jogos').doc(docId).set(jogo, { merge: true });
      count++;
    }

    res.json({ sucesso: true, migrados: count });
  } catch (error) {
    console.error('POST /migrate erro:', error);
    res.status(500).json({ erro: 'Erro na migração. Confira o arquivo local e permissões.' });
  }
});

// ---------------------- start ----------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
