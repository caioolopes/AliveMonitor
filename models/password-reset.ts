import database from "../infra/database";
import { createHmac } from "node:crypto";

// ============================================================================
// 1. HASH CRIPTOGRÁFICO DO CÓDIGO (SEGURANÇA EM REPOUSO)
// ============================================================================
function hashCode(code) {
  // HMAC adiciona uma chave secreta da aplicação ao cálculo do SHA-256.
  // Se o banco for vazado, o atacante não consegue usar rainbow tables ou força bruta
  // offline para descobrir o código de 6 dígitos sem ter acesso a esta variável secreta.
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("Password reset secret is not configured.");
  
  return createHmac("sha256", secret).update(code).digest("hex");
}

// ============================================================================
// 2. CRIAÇÃO DE TOKEN COM RATE LIMITING (TRANSAÇÃO ATÔMICA VIA CTE)
// ============================================================================
async function createForEmail(email, codeHash, expirationMinutes) {
  // Executa toda a lógica em um único round-trip SQL usando Common Table Expressions (WITH).
  // Isso evita concorrência (race conditions) entre checar se existe e inserir.
  const results = await database.query({
    text: `
      WITH target_user AS (
        -- Localiza o ID do usuário de forma case-insensitive (email em minúsculas)
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
      ), recent_request AS (
        -- RATE LIMITING (Anti-Spam / Anti-Flood):
        -- Verifica se já foi gerado algum token para este usuário nos últimos 60 segundos.
        SELECT user_id
        FROM password_reset_tokens
        WHERE user_id IN (SELECT id FROM target_user)
          AND created_at > NOW() - INTERVAL '1 minute'
      ), deleted_tokens AS (
        -- INVALIDAÇÃO DE TOKENS ANTERIORES:
        -- Se passou pelo rate limit, apaga tokens antigos do usuário para que apenas o novo valha.
        DELETE FROM password_reset_tokens
        WHERE user_id IN (SELECT id FROM target_user)
          AND NOT EXISTS (SELECT 1 FROM recent_request)
      ), created_token AS (
        -- PERSISTÊNCIA DO NOVO TOKEN:
        -- Insere o hash e calcula o expires_at diretamente no relógio do PostgreSQL.
        SELECT id, $2, NOW() + ($3::integer * INTERVAL '1 minute')
        FROM target_user
        WHERE NOT EXISTS (SELECT 1 FROM recent_request)
        RETURNING id
      )
      -- Retorna true se o token foi efetivamente inserido, ou false se foi bloqueado pelo rate limit
      SELECT EXISTS (SELECT 1 FROM created_token) AS created
    ;`,
    values: [email, codeHash, expirationMinutes],
  });

  return results.rows[0].created;
}

// ============================================================================
// 3. REMOÇÃO EXPLÍCITA DE TOKEN
// ============================================================================
async function deleteByHash(tokenHash) {
  // Útil para cenários de descarte manual, falha no disparo do email ou testes.
  await database.query({
    text: `DELETE FROM password_reset_tokens WHERE code_hash = $1;`,
    values: [tokenHash],
  });
}

// ============================================================================
// 4. CONSUMO DO TOKEN E REDEFINIÇÃO DE SENHA (ATOMICIDADE TOTAL)
// ============================================================================
async function consume(email, tokenHash, hashedPassword) {
  // Executa validação de código, controle de tentativas, troca de senha e
  // invalidação de sessões em uma única operação atômica no banco de dados.
  const results = await database.query({
    text: `
      WITH pending_token AS (
        -- ETAPA 1: Busca o token ativo mais recente para este email.
        -- Regras: não pode ter sido usado (used_at IS NULL) e não pode estar expirado.
        -- 'FOR UPDATE' bloqueia a linha no banco, impedindo ataques concorrentes
        -- onde múltiplas requisições paralelas tentam testar códigos ao mesmo tempo.
        SELECT reset_token.id, reset_token.user_id, reset_token.code_hash, reset_token.attempts
        FROM password_reset_tokens AS reset_token
        JOIN users ON users.id = reset_token.user_id
        WHERE LOWER(users.email) = LOWER($1)
          AND reset_token.used_at IS NULL
          AND reset_token.expires_at > NOW()
        ORDER BY reset_token.created_at DESC
        LIMIT 1
        FOR UPDATE OF reset_token
      ), recorded_attempt AS (
        -- ETAPA 2: CONTADOR DE ERROS (PROTEÇÃO CONTRA FORÇA BRUTA)
        -- Se o hash fornecido ($2) for diferente do banco E tentativas < 5,
        -- incrementa o contador. Ao bater 5 tentativas, o token é travado.
        UPDATE password_reset_tokens
        SET attempts = attempts + 1
        WHERE id = (SELECT id FROM pending_token)
          AND code_hash <> $2
          AND attempts < 5
        RETURNING id
      ), consumed_token AS (
        -- ETAPA 3: QUEIMA DO TOKEN
        -- Se o código bater ($2) e houver menos de 5 tentativas de erro,
        -- marca used_at com o timestamp atual (impede reutilização).
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = (SELECT id FROM pending_token)
          AND code_hash = $2
          AND attempts < 5
        RETURNING user_id
      ), updated_user AS (
        -- ETAPA 4: ATUALIZAÇÃO DA SENHA DO USUÁRIO
        -- Atualiza a senha no registro de 'users' apenas se a etapa 3 teve sucesso.
        UPDATE users
        SET password = $3, updated_at = NOW()
        WHERE id = (SELECT user_id FROM consumed_token)
        RETURNING id
      ), expired_sessions AS (
        -- ETAPA 5: LOGOUT GERAL DE SEGURANÇA
        -- Expira imediatamente todas as sessões ativas (tokens de login/JWT em tabela)
        -- do usuário, deslogando qualquer invasor ou outros dispositivos conectados.
        UPDATE sessions
        SET expires_at = NOW(), updated_at = NOW()
        WHERE user_id = (SELECT id FROM updated_user)
      )
      -- Retorna o ID do usuário se a senha foi alterada com sucesso.
      SELECT id FROM updated_user
    ;`,
    values: [email, tokenHash, hashedPassword],
  });

  // Se rowCount > 0, significa que o token era válido, a senha mudou e as sessões caíram.
  return results.rowCount > 0;
}

const passwordReset = {
  hashCode,
  createForEmail,
  deleteByHash,
  consume,
};

export default passwordReset;