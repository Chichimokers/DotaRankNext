'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type PlayerInfo = {
  steam_id: string;
  dota_info?: {
    mmr_estimate?: number;
    rank_tier?: number;
    profile?: string;
    avatar?: string;
  };
  error?: string;
};

// Función para estimar el MMR basado en el rango y estrellas
const estimateMMR = (rank_tier?: number): string => {
  if (!rank_tier) return 'N/A';
  
  const medal = Math.floor(rank_tier / 10);
  const stars = rank_tier % 10;
  
  // Rangos base de MMR por medalla
  const baseMMR: Record<number, number> = {
    1: 0,     // Herald
    2: 770,   // Guardian
    3: 1540,  // Crusader
    4: 2310,  // Archon
    5: 3080,  // Legend
    6: 3850,  // Ancient
    7: 4620,  // Divine
    8: 5420   // Immortal
  };
  
  // Si no es un rango válido
  if (!baseMMR[medal]) return 'N/A';
  
  // Calcular MMR aproximado
  const mmrPerStar = 154; // Cada estrella ≈ 154 MMR
  const effectiveStars = Math.min(stars, medal === 7 ? 7 : 5);
  const estimatedMMR = baseMMR[medal] + (effectiveStars * mmrPerStar);
  
  return `${estimatedMMR}+`;
};

export default function DotaTable() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5500/dota-info')
      .then(res => res.json())
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  const getMedalComponents = (rank_tier?: number) => {
    if (!rank_tier) return { medal: 0, stars: 0 };
    const medal = Math.floor(rank_tier / 10);
    const stars = rank_tier % 10;
    return { medal, stars };
  };

  if (loading) return <p className="text-center text-white">Cargando jugadores...</p>;

  return (
    <div className="overflow-x-auto p-4">
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
          {players.map((p, idx) => {
            const { medal, stars } = getMedalComponents(p.dota_info?.rank_tier);
            const isValidMedal = medal >= 1 && medal <= 8;
            const isValidStar = stars >= 1 && stars <= 7;
            
            return (
              <tr key={idx} className="border-t border-gray-600 hover:bg-gray-700">
                <td className="p-3">{p.dota_info?.profile || 'Desconocido'}</td>
                <td className="p-3">
                  {p.dota_info?.mmr_estimate 
                    ? `${p.dota_info.mmr_estimate}` 
                    : estimateMMR(p.dota_info?.rank_tier)}
                </td>
                <td className="p-3">
                  <div className="relative w-20 h-20">
                    {isValidMedal ? (
                      <>
                        <Image 
                          src={`/medals/medal_${medal}.png`}
                          alt="base medal"
                          fill
                          className="object-contain"
                        />
                        {isValidStar && (
                          <Image 
                            src={`/medals/star_${stars}.png`}
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
                  {p.dota_info?.avatar ? (
                    <div className="relative w-20 h-20">
                      <Image
                        src={p.dota_info.avatar}
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
          })}
        </tbody>
      </table>
    </div>
  );
}