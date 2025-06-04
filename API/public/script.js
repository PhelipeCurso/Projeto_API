const API_URL = 'http://localhost:3000/jogos';

function carregarJogos() {
  const filtro = document.getElementById('filtroCompeticao').value;
  if (!filtro) return;
  const url = filtro ? `${API_URL}?competicao=${encodeURIComponent(filtro)}` : API_URL;

  fetch(url)
    .then(res => res.json())
    .then(jogos => {
      console.log('Resposta da API:', jogos); 
      const tbody = document.querySelector('#tabelaJogos tbody');
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
          <td>${jogo.etapa}</td>
          <td>${jogo.concluido ? `${jogo.gols_flamengo} x ${jogo.gols_adversario}` : 'A disputar'}</td>
        `;
        tbody.appendChild(linha);
      });
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
    gols_adversario: null
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
