import type { NextApiRequest, NextApiResponse } from 'next';
import { ping } from '@network-utils/tcp-ping';
import { prisma } from '../../../../lib/prisma';
import session from '../../../../models/session';


// FUNÇÃO AUXILIAR: TESTE DE REDE (TCP PING)

async function checkUrlStatus(targetUrl: string) {
  // Quantidade de pacotes enviados para medir estabilidade
  const totalAttempts = 5;

  // Realiza o ping TCP na porta HTTPS padrão (443) com timeout de 2 segundos por pacote
  const result = await ping({
    address: targetUrl,
    attempts: totalAttempts,
    port: 443,
    timeout: 2000,
  });

  // Calcula falhas, sucessos e porcentagem de perda de pacotes
  const failedCount = result.errors ? result.errors.length : 0;
  const successfulCount = totalAttempts - failedCount;
  const packetLoss = (failedCount / totalAttempts) * 100;

  // Se nenhum pacote respondeu, considera o serviço fora do ar (DOWN)
  if (successfulCount === 0) {
    return {
      url: targetUrl,
      isUp: false,
      latencyMs: 0,
      packetLoss: '100%',
    };
  }

  // Se houve resposta, considera ativo (UP) e calcula a média de latência em milissegundos
  return {
    url: targetUrl,
    isUp: true,
    latencyMs: Math.round(result.averageLatency),
    packetLoss: `${packetLoss}%`,
  };
}

// ROTA PRINCIPAL DA API (CONTROLLER / HANDLER)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. FILTRO DE MÉTODOS HTTP: Garante que apenas GET, POST, PATCH ou DELETE sejam processados
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 2. AUTENTICAÇÃO: Obtém o token de sessão do cookie e busca o usuário logado
    const sessionObject = await session.findOneValidByToken(req.cookies.session_id);

    // MÉTODO GET: LISTA MONITORES, TESTA E ATUALIZA HISTÓRICO
    if (req.method === 'GET') {
      // Busca todos os monitores pertencentes ao usuário logado
      const monitorTargets = await prisma.monitorTarget.findMany({
        where: { userId: sessionObject.user_id },
        orderBy: { createdAt: 'desc' },
      });

      // Dispara o ping para todos os monitores em paralelo
      await Promise.all(
        monitorTargets.map(async (target) => {
          let pingResult: any;

          try {
            pingResult = await checkUrlStatus(target.url);
          } catch {
            // Em caso de exceção de rede, registra o status de falha total
            pingResult = { url: target.url, isUp: false, latencyMs: 0, packetLoss: '100%' };
          }

          // Salva o resultado da medição como um novo registro de log
          await prisma.pingLog.create({
            data: {
              targetId: target.id,
              isUp: pingResult.isUp,
              latencyMs: pingResult.latencyMs,
            },
          });
        })
      );

      // Busca novamente os alvos, agora incluindo os últimos 12 registros de log para o frontend
      const targets = await prisma.monitorTarget.findMany({
        where: { userId: sessionObject.user_id },
        orderBy: { createdAt: 'desc' },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 12,
          },
        },
      });

      return res.status(200).json({ targets });
    }

    // MÉTODO DELETE: REMOVE UM MONITOR DO BANCO
    if (req.method === 'DELETE') {
      const { id } = req.body;

      // Validação de segurança: confere se o monitor existe e pertence ao usuário autenticado
      const target = await prisma.monitorTarget.findFirst({
        where: { id, userId: sessionObject.user_id },
      });

      if (!target) {
        return res.status(404).json({ error: 'Monitor não encontrado' });
      }

      // Remove o alvo (graças ao onDelete: Cascade no Prisma, os logs associados também são removidos)
      await prisma.monitorTarget.delete({ where: { id: target.id } });
      return res.status(200).json({ message: 'Monitor removido com sucesso' });
    }

    // VALIDAÇÃO COMUM PARA CRIAÇÃO (POST) E ATUALIZAÇÃO (PATCH)
    const { url, name } = req.body;

    // Garante que o campo 'url' seja uma string não vazia
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({ error: 'Campo `url` é obrigatório' });
    }

    // MÉTODO PATCH: ATUALIZA NOME OU ENDEREÇO DO MONITOR
    if (req.method === 'PATCH') {
      const { id } = req.body;

      // Valida propriedade do monitor antes da edição
      const target = await prisma.monitorTarget.findFirst({
        where: { id, userId: sessionObject.user_id },
      });

      if (!target) {
        return res.status(404).json({ error: 'Monitor não encontrado' });
      }

      // Atualiza os dados limpando protocolos e barras do domínio
      const updatedTarget = await prisma.monitorTarget.update({
        where: { id: target.id },
        data: {
          name: name || url,
          url: url.replace(/^https?:\/\//, '').split('/')[0].trim(),
        },
      });

      return res.status(200).json({ message: 'Monitor atualizado com sucesso', target: updatedTarget });
    }

    // MÉTODO POST: CRIAÇÃO DE UM NOVO MONITOR

    // Remove prefixos como 'http://' ou 'https://' e barras finais para obter apenas o hostname limpo
    const cleanHost = url.replace(/^https?:\/\//, '').split('/')[0].trim();

    // 1. Executa o primeiro teste imediato na URL
    const pingResult = await checkUrlStatus(cleanHost);

    // 2. Cria o monitor e já insere o primeiro PingLog na mesma transação (Nested Write)
    const target = await prisma.monitorTarget.create({
      data: {
        name: name || cleanHost,
        url: cleanHost,
        userId: sessionObject.user_id, // Vincula ao usuário da sessão
        logs: {
          create: {
            isUp: pingResult.isUp,
            latencyMs: pingResult.latencyMs,
          },
        },
      },
      include: {
        logs: true, // Devolve o registro com os logs incluídos na resposta
      },
    });

    return res.status(201).json({
      message: 'Monitor salvo com sucesso',
      target,
    });
  } catch (error) {
    // Tratamento de sessão inválida/inexistente disparada pelo model de session
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      return res.status(401).json({ error: error.message });
    }

    // Tratamento genérico de falhas internas (erros de banco, conexões inesperadas, etc.)
    console.error('Erro ao salvar monitor:', error);
    return res.status(500).json({ error: 'Erro ao processar e salvar os dados' });
  }
}