import type { NextApiRequest, NextApiResponse } from 'next';
import { ping } from '@network-utils/tcp-ping';

// Variável em memória para compartilhar entre POST e GET
let currentUrl: string | null = null;
// Função para verificar o status da URL
async function checkUrlStatus(targetUrl: string) {
  const totalAttempts = 5;

  const result = await ping({
    address: targetUrl,
    attempts: totalAttempts,
    port: 443,
    timeout: 2000
  });
// Calcula a perda de pacotes e a latência média
  const failedCount = result.errors ? result.errors.length : 0;
  const successfulCount = totalAttempts - failedCount;
  const packetLoss = (failedCount / totalAttempts) * 100;
// Retorna o status da URL com base nos resultados do ping
  if (successfulCount === 0) {
    return {
      url: targetUrl,
      status: 'DOWN',
      stability: 'Inacessível',
      metrics: {
        packetLoss: '100%',
        avgLatency: null
      }
    };
  }
// Retorna o status da URL como UP se houver pelo menos uma tentativa bem-sucedida
  return {
    url: targetUrl,
    status: 'UP',
    stability: packetLoss === 0 ? 'Excelente' : 'Instável',
    metrics: {
      packetLoss: `${packetLoss}%`,
      avgLatency: `${result.averageLatency.toFixed(2)}ms`
    }
  };
}
// Função principal do handler da API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
// Tenta processar a requisição e capturar erros
  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
// Valida o parâmetro `url` no corpo da requisição
      const inputUrl = body?.url;
      if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim() === '') {
        return res.status(400).json({ error: 'Parâmetro `url` é obrigatório' });
      }
// Salva a URL atual e remove o protocolo e caminhos adicionais
      currentUrl = inputUrl.replace(/^https?:\/\//, '').split('/')[0].trim();
// Verifica o status da URL salva e retorna a resposta
      const pingResponse = await checkUrlStatus(currentUrl);
      return res.status(200).json(pingResponse);
    }

    // 2. Fluxo do GET: consulta a URL salva ou a passada por query
    const queryUrl = req.query?.url as string | undefined;
    const target = queryUrl 
      ? queryUrl.replace(/^https?:\/\//, '').split('/')[0].trim() 
      : currentUrl;
// Valida se há uma URL configurada para consulta
    if (!target) {
      return res.status(400).json({ error: 'Nenhuma URL configurada. Faça um POST primeiro.' });
    }
// Verifica o status da URL e retorna a resposta
    const pingResponse = await checkUrlStatus(target);
    return res.status(200).json(pingResponse);
// Captura qualquer erro durante o processamento da requisição e retorna um erro genérico
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao verificar o status do monitor' });
  }
}