const API_URL = 'https://projetoapi-production-a6f9.up.railway.app/jogos';

function carregarJogos() {
  const filtro = document.getElementById('filtroCompeticao').value;
  const url = filtro ? `${API_URL}?competicao=${encodeURIComponent(filtro)}` : API_URL;

  fetch(url)
    .then(res => res.json())
    .then(jogos => {
      console.log('Resposta da API:', jogos); 
      const tbody = document.querySelector('#tabelaJogos');
      tbody.innerHTML = '';

      if (!Array.isArray(jogos)) {
        console.error('Erro: A resposta da API não é uma lista de jogos!');
        return;
      }

      jogos.forEach(jogo => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${jogo.id}</td>
          <td>${jogo.data}</td>
          <td>${jogo.hora}</td>
          <td>${jogo.local}</td>
          <td>${jogo.adversario}</td>
          <td>${jogo.competicao}</td>
          <td>${jogo.concluido ? `<strong>${jogo.gols_flamengo} x ${jogo.gols_adversario}</strong>` : 'A disputar'}</td>
          <td>${jogo.etapa}</td>
          <td class="d-flex gap-2 justify-content-center">
            <button class="btn btn-sm btn-warning" onclick="editarPlacar(${jogo.id}, '${jogo.competicao}')">Editar</button>
          </td>
        `;
        tbody.appendChild(linha);
      });
    });
}

// 🔥 Função para abrir o modal e preencher dados
function editarPlacar(id, competicao) {
  const filtro = competicao || document.getElementById('filtroCompeticao').value;
  if (!filtro) {
    alert('Selecione uma competição antes de editar o placar.');
    return;
  }

  fetch(`${API_URL}?competicao=${encodeURIComponent(filtro)}`)
    .then(res => res.json())
    .then(jogos => {
      const jogo = jogos.find(j => j.id === id);
      if (!jogo) {
        alert('Jogo não encontrado.');
        return;
      }

      document.getElementById('inputIdJogo').value = id;
      document.getElementById('inputCompeticao').value = filtro;
      document.getElementById('inputGolsFla').value = jogo.gols_flamengo ?? '';
      document.getElementById('inputGolsAdv').value = jogo.gols_adversario ?? '';

      const modal = new bootstrap.Modal(document.getElementById('modalEditarPlacar'));
      modal.show();
    });
}

// 💾 Função para salvar o placar
function salvarPlacar() {
  const id = document.getElementById('inputIdJogo').value;
  const competicao = document.getElementById('inputCompeticao').value;
  const golsFla = parseInt(document.getElementById('inputGolsFla').value);
  const golsAdv = parseInt(document.getElementById('inputGolsAdv').value);

  if (isNaN(golsFla) || isNaN(golsAdv)) {
    alert('Por favor, insira valores válidos para os gols.');
    return;
  }

  const dados = {
    gols_flamengo: golsFla,
    gols_adversario: golsAdv,
    concluido: true
  };

  fetch(`${API_URL}/${id}?competicao=${encodeURIComponent(competicao)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(res => res.json())
    .then(() => {
      alert('Placar atualizado!');
      const modalElement = document.getElementById('modalEditarPlacar');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
      carregarJogos();
    });
}

document.getElementById('formNovoJogo').addEventListener('submit', e => {
  e.preventDefault();

  const novoJogo = {
    data: document.getElementById('data').value,
    hora: document.getElementById('hora').value,
    local: document.getElementById('local').value,
    adversario: document.getElementById('adversario').value,
    competicao: document.getElementById('competicao').value,
    concluido: false,
    gols_flamengo: null,
    gols_adversario: null,
    etapa: "fase de grupos"
  };

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoJogo)
  })
    .then(res => res.json())
    .then(() => {
      alert('Jogo adicionado!');
      carregarJogos();
      e.target.reset();
    });
});

carregarJogos();
