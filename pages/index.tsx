import { FormEvent, useEffect, useState } from "react";

type AuthMode = "login" | "register";
type Theme = "light" | "dark";

interface ApiError {
  message?: string;
  action?: string;
}

interface GuestPingResult {
  url: string;
  status: "UP" | "DOWN";
  stability: string;
  metrics: {
    packetLoss: string;
    avgLatency: string | null;
  };
}

export default function HomePage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [theme, setTheme] = useState<Theme>("light");
  const [themeReady, setThemeReady] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<ApiError | null>(null);
  const [guestUrl, setGuestUrl] = useState("");
  const [guestPingLoading, setGuestPingLoading] = useState(false);
  const [guestPingResult, setGuestPingResult] = useState<GuestPingResult | null>(null);
  const [guestPingError, setGuestPingError] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("alivemonitor-theme");

    if (savedTheme === "dark") {
      setTheme("dark");
    }

    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    window.localStorage.setItem("alivemonitor-theme", theme);
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme, themeReady]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedback(null);
  }

  async function handleGuestPing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuestPingLoading(true);
    setGuestPingError("");
    setGuestPingResult(null);

    try {
      const response = await fetch("/api/v1/inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: guestUrl }),
      });
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.error || responseBody.message || "Não foi possível testar este endereço.");
      }

      setGuestPingResult(responseBody as GuestPingResult);
    } catch (error) {
      setGuestPingError(error instanceof Error ? error.message : "Não foi possível testar este endereço.");
    } finally {
      setGuestPingLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    const endpoint = mode === "login" ? "/api/v1/sessions" : "/api/v1/users";
    const body = mode === "login" ? { email, password } : { username, email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = (await response.json()) as ApiError;

      if (!response.ok) {
        throw responseBody;
      }

      if (mode === "login") {
        window.location.assign("/monitors");
        return;
      }

      setPassword("");
      setMode("login");
      setFeedback({
        message: "Conta criada com sucesso.",
        action: "Entre com seu email e senha para continuar.",
      });
    } catch (error) {
      const apiError = error as ApiError;
      setFeedback({
        message: apiError.message || "Não foi possível concluir a operação.",
        action: apiError.action || "Confira os dados e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className={`auth-shell ${theme === "dark" ? "dark-theme" : ""}`}>
      <section className="intro-panel" aria-label="Sobre o AliveMonitor">
        <div className="topbar">
          <div className="brand-mark" aria-hidden="true"><span>+</span></div>
          <div className="theme-switch" aria-label="Escolher tema">
            <button className={theme === "light" ? "active" : ""} type="button" onClick={() => setTheme("light")} aria-pressed={theme === "light"}>
              Tema claro
            </button>
            <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>
              Tema escuro
            </button>
          </div>
        </div>
        <p className="eyebrow">ALIVEMONITOR / 01</p>
        <h1>Veja seus serviços respirarem.</h1>
        <p className="intro-copy">
          Acompanhe disponibilidade, latência e estabilidade em um só lugar.
        </p>
        <div className="guest-tool">
          <p className="eyebrow">TESTE RÁPIDO / SEM LOGIN</p>
          <h2>Pingue um site agora.</h2>
          <p>Digite uma URL e veja se ela está respondendo. É grátis e não salva nada.</p>
          <form onSubmit={handleGuestPing} className="guest-form">
            <input
              type="text"
              value={guestUrl}
              onChange={(event) => setGuestUrl(event.target.value)}
              placeholder="exemplo.com.br"
              aria-label="URL do site para testar"
              required
            />
            <button type="submit" disabled={guestPingLoading}>
              {guestPingLoading ? "Testando..." : "Testar"}
            </button>
          </form>
          {guestPingError && <p className="guest-error" role="alert">{guestPingError}</p>}
          {guestPingResult && (
            <div className={`guest-result ${guestPingResult.status === "UP" ? "online" : "offline"}`}>
              <div className="guest-result-heading">
                <strong>{guestPingResult.url}</strong>
                <span>{guestPingResult.status === "UP" ? "ONLINE" : "FORA DO AR"}</span>
              </div>
              <div className="guest-metrics">
                <span>{guestPingResult.stability}</span>
                <span>{guestPingResult.metrics.avgLatency || "-"}</span>
                <span>{guestPingResult.metrics.packetLoss} perda</span>
              </div>
            </div>
          )}
          <button className="save-hint" type="button" onClick={() => changeMode("login")}>
            Quer salvar esse monitor? Entre na sua conta <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="signal-line" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <p className="panel-note">Monitoramento simples para sistemas que não podem parar.</p>
      </section>

      <section className="form-panel">
        <div className="form-wrap">
          <div className="form-heading">
            <p className="eyebrow">ACESSO SEGURO</p>
            <h2>{isLogin ? "Bem-vindo de volta." : "Comece agora."}</h2>
            <p>{isLogin ? "Entre para abrir seu painel de monitoramento." : "Crie sua conta e acompanhe sua infraestrutura."}</p>
          </div>

          {!isLogin && (
            <div className="register-benefits">
              <p className="benefits-title">Com sua conta, você pode:</p>
              <span><b>01</b> Salvar sites e serviços para acompanhar</span>
              <span><b>02</b> Ver disponibilidade e latência em um só painel</span>
              <span><b>03</b> Testar seus endereços sempre que precisar</span>
            </div>
          )}

          <div className="mode-switch" role="tablist" aria-label="Tipo de acesso">
            <button className={isLogin ? "active" : ""} onClick={() => changeMode("login")} role="tab" aria-selected={isLogin} type="button">
              Entrar
            </button>
            <button className={!isLogin ? "active" : ""} onClick={() => changeMode("register")} role="tab" aria-selected={!isLogin} type="button">
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <label>
                <span>Nome de usuário</span>
                <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="seu_usuario" required />
              </label>
            )}
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" required />
            </label>
            <label>
              <span>Senha</span>
              <input type="password" autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={6} required />
            </label>

            {feedback && (
              <div className={`feedback ${feedback.message === "Conta criada com sucesso." ? "success" : "error"}`} role="alert">
                <strong>{feedback.message}</strong>
                <span>{feedback.action}</span>
              </div>
            )}

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? "Aguarde..." : isLogin ? "Entrar no painel" : "Criar minha conta"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>

          <p className="legal-copy">Ao continuar, você concorda com o uso seguro dos seus dados.</p>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f2f2f0; color: #171717; font-family: "Trebuchet MS", sans-serif; }
        button, input { font: inherit; }
        .auth-shell { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(420px, .95fr); background: #f2f2f0; }
        .intro-panel { padding: clamp(32px, 7vw, 104px); display: flex; flex-direction: column; justify-content: space-between; min-height: 100vh; border-right: 1px solid #deded9; background: #e9e9e5; }
        .topbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .brand-mark { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid #e33131; border-radius: 4px; color: #d92727; font-size: 28px; line-height: 1; }
        .brand-mark span { transform: translateY(-2px); }
        .theme-switch { display: flex; gap: 3px; padding: 3px; border: 1px solid #d5d5cf; border-radius: 5px; background: #f5f5f2; }
        .theme-switch button { padding: 7px 9px; border: 0; border-radius: 3px; background: transparent; color: #777770; cursor: pointer; font-size: 10px; }
        .theme-switch button.active { background: #fff; color: #252522; box-shadow: 0 1px 4px #00000012; }
        .eyebrow { margin: 0; color: #e33b3b; font-size: 11px; letter-spacing: 2px; font-weight: 700; }
        .intro-panel .eyebrow { margin-top: 12vh; }
        h1, h2, p { margin-top: 0; }
        h1 { max-width: 650px; margin-bottom: 24px; font-family: Georgia, serif; font-size: clamp(48px, 7vw, 96px); line-height: .95; letter-spacing: -2px; font-weight: 400; }
        .intro-copy { max-width: 430px; color: #555552; font-size: 18px; line-height: 1.6; }
        .guest-tool { max-width: 560px; margin-top: 38px; padding: 20px; border: 1px solid #d6d6d0; border-radius: 5px; background: #f8f8f6; }
        .guest-tool h2 { margin: 8px 0 5px; font-family: Georgia, serif; font-size: 25px; font-weight: 400; }
        .guest-tool > p:not(.eyebrow):not(.guest-error) { margin-bottom: 16px; color: #988b8b; font-size: 12px; line-height: 1.5; }
        .guest-form { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
        .guest-form input { min-width: 0; padding: 11px 12px; border-color: #d0d0ca; border-radius: 4px; background: #fff; color: #171717; font-size: 13px; }
        .guest-form button { padding: 0 16px; border: 0; border-radius: 4px; background: #e33131; color: #fff; cursor: pointer; font-size: 12px; font-weight: 700; }
        .guest-form button:hover:not(:disabled) { background: #ff4444; }
        .guest-form button:disabled { cursor: wait; opacity: .65; }
        .guest-error { margin: 10px 0 0; color: #f08f8f; font-size: 12px; }
        .guest-result { margin-top: 14px; padding-top: 13px; border-top: 1px solid #deded8; }
        .guest-result-heading, .guest-metrics { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .guest-result-heading strong { min-width: 0; overflow: hidden; color: #252522; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .guest-result-heading span { flex: 0 0 auto; color: #bf3333; font-size: 10px; font-weight: 700; letter-spacing: 1px; }
        .guest-result.online .guest-result-heading span { color: #4d7b20; }
        .guest-metrics { justify-content: flex-start; margin-top: 8px; color: #777770; font-size: 11px; }
        .guest-metrics span + span { padding-left: 12px; border-left: 1px solid #d6d6d0; }
        .save-hint { margin: 17px 0 0; padding: 0; border: 0; background: transparent; color: #777770; cursor: pointer; font-size: 11px; text-align: left; }
        .save-hint:hover { color: #f04444; }
        .save-hint span { color: #e33131; font-size: 16px; vertical-align: -1px; }
        .signal-line { display: flex; align-items: end; gap: 6px; height: 45px; margin: 44px 0 20px; }
        .signal-line i { display: block; width: 5px; background: #e33131; animation: pulse 1.8s ease-in-out infinite; }
        .signal-line i:nth-child(1) { height: 18px; animation-delay: .1s; }
        .signal-line i:nth-child(2) { height: 32px; animation-delay: .25s; }
        .signal-line i:nth-child(3) { height: 45px; animation-delay: .4s; }
        .signal-line i:nth-child(4) { height: 26px; animation-delay: .55s; }
        .signal-line i:nth-child(5) { height: 38px; animation-delay: .7s; }
        .panel-note, .legal-copy { color: #777770; font-size: 12px; line-height: 1.5; }
        .form-panel { display: grid; place-items: center; padding: 48px clamp(28px, 8vw, 110px); background: #fff; }
        .form-wrap { width: min(100%, 410px); }
        .form-heading h2 { margin: 14px 0 10px; font-family: Georgia, serif; font-size: 40px; font-weight: 400; letter-spacing: -1px; }
        .form-heading > p:last-child { color: #777770; font-size: 14px; line-height: 1.5; }
        .register-benefits { display: grid; gap: 8px; margin-top: 22px; padding: 14px 0 2px; border-top: 1px solid #e1e1dc; color: #777770; font-size: 11px; line-height: 1.4; }
        .benefits-title { margin: 0 0 2px; color: #252522; font-size: 12px; font-weight: 700; }
        .register-benefits span { display: flex; gap: 10px; align-items: baseline; }
        .register-benefits b { min-width: 18px; color: #e33131; font-size: 10px; }
        .mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 34px 0 28px; padding: 4px; border-radius: 5px; background: #f0f0ed; }
        .mode-switch button { padding: 11px; border: 0; border-radius: 3px; color: #777770; background: transparent; cursor: pointer; font-size: 13px; }
        .mode-switch button.active { background: #fff; color: #262622; box-shadow: 0 1px 5px #00000012, inset 0 -2px #e33131; }
        .auth-form { display: grid; gap: 18px; }
        label { display: grid; gap: 8px; }
        label span { color: #a79d9d; font-size: 12px; }
        input { width: 100%; padding: 14px 15px; border: 1px solid #d4d4ce; border-radius: 4px; outline: 0; background: #fafaf8; color: #171717; transition: border-color .2s, box-shadow .2s; }
        input::placeholder { color: #aaa9a3; }
        input:focus { border-color: #e33131; box-shadow: 0 0 0 3px #e3313122; }
        .feedback { display: grid; gap: 4px; padding: 12px 14px; border: 1px solid #f0c7c7; border-left: 2px solid #e33131; border-radius: 4px; background: #fff5f5; color: #a52a2a; font-size: 12px; line-height: 1.4; }
        .feedback.success { border-color: #c7d9ad; background: #f5faed; color: #4d7028; }
        .feedback span { color: #777770; }
        .submit-button { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding: 16px 18px; border: 0; border-radius: 4px; background: #e33131; color: #fff; cursor: pointer; font-weight: 700; }
        .submit-button:hover:not(:disabled) { background: #ff4444; }
        .submit-button:disabled { cursor: wait; opacity: .65; }
        .submit-button span { font-size: 20px; }
        .legal-copy { margin: 26px 0 0; text-align: center; }
        .dark-theme { background: #171717; color: #f4f4f1; }
        .dark-theme .intro-panel { border-color: #30302e; background: #222221; }
        .dark-theme .intro-copy { color: #c4c4bf; }
        .dark-theme .guest-tool { border-color: #3b3b38; background: #292928; }
        .dark-theme .guest-tool > p:not(.eyebrow):not(.guest-error) { color: #b0b0aa; }
        .dark-theme .guest-form input, .dark-theme input { border-color: #4a4a46; background: #1c1c1b; color: #f4f4f1; }
        .dark-theme input::placeholder { color: #85857f; }
        .dark-theme .guest-result { border-color: #454541; }
        .dark-theme .guest-result-heading strong { color: #f0f0ec; }
        .dark-theme .guest-metrics, .dark-theme .save-hint, .dark-theme .panel-note, .dark-theme .legal-copy { color: #aaa9a3; }
        .dark-theme .guest-metrics span + span { border-color: #4a4a46; }
        .dark-theme .form-panel { background: #171717; }
        .dark-theme .form-heading > p:last-child, .dark-theme label span { color: #aaa9a3; }
        .dark-theme .register-benefits { border-color: #383835; color: #aaa9a3; }
        .dark-theme .benefits-title { color: #f0f0ec; }
        .dark-theme .mode-switch { background: #242422; }
        .dark-theme .mode-switch button { color: #aaa9a3; }
        .dark-theme .mode-switch button.active { background: #333330; color: #fff; }
        .dark-theme .feedback { background: #321c1c; border-color: #693b3b; color: #ffc4c4; }
        .dark-theme .feedback.success { background: #26331d; border-color: #52683b; color: #d8edbd; }
        .dark-theme .feedback span { color: #c9c4bb; }
        .dark-theme .theme-switch { border-color: #454541; background: #181817; }
        .dark-theme .theme-switch button { color: #aaa9a3; }
        .dark-theme .theme-switch button.active { background: #333330; color: #fff; }
        @keyframes pulse { 0%, 100% { opacity: .45; transform: scaleY(.7); } 50% { opacity: 1; transform: scaleY(1); } }
        @media (max-width: 820px) { .auth-shell { display: block; } .intro-panel { min-height: auto; padding: 28px 24px 42px; border-right: 0; border-bottom: 1px solid #262020; } .intro-panel .eyebrow { margin-top: 56px; } h1 { font-size: clamp(45px, 13vw, 72px); } .signal-line { margin-top: 28px; } .form-panel { padding: 48px 24px 60px; } }
        @media (max-width: 460px) { .guest-form { grid-template-columns: 1fr; } .guest-form button { min-height: 42px; } .guest-metrics { gap: 8px; font-size: 10px; } .guest-metrics span + span { padding-left: 8px; } }
      `}</style>
    </main>
  );
}