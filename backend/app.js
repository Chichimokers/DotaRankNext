const cors = require('cors');
const express = require('express');
const Database = require('better-sqlite3');
const axios = require('axios');

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());

const db = new Database('./steam_friends.db');
db.prepare(`
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id TEXT NOT NULL UNIQUE,
    mmr_estimate INTEGER,
    rank_tier INTEGER,
    profile TEXT,
    avatar TEXT,
    last_update INTEGER DEFAULT 0
  )
`).run();

const delay = ms => new Promise(res => setTimeout(res, ms));

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

app.get('/dota-info', async (req, res) => {
  const search = (req.query.search || '').trim().toLowerCase();

  try {
    let baseQuery = `
      SELECT steam_id, mmr_estimate, rank_tier, profile, avatar FROM friends
      WHERE profile IS NOT NULL AND profile != ''
    `;

    const params = [];

    if (search.length > 0) {
      baseQuery += ` AND LOWER(profile) LIKE ?`;
      params.push(`%${search}%`);
    }

    const rows = db.prepare(baseQuery).all(...params);

    const actualizarYObtenerInfo = async (row) => {
      const steam_id = row.steam_id;
      const accountId = BigInt(steam_id) - BigInt('76561197960265728');

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
              avatar = ?, 
              last_update = ?
            WHERE steam_id = ?
          `).run(
            nuevaInfo.mmr_estimate,
            nuevaInfo.rank_tier,
            nuevaInfo.profile,
            nuevaInfo.avatar,
            Date.now(),
            steam_id
          );
          return { steam_id, ...nuevaInfo };
        } else {
          db.prepare(`UPDATE friends SET last_update = ? WHERE steam_id = ?`).run(Date.now(), steam_id);
          return { steam_id, ...row };
        }
      } catch (e) {
        return { steam_id, ...row, error: 'No se pudo obtener info de OpenDota' };
      }
    };

    const resultados = [];
    for (const row of rows) {
      const updated = await actualizarYObtenerInfo(row);
      resultados.push(updated);
      await delay(1000);
    }

    res.json({
      count: resultados.length,
      results: resultados,
    });
  } catch (error) {
    console.error('Error en /dota-info:', error);
    res.status(500).json({ error: 'Error consultando la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
