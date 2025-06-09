const cors = require('cors');
const express = require('express');
const Database = require('better-sqlite3');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());

// Conectar o crear la base de datos con columnas para caché Dota
const db = new Database('./steam_friends.db');
db.prepare(`
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id TEXT NOT NULL UNIQUE,
    mmr_estimate INTEGER,
    rank_tier INTEGER,
    profile TEXT,
    avatar TEXT
  )
`).run();

// Delay para evitar bloqueo por scraping
const delay = ms => new Promise(res => setTimeout(res, ms));

// Función general para scrapear páginas de SteamLadder
async function scrapearLadder(urlBase, paginas = 400) {
  const ids = new Set();

  for (let i = 1; i <= paginas; i++) {
    const url = `${urlBase}?page=${i}`;
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      $('a[href^="/profile/"]').each((_, el) => {
        const href = $(el).attr('href');
        const match = href?.match(/\/profile\/(\d+)/);
        if (match && match[1]) {
          ids.add(match[1]);
        }
      });

      console.log(`✅ Página ${i} (${urlBase}) completada - Total únicos: ${ids.size}`);
      await delay(300); // Espera 300ms para evitar ban

    } catch (e) {
      console.error(`❌ Error en ${url} — ${e.message}`);
      break;
    }
  }

  return Array.from(ids);
}

// Scraping al iniciar servidor
(async () => {
  console.log('🔍 Iniciando scraping de jugadores cubanos en SteamLadder...');

  const xp = await scrapearLadder('https://steamladder.com/ladder/xp/cu/', 400);
  const playtime = await scrapearLadder('https://steamladder.com/ladder/playtime/570/cu/', 400);

  const all = Array.from(new Set([...xp, ...playtime])); // eliminar duplicados
  console.log(`🎯 Total SteamIDs encontrados: ${all.length}`);

  let guardados = 0;
  all.forEach(steam_id => {
    try {
      db.prepare('INSERT OR IGNORE INTO friends (steam_id) VALUES (?)').run(steam_id);
      guardados++;
    } catch (_) {}
  });

  console.log(`💾 Guardados en la base de datos: ${guardados}`);
})();

// Ruta para agregar manualmente SteamID
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

// Ruta para obtener info Dota con caché y actualización selectiva
app.get('/dota-info', async (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM friends').all();
    const resultados = [];

    for (const row of rows) {
      const accountId = BigInt(row.steam_id) - BigInt('76561197960265728');

      try {
        const response = await axios.get(`https://api.opendota.com/api/players/${accountId}`);
        const data = response.data;

        const nuevaInfo = {
          mmr_estimate: data.mmr_estimate?.estimate ?? null,
          rank_tier: data.rank_tier ?? null,
          profile: data.profile?.personaname ?? null,
          avatar: data.profile?.avatarfull ?? null,
        };

        const infoHaCambiado =
          row.mmr_estimate !== nuevaInfo.mmr_estimate ||
          row.rank_tier !== nuevaInfo.rank_tier ||
          row.profile !== nuevaInfo.profile ||
          row.avatar !== nuevaInfo.avatar;

        if (infoHaCambiado) {
          db.prepare(`
            UPDATE friends SET 
              mmr_estimate = ?, 
              rank_tier = ?, 
              profile = ?, 
              avatar = ?
            WHERE steam_id = ?
          `).run(
            nuevaInfo.mmr_estimate,
            nuevaInfo.rank_tier,
            nuevaInfo.profile,
            nuevaInfo.avatar,
            row.steam_id
          );
          console.log(`🔄 Actualizado info Dota para ${row.steam_id}`);
        } else {
          console.log(`✅ Cache válida para ${row.steam_id}`);
        }

        resultados.push({
          steam_id: row.steam_id,
          dota_info: nuevaInfo
        });

      } catch (e) {
        console.warn(`⚠️ Error obteniendo datos para ${row.steam_id}`);
        resultados.push({
          steam_id: row.steam_id,
          error: 'No se pudo obtener info de OpenDota',
          dota_info: {
            mmr_estimate: row.mmr_estimate,
            rank_tier: row.rank_tier,
            profile: row.profile,
            avatar: row.avatar
          }
        });
      }
    }

    res.json(resultados);
  } catch (err) {
    res.status(500).json({ error: 'Error consultando la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
