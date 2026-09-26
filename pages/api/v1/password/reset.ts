import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { ValidationError } from "../../../../infra/errors";
import password from "../../../../models/password";
import passwordReset from "../../../../models/password-reset";

// ============================================================================
// CONFIGURAÇÃO DO ROTEADOR
// ============================================================================
const router = createRouter();

// Define a rota para receber a requisição de finalização/confirmação de troca de senha.
// Geralmente mapeada para algo como POST /api/v1/password-reset/confirm
router.post(postHandler);

// Handler com interceptador global de erros. Erros do tipo ValidationError
// serão automaticamente convertidos em respostas HTTP 400 estruturadas.
export default router.handler(controller.errorHandlers);

// ============================================================================
// HANDLER PRINCIPAL (CONFIRMAÇÃO E ATUALIZAÇÃO DE SENHA)
// ============================================================================
async function postHandler(request, response) {
  // Desestrutura os parâmetros necessários enviados no payload JSON da requisição.
  const { email, code, newPassword } = request.body || {};

  // 1. VALIDAÇÃO ESTRITA DE ENTRADA (DEFENSIVE PROGRAMMING)
  // Checa tipos e formatos antes de executar qualquer lógica pesada:
  // - email: deve ser string.
  // - code: deve ser string e conter exatamente 6 dígitos numéricos (/^\d{6}$/).
  // - newPassword: deve ser string e ter o comprimento mínimo de segurança (>= 6 caracteres).
  if (
    typeof email !== "string" ||
    typeof code !== "string" ||
    !/^\d{6}$/.test(code) ||
    typeof newPassword !== "string" ||
    newPassword.length < 6
  ) {
    throw new ValidationError({
      message: "O email, código ou nova senha são inválidos.",
      action: "Confira o código e use uma senha com pelo menos 6 caracteres.",
      cause: new Error("Invalid reset code or password."),
    });
  }

  // 2. DERIVAÇÃO CRIPTOGRÁFICA
  // Converte o código numérico de 6 dígitos no mesmo hash HMAC armazenado no banco.
  const tokenHash = passwordReset.hashCode(code);

  // Aplica o algoritmo de derivação segura de senhas (ex: bcrypt ou argon2)
  // sobre a nova senha em texto puro ANTES de enviá-la para o banco.
  const hashedPassword = await password.hash(newPassword);

  // 3. EXECUÇÃO ATÔMICA DA TROCA (CONSUMO DO TOKEN)
  // Chama a função atômica (aquela query SQL com CTEs explicada anteriormente).
  // Ela valida o token, checa tentativas, marca como usado, salva a nova senha e derruba sessões antigas.
  const passwordUpdated = await passwordReset.consume(email, tokenHash, hashedPassword);

  // 4. TRATAMENTO DE REJEIÇÃO / FALHA NA VALIDAÇÃO DO TOKEN
  // Se 'passwordUpdated' for false, pode ter ocorrido qualquer um destes cenários:
  // - O código digitado estava errado (incrementou o contador de tentativas).
  // - O token já havia expirado (passaram-se mais de 15 minutos).
  // - O limite de 5 tentativas de erro foi atingido (token bloqueado por brute-force).
  // - O token já foi utilizado anteriormente (used_at não nulo).
  if (!passwordUpdated) {
    throw new ValidationError({
      message: "O código é inválido, expirou ou excedeu o limite de tentativas.",
      action: "Solicite um novo código para redefinir sua senha.",
      cause: new Error("Reset code was invalid, expired, or locked."),
    });
  }

  // 5. RESPOSTA DE SUCESSO
  // Confirma a troca de senha para o cliente, indicando que o usuário pode ir para a tela de login.
  return response.status(200).json({
    message: "Senha redefinida. Entre com sua nova senha.",
  });
}