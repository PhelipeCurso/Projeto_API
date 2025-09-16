const API_URL = 'https://projeto-api-i4rz.onrender.com/jogos';


function carregarJogos() {
  const filtro = document.getElementById('filtroCompeticao').value;
  const url = filtro ? `${API_URL}?competicao=${encodeURIComponent(filtro)}` : API_URL;

  fetch(url)
    .then(res => res.json())
    .then(jogos => {
      const tbody = document.querySelector('#tabelaJogos');
      tbody.innerHTML = '';

      if (!Array.isArray(jogos)) {
        console.error('Erro: A resposta da API não é uma lista de jogos!');
        return;
      }

      jogos.forEach(jogo => {
        const placar = jogo.concluido
          ? `<strong>${jogo.gols_time_casa} x ${jogo.gols_time_fora}</strong>`
          : 'A disputar';

        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${jogo.id}</td>
          <td>${jogo.data}</td>
          <td>${jogo.hora}</td>
          <td>${jogo.local}</td>
          <td>${jogo.rodada ?? '-'}</td>
          <td>${jogo.time_casa}</td>
          <td>${jogo.time_fora}</td>
          <td>${jogo.competicao}</td>
          <td>${placar}</td>
          <td>${jogo.etapa ?? '-'}</td>
          <td class="d-flex gap-2 justify-content-center">
            <button class="btn btn-sm btn-warning" onclick="editarPlacar(${jogo.id}, '${jogo.competicao}')">Editar</button>
          </td>
        `;
        tbody.appendChild(linha);
      });
    })
    .catch(err => console.error('Erro ao carregar os jogos:', err));
}

function carregarClassificacao() {
  const url = 'https://projeto-api-i4rz.onrender.com/classificacao?competicao=brasileirao';


  fetch(url)
    .then(res => res.json())
    .then(classificacao => {
      const tbody = document.getElementById('tabelaClassificacao');
      tbody.innerHTML = '';

      classificacao.forEach(time => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td class="text-center">${time.posicao}</td>
          <td><img src="${time.escudo}" alt="${time.time}" width="25" class="me-2">${time.time}</td>
          <td class="text-center">${time.pontos}</td>
          <td class="text-center">${time.jogos}</td>
          <td class="text-center">${time.vitorias}</td>
          <td class="text-center">${time.empates}</td>
          <td class="text-center">${time.derrotas}</td>
          <td class="text-center">${time.golsPro}</td>
          <td class="text-center">${time.golsContra}</td>
          <td class="text-center">${time.saldoGols}</td>
        `;
        tbody.appendChild(linha);
      });
    })
    .catch(err => {
      console.error('Erro ao carregar a classificação:', err);
    });
}

// Carregar os jogos e a classificação ao abrir a página
carregarJogos();
carregarClassificacao();

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
      document.getElementById('inputData').value = jogo.data ?? '';
      document.getElementById('inputHora').value = jogo.hora ?? '';
      document.getElementById('inputLocal').value = jogo.local ?? '';
      document.getElementById('inputRodada').value = jogo.rodada ?? '';
      document.getElementById('inputTimeCasa').value = jogo.time_casa ?? '';
      document.getElementById('inputTimeFora').value = jogo.time_fora ?? '';
      document.getElementById('inputGolsFla').value = jogo.gols_time_casa ?? '';
      document.getElementById('inputGolsAdv').value = jogo.gols_time_fora ?? '';
      document.getElementById('inputEtapa').value = jogo.etapa ?? '';
      document.getElementById('inputConcluido').checked = jogo.concluido ?? false;


      const modal = new bootstrap.Modal(document.getElementById('modalEditarPlacar'));
      modal.show();
    });
}

// 💾 Função para salvar o placar
function salvarPlacar() {
  const id = document.getElementById('inputIdJogo').value;
  const competicao = document.getElementById('inputCompeticao').value;

  const dados = {
    data: document.getElementById('inputData').value,
    hora: document.getElementById('inputHora').value,
    local: document.getElementById('inputLocal').value,
    rodada: parseInt(document.getElementById('inputRodada').value),
    time_casa: document.getElementById('inputTimeCasa').value,
    time_fora: document.getElementById('inputTimeFora').value,
    gols_time_casa: parseInt(document.getElementById('inputGolsFla').value),
    gols_time_fora: parseInt(document.getElementById('inputGolsAdv').value),
    etapa: document.getElementById('inputEtapa').value,
    concluido: document.getElementById('inputConcluido').checked
  };

  fetch(`${API_URL}/${id}?competicao=${encodeURIComponent(competicao)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(res => res.json())
    .then(() => {
      alert('Jogo atualizado com sucesso!');
      const modalElement = document.getElementById('modalEditarPlacar');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
      carregarJogos();
    })
    .catch(err => {
      console.error('Erro ao atualizar o jogo:', err);
      alert('Erro ao salvar as alterações.');
    });
}




// ➕ Submissão do novo jogo
document.getElementById('formNovoJogo').addEventListener('submit', e => {
  e.preventDefault();

  const novoJogo = {
    data: document.getElementById('data').value,
    hora: document.getElementById('hora').value,
    local: document.getElementById('local').value,
    rodada: parseInt(document.getElementById('rodada').value),
    time_casa: document.getElementById('mandante').value,
    time_fora: document.getElementById('visitante').value,
    gols_time_casa: parseInt(document.getElementById('golsMandante').value) || 0,
    gols_time_fora: parseInt(document.getElementById('golsVisitante').value) || 0,
    concluido: document.getElementById('concluido').checked,
    competicao: document.getElementById('competicao').value,
    etapa: "fase de grupos"
  };

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoJogo)
  })
    .then(res => res.json())
    .then(() => {
      alert('Jogo adicionado com sucesso!');
      carregarJogos();
      e.target.reset();
    })
    .catch(err => {
      console.error('Erro ao salvar o novo jogo:', err);
      alert('Erro ao salvar o jogo.');
    });
});
