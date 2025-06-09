'use client';

import { useState } from 'react';

export default function IdValue() {
  const [id, setId] = useState('');

  function sendID() {
    if (!id) return alert('Por favor, introduce un ID');

    fetch('https://esaki-jrr.com/apidota/add-friend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ steam_id:id }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('Respuesta del backend:', data);
        alert('ID enviado correctamente');
      })
      .catch(error => {
        console.error('Error al enviar el ID:', error);
        alert('Error al enviar el ID');
      });
  }

  return (
    <div className="p-4">
    <h1>Intrudce tu id de dota para aparecer en el ladeboard</h1>
      <input
        type="text"
        value={id}
        onChange={e => setId(e.target.value)}
        placeholder="Introduce el ID de Dota"
        className="border p-2 rounded mr-2"
      />
      <button onClick={sendID} className="bg-blue-500 text-white px-4 py-2 rounded">
        Click to Send
      </button>
    </div>
  );
}
