import { useState } from 'react';

interface MonitorData {
  url: string;
  status: 'UP' | 'DOWN';
  stability: string;
  metrics: {
    packetLoss: string;
    avgLatency: string | null;
  };
}

export default function MonitorsPage() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonitorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dispara o POST para configurar e testar
  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro na requisição');

      setData(json);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Dispara o GET para checar o status atual do alvo ativo
  async function handleRefreshGet() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/monitors', { method: 'GET' });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Erro na consulta');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Painel AliveMonitor</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>Configure um alvo e meça latência e estabilidade TCP.</p>

      {/* Formulário POST */}
      <form onSubmit={handlePost} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Ex: www.google.com"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '0.95rem'
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 16px',
            backgroundColor: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}
        >
          {loading ? 'Pingando...' : 'Salvar & Ping'}
        </button>
      </form>

      {/* Botão de atualização manual via GET */}
      <button
        onClick={handleRefreshGet}
        disabled={loading}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '24px',
          fontSize: '0.9rem'
        }}
      >
        🔄 Atualizar Status Atual (GET)
      </button>

      {/* Feedback de Erro */}
      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Card de Resultados */}
      {data && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fafafa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{data.url}</span>
            <span style={{
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: data.status === 'UP' ? '#dcfce7' : '#fee2e2',
              color: data.status === 'UP' ? '#15803d' : '#b91c1c'
            }}>
              {data.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #eee' }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Estabilidade</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{data.stability}</p>
            </div>

            <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #eee' }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Latência Média</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{data.metrics?.avgLatency || '—'}</p>
            </div>

            <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #eee' }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Perda de Pacotes</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{data.metrics?.packetLoss}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}