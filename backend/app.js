const cors = require('cors');
const express = require('express');
const Database = require('better-sqlite3');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());

// Crear/conectar BD
const db = new Database('./steam_friends.db');
db.prepare(`CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_id TEXT NOT NULL UNIQUE
)`).run();

// Función para scrapear SteamLadder
async function obtenerSteamIDsDesdeSteamLadderXP(paginas = 5) {
  const steamIDs = [];

  try {
    for (let i = 1; i <= paginas; i++) {
      const url = `https://steamladder.com/ladder/xp/cu/?page=${i}`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      $('a[href^="/profile/"]').each((_, el) => {
        const href = $(el).attr('href');
        const match = href?.match(/\/profile\/(\d+)/);
        if (match && match[1]) {
          steamIDs.push(match[1]);
        }
      });
    }

    console.log(`✅ SteamIDs (XP ladder) extraídos: ${steamIDs.length}`);
    return steamIDs;
  } catch (e) {
    console.error('❌ Error scrapeando ladder XP:', e.message);
    return [];
  }
}


// Escanear automáticamente al iniciar
(async () => {
  const ids = await obtenerSteamIDsDesdeSteamLadderXP(5);
  let guardados = 0;

  ids.forEach(steam_id => {
    try {
      db.prepare('INSERT OR IGNORE INTO friends (steam_id) VALUES (?)').run(steam_id);
      guardados++;
    } catch (e) {}
  });

  console.log(`✅ SteamIDs guardados: ${guardados}`);
})();

// Ruta para agregar manualmente un SteamID
app.post('/add-friend', (req, res) => {
  const { steam_id } = req.body;
  if (!steam_id) return res.status(400).json({ error: 'Falta steam_id' });

  try {
    db.prepare('INSERT OR IGNORE INTO friends (steam_id) VALUES (?)').run(steam_id);
    return res.json({ message: 'ID agregado con éxito' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al insertar en BD' });
  }
});

// Ruta para obtener info Dota de los amigos
app.get('/dota-info', async (req, res) => {
  try {
    const rows = db.prepare('SELECT steam_id FROM friends').all();
    const resultados = [];

    for (const row of rows) {
      try {
        const accountId = BigInt(row.steam_id) - BigInt('76561197960265728');
        const response = await axios.get(`https://api.opendota.com/api/players/${accountId}`);

        resultados.push({
          steam_id: row.steam_id,
          dota_info: {
            mmr_estimate: response.data.mmr_estimate?.estimate,
            rank_tier: response.data.rank_tier,
            profile: response.data.profile?.personaname,
            avatar: response.data.profile?.avatarfull
          }
        });
      } catch (e) {
        resultados.push({ steam_id: row.steam_id, error: 'No se pudo obtener info' });
      }
    }

    res.json(resultados);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
