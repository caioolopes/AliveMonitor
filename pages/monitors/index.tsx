import { FormEvent, useEffect, useRef, useState } from "react";

type PingLog = {
  id: string;
  isUp: boolean;
  latencyMs: number;
  createdAt: string;
};

type MonitorTarget = {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  isActive: boolean;
  logs: PingLog[];
};

type ApiResponse = {
  targets?: MonitorTarget[];
  error?: string;
};

type Theme = "light" | "dark";

export default function MonitorsPage() {
  const [targets, setTargets] = useState<MonitorTarget[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MonitorTarget | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("alivemonitor-theme");

    if (savedTheme === "dark") {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("alivemonitor-theme", theme);
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  async function loadTargets(showLoading = false) {
    if (refreshingRef.current) {
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setRefreshing(true);
    refreshingRef.current = true;
    setError("");

    try {
      const response = await fetch("/api/v1/monitors", { cache: "no-store" });
      const body = (await response.json()) as ApiResponse;

      if (response.status === 401 || response.status === 403) {
        window.location.assign("/");
        return;
      }

      if (!response.ok) {
        throw new Error(body.error || "Não foi possível carregar seus monitores.");
      }

      setTargets(body.targets || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar seus monitores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      refreshingRef.current = false;
    }
  }

  useEffect(() => {
    void loadTargets(true);

    const monitorInterval = window.setInterval(() => {
      void loadTargets();
    }, 30000);

    return () => window.clearInterval(monitorInterval);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/v1/monitors", {
        method: editingTargetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, id: editingTargetId }),
      });
      const body = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(body.error || "Não foi possível salvar este monitor.");
      }

      setName("");
      setUrl("");
      setEditingTargetId(null);
      setNotice(editingTargetId ? "Monitor atualizado com sucesso." : "Monitor salvo e testado com sucesso.");
      await loadTargets();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar este monitor.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(target: MonitorTarget) {
    setEditingTargetId(target.id);
    setName(target.name);
    setUrl(target.url);
    setError("");
    setNotice("");
  }

  function cancelEdit() {
    setEditingTargetId(null);
    setName("");
    setUrl("");
  }

  async function handleDelete(target: MonitorTarget) {
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/v1/monitors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      const body = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(body.error || "Não foi possível apagar este monitor.");
      }

      if (editingTargetId === target.id) {
        cancelEdit();
      }
      setNotice("Monitor apagado com sucesso.");
      setDeleteTarget(null);
      await loadTargets();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível apagar este monitor.");
    }
  }

  async function handleLogout() {
    await fetch("/api/v1/sessions", { method: "DELETE" });
    window.location.assign("/");
  }

  return (
    <main className={`monitor-page ${theme === "dark" ? "dark" : ""}`}>
      <header className="monitor-header">
        <div>
          <p className="eyebrow">ALIVEMONITOR / PAINEL</p>
          <h1>Seus monitores.</h1>
          <p className="subtitle">URLs salvas, testes recentes e a saúde dos seus serviços em um só lugar.</p>
        </div>
        <div className="header-actions">
          <div className="theme-switch" aria-label="Escolher tema">
            <button className={theme === "light" ? "active" : ""} type="button" onClick={() => setTheme("light")} aria-pressed={theme === "light"}>
              Claro
            </button>
            <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>
              Escuro
            </button>
          </div>
          <button type="button" onClick={() => void loadTargets()} disabled={loading || refreshing}>
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <button type="button" onClick={() => void handleLogout()}>Sair</button>
        </div>
      </header>

      <section className="monitor-layout">
        <form className="new-monitor" onSubmit={handleSubmit}>
          <p className="eyebrow">{editingTargetId ? "EDITAR MONITOR" : "NOVO MONITOR"}</p>
          <h2>{editingTargetId ? "Atualize os dados do serviço." : "Adicione uma URL para acompanhar."}</h2>
          <label>
            <span>Nome do serviço</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Minha API" />
          </label>
          <label>
            <span>URL ou domínio</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="api.exemplo.com" required />
          </label>
          <button className="primary-action" type="submit" disabled={saving}>
            {saving ? "Salvando..." : editingTargetId ? "Salvar alterações" : "Salvar e testar"}
            <span aria-hidden="true">↗</span>
          </button>
          {editingTargetId && <button className="cancel-action" type="button" onClick={cancelEdit}>Cancelar edição</button>}
          <p className="form-note">O primeiro resultado é registrado no cadastro e um novo teste acontece a cada 30 segundos.</p>
        </form>

        <section className="results-section" aria-live="polite">
          <div className="results-heading">
            <div>
              <p className="eyebrow">RESULTADOS SALVOS</p>
              <h2>{targets.length} {targets.length === 1 ? "serviço" : "serviços"}</h2>
            </div>
            <span className="live-mark"><i /> sessão ativa</span>
          </div>

          {notice && <p className="notice">{notice}</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
          {loading && <p className="empty-state">Carregando seus monitores...</p>}
          {!loading && !error && targets.length === 0 && (
            <p className="empty-state">Nenhuma URL salva ainda. O primeiro teste começa ao lado.</p>
          )}
          {!loading && targets.length > 0 && (
            <div className="target-list">
              {targets.map((target) => {
                const latestLog = target.logs[0];
                const isUp = latestLog?.isUp === true;

                return (
                  <article className="target-card" key={target.id}>
                    <div className="target-card-top">
                      <div>
                        <h3>{target.name}</h3>
                        <a href={`https://${target.url}`} target="_blank" rel="noreferrer">{target.url} ↗</a>
                      </div>
                      <span className={`status-pill ${isUp ? "up" : "down"}`}>
                        <i /> {latestLog ? (isUp ? "ONLINE" : "FORA DO AR") : "SEM TESTE"}
                      </span>
                      <div className="target-actions">
                        <button type="button" title="Editar monitor" aria-label={`Editar ${target.name}`} onClick={() => handleEdit(target)}>✎</button>
                        <button type="button" title="Apagar monitor" aria-label={`Apagar ${target.name}`} onClick={() => setDeleteTarget(target)}>×</button>
                      </div>
                    </div>
                    <div className="metrics">
                      <span><b>{latestLog?.latencyMs || "-"}</b> ms latência</span>
                      <span><b>{latestLog ? (isUp ? "0" : "100") : "-"}%</b> perda</span>
                      <span>{latestLog ? new Date(latestLog.createdAt).toLocaleString("pt-BR") : "Sem resultado"}</span>
                    </div>
                    <div className="stability-heading">
                      <span>Estabilidade recente</span>
                      <span>{target.logs.filter((log) => log.isUp).length}/{target.logs.length || 0} testes OK</span>
                    </div>
                    <div className="stability-chart" aria-label="Gráfico de linha da estabilidade dos últimos testes">
                      {target.logs.length === 0 && <span className="chart-empty">Aguardando o primeiro teste</span>}
                      {target.logs.length > 0 && (
                        <svg viewBox="0 0 240 56" role="img" aria-label={`Estabilidade de ${target.name}`}>
                          <line className="chart-guide" x1="0" y1="8" x2="240" y2="8" />
                          <line className="chart-guide" x1="0" y1="28" x2="240" y2="28" />
                          <line className="chart-guide" x1="0" y1="48" x2="240" y2="48" />
                          <polyline
                            className="stability-line"
                            points={target.logs.slice().reverse().map((log, logIndex, orderedLogs) => {
                              const chartX = orderedLogs.length === 1 ? 120 : (logIndex / (orderedLogs.length - 1)) * 240;
                              const chartY = log.isUp ? 8 : 48;
                              return `${chartX},${chartY}`;
                            }).join(" ")}
                          />
                          {target.logs.slice().reverse().map((log, logIndex, orderedLogs) => {
                            const chartX = orderedLogs.length === 1 ? 120 : (logIndex / (orderedLogs.length - 1)) * 240;
                            const chartY = log.isUp ? 8 : 48;
                            return <circle className={log.isUp ? "chart-point up" : "chart-point down"} cx={chartX} cy={chartY} r="3" key={log.id} />;
                          })}
                        </svg>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">REMOVER MONITOR</p>
            <h2 id="delete-title">Apagar {deleteTarget.name}?</h2>
            <p>O histórico de testes dessa URL também será removido. Essa ação não pode ser desfeita.</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="delete-action" type="button" onClick={() => void handleDelete(deleteTarget)}>Apagar monitor</button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .monitor-page { --background: #f5f3f1; --surface: #fffafa; --text: #171515; --muted: #746c6c; --line: #ddd3d3; --accent: #c52d32; --accent-dark: #9f1e24; --soft-accent: #f8e5e5; min-height: 100vh; padding: 56px clamp(24px, 7vw, 110px) 80px; color: var(--text); background: var(--background); font-family: Georgia, serif; transition: color .2s ease, background .2s ease; }
        .monitor-page.dark { --background: #0f0e0e; --surface: #1a1717; --text: #f8f1f1; --muted: #b9aaaa; --line: #443333; --accent: #ef4a4f; --accent-dark: #ff6a6e; --soft-accent: #351c1d; }
        .monitor-header { display: flex; justify-content: space-between; gap: 32px; align-items: end; max-width: 1180px; margin: 0 auto 58px; }
        .eyebrow { margin: 0 0 14px; color: var(--accent); font: 700 10px/1.2 Arial, sans-serif; letter-spacing: .14em; }
        h1, h2, h3, p { margin-top: 0; }
        h1 { max-width: 700px; margin-bottom: 12px; font-size: clamp(46px, 7vw, 88px); font-weight: 400; line-height: .94; letter-spacing: -0.03em; }
        h2 { margin-bottom: 24px; font-size: 28px; font-weight: 400; line-height: 1.05; }
        h3 { margin-bottom: 8px; font-size: 22px; font-weight: 400; }
        .subtitle { max-width: 500px; margin-bottom: 0; color: var(--muted); font: 15px/1.6 Arial, sans-serif; }
        .header-actions { display: flex; gap: 10px; }
        button { border: 1px solid var(--line); border-radius: 3px; padding: 11px 15px; color: var(--text); background: transparent; font: 700 11px Arial, sans-serif; cursor: pointer; }
        button:disabled { cursor: wait; opacity: .55; }
        .theme-switch { display: flex; gap: 3px; padding: 3px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); }
        .theme-switch button { border: 0; padding: 8px 9px; color: var(--muted); }
        .theme-switch button.active { color: #fff; background: var(--accent); }
        .monitor-layout { display: grid; grid-template-columns: minmax(280px, .72fr) minmax(0, 1.28fr); gap: clamp(38px, 7vw, 100px); max-width: 1180px; margin: 0 auto; }
        .new-monitor { align-self: start; padding: 28px; border: 1px solid var(--line); background: var(--surface); }
        label { display: block; margin: 18px 0; }
        label span { display: block; margin-bottom: 8px; color: var(--muted); font: 700 11px Arial, sans-serif; }
        input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 2px; padding: 13px 12px; color: var(--text); background: var(--background); font: 14px Arial, sans-serif; }
        input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .primary-action { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 25px; border-color: var(--accent); color: #fff; background: var(--accent); }
        .form-note { margin: 18px 0 0; color: var(--muted); font: 11px/1.5 Arial, sans-serif; }
        .results-heading { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid var(--line); }
        .results-heading h2 { margin-bottom: 18px; }
        .live-mark { color: var(--accent); font: 700 10px Arial, sans-serif; letter-spacing: .06em; text-transform: uppercase; }
        .live-mark i, .status-pill i { display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; background: currentColor; }
        .notice, .error-message, .empty-state { padding: 15px; color: var(--accent-dark); background: var(--soft-accent); font: 13px/1.5 Arial, sans-serif; }
        .error-message { color: var(--accent-dark); }
        .empty-state { color: var(--muted); background: transparent; border-bottom: 1px solid var(--line); }
        .target-list { display: grid; gap: 12px; padding-top: 18px; }
        .target-card { padding: 22px 0; border-bottom: 1px solid var(--line); }
        .target-card-top { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
        .target-card a { color: var(--accent-dark); font: 12px Arial, sans-serif; text-decoration: none; }
        .status-pill { white-space: nowrap; padding-top: 5px; color: var(--accent); font: 700 10px Arial, sans-serif; letter-spacing: .06em; }
        .status-pill.down { color: var(--muted); }
        .target-actions { display: flex; gap: 4px; }
        .target-actions button { width: 32px; height: 32px; padding: 0; color: var(--accent); font-size: 18px; line-height: 1; }
        .target-actions button:last-child { color: var(--muted); font-size: 22px; }
        .cancel-action { width: 100%; margin-top: 8px; }
        .dialog-backdrop { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; padding: 24px; background: #00000099; }
        .delete-dialog { width: min(100%, 420px); padding: 30px; color: var(--text); background: var(--surface); box-shadow: 0 20px 60px #00000044; }
        .delete-dialog h2 { margin-bottom: 12px; }
        .delete-dialog > p:not(.eyebrow) { color: var(--muted); font: 13px/1.6 Arial, sans-serif; }
        .dialog-actions { display: flex; justify-content: end; gap: 10px; margin-top: 26px; }
        .delete-action { border-color: var(--accent); color: #fff; background: var(--accent); }
        .metrics { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 24px; color: var(--muted); font: 11px Arial, sans-serif; }
        .metrics b { color: var(--text); font-size: 15px; font-weight: 400; }
        .stability-heading { display: flex; justify-content: space-between; gap: 16px; margin-top: 25px; color: var(--muted); font: 10px Arial, sans-serif; text-transform: uppercase; letter-spacing: .06em; }
        .stability-chart { min-height: 56px; margin-top: 10px; padding: 8px 0 0; border-top: 1px solid var(--line); }
        .stability-chart svg { display: block; width: 100%; height: 56px; overflow: visible; }
        .chart-guide { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 3; }
        .stability-line { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .chart-point { fill: var(--accent); stroke: var(--surface); stroke-width: 1.5; }
        .chart-point.down { fill: var(--text); }
        .chart-empty { color: var(--muted); font: 11px Arial, sans-serif; }
        @media (max-width: 760px) { .monitor-page { padding: 32px 20px 54px; } .monitor-header { display: block; margin-bottom: 38px; } .header-actions { margin-top: 24px; flex-wrap: wrap; } .monitor-layout { display: block; } .new-monitor { margin-bottom: 54px; } .target-card-top { display: block; } .status-pill { display: block; margin-top: 16px; } .target-actions { margin-top: 12px; } }
      `}</style>
    </main>
  );
}
