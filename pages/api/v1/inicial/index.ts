import type { NextApiRequest, NextApiResponse } from 'next';
import { ping } from '@network-utils/tcp-ping';

async function checkUrlStatus(targetUrl: string) {
  const totalAttempts = 5;

  const result = await ping({
    address: targetUrl,
    attempts: totalAttempts,
    port: 443,
    timeout: 2000,
  });

  const failedCount = result.errors ? result.errors.length : 0;
  const successfulCount = totalAttempts - failedCount;
  const packetLoss = (failedCount / totalAttempts) * 100;

  if (successfulCount === 0) {
    return {
      url: targetUrl,
      status: 'DOWN',
      stability: 'Inacessível',
      metrics: {
        packetLoss: '100%',
        avgLatency: null,
      },
    };
  }

  return {
    url: targetUrl,
    status: 'UP',
    stability: packetLoss === 0 ? 'Excelente' : 'Instável',
    metrics: {
      packetLoss: `${packetLoss}%`,
      avgLatency: `${result.averageLatency.toFixed(2)}ms`,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas aceita POST (ou GET com query param) sem guardar estado em memória
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const inputUrl = body?.url;
    if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim() === '') {
      return res.status(400).json({ error: 'Parâmetro `url` é obrigatório' });
    }

    // Limpa a URL para pegar apenas o host/domínio
    const cleanHost = inputUrl.replace(/^https?:\/\//, '').split('/')[0].trim();

    // Executa o ping e devolve na hora
    const pingResponse = await checkUrlStatus(cleanHost);
    return res.status(200).json(pingResponse);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar o status do monitor' });
  }
}