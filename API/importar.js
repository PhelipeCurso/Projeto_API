const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// 🔑 credenciais do Firebase (serviceAccountKey.json)
admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json")
});

const db = admin.firestore();

// 📂 Pasta onde estão seus arquivos JSON
const pastaJson = "./dados_json";

async function importar() {
  try {
    // 🔎 Pega todos os arquivos .json da pasta
    const arquivos = fs.readdirSync(pastaJson).filter(f => f.endsWith(".json"));

    for (const arquivo of arquivos) {
      console.log(`📂 Importando arquivo: ${arquivo}`);
      
      // Carrega o conteúdo do arquivo
      const jogos = JSON.parse(fs.readFileSync(path.join(pastaJson, arquivo), "utf8"));

      for (const jogo of jogos) {
        try {
          // 🔥 Salva no Firestore
          await db.collection("jogos").doc(`${jogo.competicao.toLowerCase()}_${jogo.id}`).set({
            id: jogo.id,
            rodada: jogo.rodada,
            data: jogo.data,
            hora: jogo.hora,
            local: jogo.local,
            time_casa: jogo.time_casa,
            time_fora: jogo.time_fora,
            gols_time_casa: jogo.gols_time_casa,
            gols_time_fora: jogo.gols_time_fora,
            concluido: jogo.concluido,
            competicao: jogo.competicao.toLowerCase(), // garante padronização
            etapa: jogo.etapa,
            escudo_time: jogo.escudo_time,
            escudo_adversario: jogo.escudo_adversario
          });

          console.log(`✅ Importado: ${jogo.competicao} - Jogo ${jogo.id}`);
        } catch (error) {
          console.error("❌ Erro ao importar jogo", jogo.id, error);
        }
      }
    }

    console.log("🚀 Importação concluída!");
  } catch (err) {
    console.error("❌ Erro geral:", err);
  }
}

importar();
