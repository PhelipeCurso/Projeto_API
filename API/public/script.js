
// script.js (versão robusta)
const API_URL = 'https://projeto-api-i4rz.onrender.com/jogos';

//
// CARREGAR JOGOS (só se existir #tabelaJogos na página)
//
function carregarJogos() {
  const tbody = document.querySelector('#tabelaJogos');
  if (!tbody) return; // página não tem tabela de jogos -> sai

  const filtroEl = document.getElementById('filtroCompeticao');
  const filtro = filtroEl ? filtroEl.value : '';
  const url = filtro ? `${API_URL}?competicao=${encodeURIComponent(filtro)}` : API_URL;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(jogos => {
      tbody.innerHTML = '';
      if (!Array.isArray(jogos) || jogos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11">Nenhum jogo encontrado.</td></tr>`;
        return;
      }

      jogos.forEach(jogo => {
        const linha = document.createElement('tr');

        linha.innerHTML = `
          <td>${jogo.id ?? '-'}</td>
          <td>${jogo.data ?? '-'}</td>
          <td>${jogo.hora ?? '-'}</td>
          <td>${jogo.local ?? '-'}</td>
          <td>${jogo.rodada ?? '-'}</td>
          <td>${jogo.time_casa ?? '-'}</td>
          <td>${jogo.time_fora ?? '-'}</td>
          <td>${jogo.competicao ?? '-'}</td>
          <td>${jogo.concluido ? `<strong>${jogo.gols_time_casa ?? 0} x ${jogo.gols_time_fora ?? 0}</strong>` : 'A disputar'}</td>
          <td>${jogo.etapa ?? '-'}</td>
        `;

        // actions cell
        const actionsTd = document.createElement('td');
        actionsTd.className = 'd-flex gap-2 justify-content-center';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-sm btn-warning';
        btnEdit.type = 'button';
        btnEdit.textContent = 'Editar';
        btnEdit.addEventListener('click', () => editarPlacar(jogo.id, jogo.competicao));

        actionsTd.appendChild(btnEdit);
        linha.appendChild(actionsTd);

        tbody.appendChild(linha);
      });
    })
    .catch(err => {
      console.error('Erro ao carregar os jogos:', err);
      tbody.innerHTML = `<tr><td colspan="11">Erro ao carregar os jogos.</td></tr>`;
    });
}

//
// CARREGAR CLASSIFICAÇÃO (só se existir #tabelaClassificacao na página)
//
function carregarClassificacao() {
  const tbody = document.getElementById('tabelaClassificacao');
  if (!tbody) return; // página não tem tabela de classificação -> sai

  const url = 'https://projeto-api-i4rz.onrender.com/classificacao?competicao=brasileirao';

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const classificacao = data.classificacao || data;
      tbody.innerHTML = '';

      if (!Array.isArray(classificacao) || classificacao.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11">Nenhuma classificação disponível.</td></tr>`;
        return;
      }

      classificacao.forEach((time, index) => {
        const linha = document.createElement('tr');

        if (index < 4) {
          linha.classList.add('table-success'); // G4
        } else if (index >= 4 && index < 12) {
          linha.classList.add('table-warning'); // Sul-Americana
        } else if (index >= classificacao.length - 4) {
          linha.classList.add('table-danger'); // Z4
        }

        const nomeTime = time.time ?? time.nome ?? '---';
        const escudoHtml = time.escudo ? `<img src="${time.escudo}" alt="Escudo" width="25" class="me-2">` : '';

        linha.innerHTML = `
          <td>${time.posicao ?? index + 1}</td>
          <td class="text-start">${escudoHtml}${nomeTime}</td>
          <td>${time.pontos ?? 0}</td>
          <td>${time.jogos ?? 0}</td>
          <td>${time.vitorias ?? 0}</td>
          <td>${time.empates ?? 0}</td>
          <td>${time.derrotas ?? 0}</td>
          <td>${time.golsPro ?? 0}</td>
          <td>${time.golsContra ?? 0}</td>
          <td>${time.saldoGols ?? 0}</td>
          <td>
            ${Array.isArray(time.ultimos5) ? time.ultimos5.map(r => {
              const cor = r === 'v' ? 'bg-success' : r === 'd' ? 'bg-danger' : 'bg-secondary';
              return `<span class="d-inline-block rounded-circle ${cor}" style="width: 12px; height: 12px; margin: 0 2px;"></span>`;
            }).join('') : ''}
          </td>
        `;

        tbody.appendChild(linha);
      });
    })
    .catch(err => {
      console.error('Erro ao carregar a classificação:', err);
      tbody.innerHTML = `<tr><td colspan="11">Erro ao carregar a classificação.</td></tr>`;
    });
}

//
// EDITAR / SALVAR
//
function editarPlacar(id, competicao) {
  if (!document.getElementById('modalEditarPlacar')) {
    alert('Edição disponível apenas na página de Jogos.');
    return;
  }

  const filtro = competicao || (document.getElementById('filtroCompeticao') ? document.getElementById('filtroCompeticao').value : '');
  fetch(`${API_URL}?competicao=${encodeURIComponent(filtro)}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(jogos => {
      const jogo = Array.isArray(jogos) ? jogos.find(j => j.id === id) : null;
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
    })
    .catch(err => {
      console.error('Erro ao buscar jogos para editar:', err);
      alert('Erro ao buscar dados do jogo.');
    });
}

function salvarPlacar() {
  const idEl = document.getElementById('inputIdJogo');
  if (!idEl) {
    alert('Formulário de edição não encontrado.');
    return;
  }
  const id = idEl.value;
  const competicao = document.getElementById('inputCompeticao').value;

  const dados = {
    data: document.getElementById('inputData').value,
    hora: document.getElementById('inputHora').value,
    local: document.getElementById('inputLocal').value,
    rodada: parseInt(document.getElementById('inputRodada').value) || null,
    time_casa: document.getElementById('inputTimeCasa').value,
    time_fora: document.getElementById('inputTimeFora').value,
    gols_time_casa: parseInt(document.getElementById('inputGolsFla').value) || 0,
    gols_time_fora: parseInt(document.getElementById('inputGolsAdv').value) || 0,
    etapa: document.getElementById('inputEtapa').value,
    concluido: document.getElementById('inputConcluido').checked
  };

  fetch(`${API_URL}/${id}?competicao=${encodeURIComponent(competicao)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(() => {
      alert('Jogo atualizado com sucesso!');
      const modalElement = document.getElementById('modalEditarPlacar');
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
      carregarJogos();
    })
    .catch(err => {
      console.error('Erro ao atualizar o jogo:', err);
      alert('Erro ao salvar as alterações.');
    });
}

//
// FORM NOVO JOGO
//
const formNovo = document.getElementById('formNovoJogo');
if (formNovo) {
  formNovo.addEventListener('submit', e => {
    e.preventDefault();

    const novoJogo = {
      data: document.getElementById('data').value,
      hora: document.getElementById('hora').value,
      local: document.getElementById('local').value,
      rodada: parseInt(document.getElementById('rodada').value) || null,
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
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
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
}

// Executar carregamentos (as funções já retornam se não houver tabela na página)
carregarJogos();
carregarClassificacao();
