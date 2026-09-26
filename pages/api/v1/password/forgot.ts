import { randomInt } from "node:crypto";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import email from "../../../../infra/email";
import { ValidationError } from "../../../../infra/errors";
import passwordReset from "../../../../models/password-reset";

// ============================================================================
// CONFIGURAÇÕES GERAIS E ROTEAMENTO
// ============================================================================

// Tempo de vida do código temporário enviado ao usuário (15 minutos).
const CODE_EXPIRATION_IN_MINUTES = 15;

// Cria o roteador usando next-connect para gerenciar métodos HTTP e middlewares.
const router = createRouter();

// Define que esta rota responderá exclusivamente ao verbo POST (ex: /api/v1/password-reset).
router.post(postHandler);

// Exporta o handler encapsulado pelos tratadores globais de erro (controller.errorHandlers).
// Se qualquer erro (como ValidationError ou ServiceError) for lançado com 'throw', 
// o middleware captura e formata a resposta JSON apropriada (400, 500, etc.) sem derrubar o Node.
export default router.handler(controller.errorHandlers);

// ============================================================================
// HANDLER PRINCIPAL (FLUXO DE SOLICITAÇÃO DE RECUPERAÇÃO)
// ============================================================================
async function postHandler(request, response) {
  const emailAddress = request.body?.email;

  // 1. VALIDAÇÃO DE ENTRADA (FAIL FAST)
  // Checa se o campo é uma string e bate com uma regex simples de formato de email (x@y.z).
  if (
    typeof emailAddress !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)
  ) {
    throw new ValidationError({
      message: "Informe um email válido.",
      action: "Confira o endereço e tente novamente.",
      cause: new Error("Invalid email address."),
    });
  }

  // 2. VERIFICAÇÃO PREVENTIVA DO PROVEDOR DE EMAIL (SMTP)
  // Checa se as variáveis de SMTP estão configuradas ANTES de tocar no banco de dados.
  // Isso evita side-effects: se o SMTP estiver quebrado em produção, lança erro imediatamente
  // sem gerar tokens órfãos ou dar falsas expectativas de envio.
  const smtpConfiguration = email.getSmtpConfiguration();

  // 3. GERAÇÃO CRIPTOGRAFICAMENTE SEGURA DO CÓDIGO
  // randomInt gera números pseudoaleatórios seguros (CSPRNG) entre 0 e 999999.
  // .padStart(6, "0") garante que números menores (ex: 42) virem strings de 6 dígitos ("000042").
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

  // Cria o hash HMAC com a chave da aplicação para salvar no banco em vez do texto puro.
  const codeHash = passwordReset.hashCode(code);

  // 4. PERSISTÊNCIA E RATE LIMITING NO BANCO
  // Cria o token no banco. Retornará:
  // - true: se o usuário existe, não violou o rate limit de 1 min e o token foi salvo.
  // - false: se o usuário NÃO existe OU se tentou pedir outro código antes de 1 minuto.
  const tokenCreated = await passwordReset.createForEmail(
    emailAddress,
    codeHash,
    CODE_EXPIRATION_IN_MINUTES,
  );

  // 5. DISPARO DO EMAIL COM ROLLBACK EM CASO DE FALHA
  // Só tenta disparar se o token realmente foi gravado no banco E o SMTP estiver configurado.
  if (tokenCreated && smtpConfiguration) {
    try {
      await email.sendPasswordResetEmail(
        emailAddress,
        code,
        smtpConfiguration,
      );
    } catch (error) {
      // ROLLBACK: Se o provedor de email (ex: SendGrid, SES) cair ou der erro de rede,
      // apagamos o hash gerado para não deixar um token inutilizável travando o rate limit do usuário.
      await passwordReset.deleteByHash(codeHash);
      throw error;
    }
  }

  // 6. PROTEÇÃO CONTRA USER ENUMERATION (PREVENÇÃO DE VAZAMENTO DE USUÁRIOS)
  // A mensagem devolvida é IDÊNTICA quer o usuário exista ou não, e quer o email tenha sido enviado ou não.
  // Isso impede que atacantes usem esta rota para descobrir quais emails têm conta no AliveMonitor.
  const responseBody = {
    message: "Se o email estiver cadastrado, enviaremos as instruções para redefinir sua senha.",
  };

  // 7. FACILITADOR PARA DESENVOLVIMENTO LOCAL / TESTES
  // Se estiver em ambiente local (desenvolvimento/testes) e sem SMTP configurado,
  // devolve o código gerado no próprio corpo da resposta HTTP, permitindo testar o fluxo de ponta a ponta.
  if (tokenCreated && !smtpConfiguration && process.env.NODE_ENV !== "production") {
    responseBody["developmentCode"] = code;
  }

  // Retorna HTTP 200 genérico informando sucesso da solicitação.
  return response.status(200).json(responseBody);
}