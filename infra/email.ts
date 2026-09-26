import nodemailer from "nodemailer";
import { ServiceError } from "./errors";

// 1. OBTENÇÃO E VALIDAÇÃO DA CONFIGURAÇÃO
// Esta função busca as variáveis de ambiente necessárias para conectar ao seu provedor de email (SMTP).
function getSmtpConfiguration() {
  // process.env acessa as variáveis isoladas do sistema (geralmente vindas de um arquivo .env).
  // Isso impede que senhas fiquem expostas no código-fonte.
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM; // Ex: "contato@alivemonitor.com"
  
  const configuredValues = [host, port, username, password, from];

  // Cenário A: Nenhuma variável foi configurada
  if (configuredValues.every((value) => !value)) {
    // Se o sistema estiver em "produção" (rodando para usuários reais), a falta de email é um erro crítico.
    if (process.env.NODE_ENV === "production") {
      throw new ServiceError({
        message: "O envio de emails não está configurado.",
        cause: new Error("SMTP configuration is missing."),
      });
    }
    // Se estiver em "desenvolvimento" (rodando localmente), permite que você programe outras áreas 
    // sem o app quebrar por falta da configuração de email.
    return null;
  }

  // Cenário B: Configuração parcial
  // Se você preencheu a senha, mas esqueceu a porta, ele avisa antes de tentar conectar e falhar de forma confusa.
  if (configuredValues.some((value) => !value)) {
    throw new ServiceError({
      message: "A configuração SMTP está incompleta.",
      cause: new Error("SMTP configuration is incomplete."),
    });
  }

  // Validação técnica da porta
  // Garante que a porta informada é um número inteiro válido para conexões de rede (entre 1 e 65535).
  const portNumber = Number(port);
  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw new ServiceError({
      message: "A porta SMTP configurada é inválida.",
      cause: new Error("SMTP_PORT must be a valid TCP port."),
    });
  }

  // Retorna um objeto limpo e validado para ser usado no disparo.
  return { host, port: portNumber, username, password, from };
}

// 2. DISPARO DO EMAIL
// Função assíncrona que recebe o destinatário, o código gerado pelo seu banco de dados, e as configurações validadas acima.
async function sendPasswordResetEmail(recipient, code, configuration) {
  // O "transporter" é o motor do Nodemailer. Ele abre a conexão com provedores como SendGrid, Amazon SES ou Gmail.
  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    // A porta 465 é o padrão da web para conexões implicitamente seguras (SSL/TLS). 
    // Se for 465, o 'secure' é true. Se for outra (como 587), ele conecta primeiro e negocia segurança depois (STARTTLS).
    secure: configuration.port === 465,
    auth: {
      user: configuration.username,
      pass: configuration.password,
    },
  });

  // O comando .sendMail efetivamente envia a mensagem. 
  // O 'await' faz a aplicação pausar aqui até que o provedor responda "Email aceito para envio" ou devolva um erro.
  await transporter.sendMail({
    from: configuration.from,
    to: recipient,
    subject: "Código para redefinir sua senha do AliveMonitor",
    text: `Seu código de recuperação de senha é ${code}. Ele expira em 15 minutos. Se você não solicitou esta alteração, ignore esta mensagem.`,
  });
}

// Agrupa as funções no objeto 'email' para que outros arquivos importem de forma legível.
// Exemplo de uso em outro arquivo: await email.sendPasswordResetEmail(...)
const email = {
  getSmtpConfiguration,
  sendPasswordResetEmail,
};

export default email;