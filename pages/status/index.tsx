import type { ReactNode } from "react";
import useSWR from "swr";

interface DatabaseDependencies {
  version: string;
  opened_connections: number;
  max_connections: number;
}

interface StatusApiResponse {
  updated_at: string;
  dependencies: {
    database: DatabaseDependencies;
  };
}

async function fetchAPI(key: string): Promise<StatusApiResponse> {
  const response = await fetch(key);

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.statusText}`);
  }

  const responseBody: StatusApiResponse = await response.json();
  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <DatabaseStatus />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR<StatusApiResponse>(
    "/api/v1/status",
    fetchAPI,
    {
      refreshInterval: 2000,
    }
  );

  let updatedAtText = "Carregando...";

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }

  return <div>Última atualização: {updatedAtText}</div>;
}

function DatabaseStatus() {
  const { isLoading, data } = useSWR<StatusApiResponse>(
    "/api/v1/status",
    fetchAPI,
    {
      refreshInterval: 2000,
    }
  );

  let databaseStatusInformation: ReactNode = "Carregando...";

  if (!isLoading && data) {
    databaseStatusInformation = (
      <>
        <div>Versão: {data.dependencies.database.version}</div>
        <div>
          Conexões abertas: {data.dependencies.database.opened_connections}
        </div>
        <div>
          Conexões máximas: {data.dependencies.database.max_connections}
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Database</h2>
      <div>{databaseStatusInformation}</div>
    </>
  );
}