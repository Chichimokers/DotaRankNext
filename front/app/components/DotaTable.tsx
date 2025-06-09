'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type PlayerInfo = {
  steam_id: string;
  mmr_estimate?: number;
  rank_tier?: number;
  profile?: string;
  avatar?: string;
};

const estimateMMR = (rank_tier?: number): string => {
  if (!rank_tier) return 'N/A';

  const medal = Math.floor(rank_tier / 10);
  const stars = rank_tier % 10;

  const baseMMR: Record<number, number> = {
    1: 0,
    2: 770,
    3: 1540,
    4: 2310,
    5: 3080,
    6: 3850,
    7: 4620,
    8: 5420,
  };

  if (!baseMMR[medal]) return 'N/A';

  const mmrPerStar = 154;
  const effectiveStars = Math.min(stars, medal === 7 ? 7 : 5);
  const estimatedMMR = baseMMR[medal] + effectiveStars * mmrPerStar;

  return `${estimatedMMR}+`;
};

const getMedalComponents = (rank_tier?: number) => {
  if (!rank_tier) return { medal: 0, stars: 0 };
  const medal = Math.floor(rank_tier / 10);
  const stars = rank_tier % 10;
  return { medal, stars };
};

export default function DotaTable() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`https://esaki-jrr.com/apidota/dota-info?page=${page}&limit=50`)
      .then(res => res.json())
      .then(data => {
        setPlayers(data.results || []);
      })
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [page]);

  // Filtrar por nombre (profile)
  const filteredPlayers = players
    .filter(p =>
      p.profile?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
    )
    .sort((a, b) => {
      // Orden descendente por mmr_estimate (usar estimateMMR si no hay mmr)
      const mmrA = a.mmr_estimate ?? (parseInt(estimateMMR(a.rank_tier)) || 0);
      const mmrB = b.mmr_estimate ?? (parseInt(estimateMMR(b.rank_tier)) || 0);
      return mmrB - mmrA;
    });

  if (loading) return <p className="text-center text-white">Cargando jugadores...</p>;

  if (players.length === 0)
    return <p className="text-center text-gray-400">No se encontraron jugadores conocidos</p>;

  return (
    <div className="overflow-x-auto p-4">
      {/* Input búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar jugador por nombre..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
        />
      </div>

      <table className="min-w-full bg-gray-800 text-white rounded-lg overflow-hidden shadow-lg">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-3 text-left">Jugador</th>
            <th className="p-3 text-left">MMR</th>
            <th className="p-3 text-left">Medalla</th>
            <th className="p-3 text-left">Avatar</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((p, idx) => {
              const { medal, stars } = getMedalComponents(p.rank_tier);
              const isValidMedal = medal >= 1 && medal <= 8;
              const isValidStar = stars >= 1 && stars <= 7;

              return (
                <tr key={idx} className="border-t border-gray-600 hover:bg-gray-700">
                  <td className="p-3">{p.profile || 'Desconocido'}</td>
                  <td className="p-3">{p.mmr_estimate ?? estimateMMR(p.rank_tier)}</td>
                  <td className="p-3">
                    <div className="relative w-20 h-20">
                      {isValidMedal ? (
                        <>
                          <Image
                            src={`https://esaki-jrr.com/ranking/medals/medal_${medal}.png`}
                            alt="base medal"
                            fill
                            className="object-contain"
                          />
                          {isValidStar && (
                            <Image
                              src={`https://esaki-jrr.com/ranking/medals/star_${stars}.png`}
                              alt="stars"
                              fill
                              className="object-contain"
                            />
                          )}
                        </>
                      ) : (
                        <Image
                          src="/medals/unranked.png"
                          alt="unranked"
                          fill
                          className="object-contain"
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {p.avatar ? (
                      <div className="relative w-20 h-20">
                        <Image
                          src={p.avatar}
                          alt="avatar"
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      'No disponible'
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} className="p-3 text-center text-gray-400">
                No se encontraron jugadores con ese nombre
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Controles de paginación */}
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-white pt-2">Página {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
