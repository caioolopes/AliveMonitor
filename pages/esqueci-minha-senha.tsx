import { FormEvent, useState } from "react";

interface ApiResponse {
  message?: string;
  action?: string;
  developmentCode?: string;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState<ApiResponse | null>(null);
  const [developmentCode, setDevelopmentCode] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    setDevelopmentCode("");

    try {
      const response = await fetch(
        step === "reset" ? "/api/v1/password/reset" : "/api/v1/password/forgot",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            step === "reset"
              ? { email, code, newPassword }
              : { email },
          ),
        },
      );
      const responseBody = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw responseBody;
      }

      setFeedback(responseBody);
      setDevelopmentCode(responseBody.developmentCode || "");
      // Keep the requested email attached to the code-verification step.
      if (step === "request") setStep("reset");
      else setCompleted(true);
    } catch (error) {
      const apiError = error as ApiResponse;
      setFeedback({
        message: apiError.message || "Não foi possível concluir a operação.",
        action: apiError.action || "Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="recovery-page">
      <section className="recovery-panel">
        <a className="brand" href="/">AliveMonitor <span>+</span></a>
        <p className="eyebrow">ACESSO SEGURO</p>
        <h1>
          {completed
            ? "Senha atualizada."
            : step === "reset"
              ? "Crie uma nova senha."
              : "Vamos recuperar seu acesso."}
        </h1>
        <p className="description">
          {completed
            ? "Agora você pode entrar com a nova senha."
            : step === "reset"
              ? "Digite o código enviado por email e escolha uma senha com pelo menos 6 caracteres."
              : "Informe o email da sua conta para receber um código de recuperação."}
        </p>

        {!completed && (
          <form onSubmit={handleSubmit}>
            <label>
              <span>Email da conta</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                readOnly={step === "reset"}
                required
              />
            </label>

            {step === "reset" && (
              <>
                <label>
                  <span>Código de recuperação</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                  />
                </label>
                <label>
                  <span>Nova senha</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                </label>
              </>
            )}

            {feedback && (
              <div className="feedback" role="status">
                <strong>{feedback.message}</strong>
                {feedback.action && <span>{feedback.action}</span>}
              </div>
            )}

            {developmentCode && (
              <div className="dev-code" role="status">
                Código de teste local: <strong>{developmentCode}</strong>
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Aguarde..."
                : step === "reset"
                  ? "Salvar nova senha"
                  : "Enviar código"}
            </button>
            {step === "reset" && (
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setFeedback(null);
                }}
              >
                Usar outro email
              </button>
            )}
          </form>
        )}

        {completed && feedback && (
          <div className="feedback success" role="status">
            <strong>{feedback.message}</strong>
          </div>
        )}

        <a className="back-link" href="/">Voltar para entrar</a>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #ededeb; color: #1c1c1a; font-family: "Trebuchet MS", sans-serif; }
        .recovery-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #ededeb; }
        .recovery-panel { width: min(100%, 440px); padding: 42px; border: 1px solid #d8d8d2; border-radius: 5px; background: #fff; }
        .brand { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 52px; color: #20201e; font-family: Georgia, serif; font-size: 19px; text-decoration: none; }
        .brand span { color: #e33131; font-size: 24px; }
        .eyebrow { margin: 0 0 12px; color: #d83232; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
        h1 { margin: 0 0 12px; font-family: Georgia, serif; font-size: 38px; font-weight: 400; line-height: 1.08; }
        .description { margin: 0 0 28px; color: #777770; font-size: 14px; line-height: 1.6; }
        form { display: grid; gap: 18px; }
        label { display: grid; gap: 8px; }
        label span { color: #777770; font-size: 12px; }
        input { width: 100%; padding: 13px 14px; border: 1px solid #d4d4ce; border-radius: 4px; outline: 0; background: #fafaf8; color: #171717; font: inherit; }
        input:focus { border-color: #e33131; box-shadow: 0 0 0 3px #e3313122; }
        button { min-height: 48px; padding: 12px 16px; border: 0; border-radius: 4px; background: #e33131; color: white; cursor: pointer; font: inherit; font-weight: 700; }
        button:disabled { cursor: wait; opacity: .65; }
        .feedback { display: grid; gap: 5px; padding: 12px; border-left: 2px solid #e33131; background: #fff5f5; color: #852626; font-size: 12px; line-height: 1.5; }
        .feedback span { color: #777770; }
        .feedback.success { border-color: #6e963e; background: #f5faed; color: #426320; }
        .dev-code { padding: 12px; border: 1px dashed #d4d4ce; color: #777770; font-size: 12px; }
        .dev-code strong { color: #b82e2e; font-size: 18px; }
        button.secondary { min-height: 38px; padding: 8px; border: 1px solid #d4d4ce; background: transparent; color: #6f6f69; font-size: 12px; }
        .back-link { display: inline-block; margin-top: 24px; color: #6f6f69; font-size: 12px; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        @media (max-width: 480px) { .recovery-panel { padding: 30px 24px; } .brand { margin-bottom: 40px; } h1 { font-size: 33px; } }
      `}</style>
    </main>
  );
}