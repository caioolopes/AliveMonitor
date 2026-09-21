import setCookieParser from "set-cookie-parser";
import orchestrator from "../../../../orchastrator";
import { beforeAll, describe, expect, test } from "vitest";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

async function createAuthenticatedCookie() {
  const uniqueId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const email = `monitorpost-${uniqueId}@curso.dev`;

  await orchestrator.createUser({
    username: `monitorpost${uniqueId}`,
    email,
    password: "senha123",
  });

  const response = await fetch("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "senha123",
    }),
  });

  expect(response.status).toBe(201);
  return setCookieParser(response, { map: true }).session_id.value;
}

describe("POST /api/v1/monitors", () => {
  test("Anonymous user cannot create a monitor", async () => {
    const response = await fetch("http://localhost:3000/api/v1/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "localhost" }),
    });

    expect(response.status).toBe(401);
  });

  test("Authenticated user cannot create a monitor without a URL", async () => {
    const cookie = await createAuthenticatedCookie();
    const response = await fetch("http://localhost:3000/api/v1/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${cookie}`,
      },
      body: JSON.stringify({ name: "Localhost" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Campo `url` é obrigatório" });
  });

  test("Authenticated user creates a monitor and saves its first result", async () => {
    const cookie = await createAuthenticatedCookie();
    const response = await fetch("http://localhost:3000/api/v1/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${cookie}`,
      },
      body: JSON.stringify({
        name: "Localhost",
        url: "https://localhost/health",
      }),
    });

    expect(response.status).toBe(201);

    const responseBody = await response.json();
    expect(responseBody.message).toBe("Monitor salvo com sucesso");
    expect(responseBody.target.name).toBe("Localhost");
    expect(responseBody.target.url).toBe("localhost");
    expect(responseBody.target.logs).toHaveLength(1);
    expect(responseBody.target.logs[0].isUp).toBe(false);
    expect(responseBody.target.logs[0].latencyMs).toBe(0);
  });
});
