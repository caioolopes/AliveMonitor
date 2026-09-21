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
  const email = `monitorget-${uniqueId}@curso.dev`;

  await orchestrator.createUser({
    username: `monitorget${uniqueId}`,
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

describe("GET /api/v1/monitors", () => {
  test("Anonymous user cannot list monitors", async () => {
    const response = await fetch("http://localhost:3000/api/v1/monitors");

    expect(response.status).toBe(401);
  });

  test("Authenticated user receives an empty monitor list", async () => {
    const cookie = await createAuthenticatedCookie();
    const response = await fetch("http://localhost:3000/api/v1/monitors", {
      headers: { Cookie: `session_id=${cookie}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ targets: [] });
  });

  test("Authenticated user receives saved monitors and recent results", async () => {
    const cookie = await createAuthenticatedCookie();
    const createResponse = await fetch("http://localhost:3000/api/v1/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${cookie}`,
      },
      body: JSON.stringify({ name: "Localhost", url: "localhost" }),
    });

    expect(createResponse.status).toBe(201);

    const response = await fetch("http://localhost:3000/api/v1/monitors", {
      headers: { Cookie: `session_id=${cookie}` },
    });
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.targets).toHaveLength(1);
    expect(responseBody.targets[0].name).toBe("Localhost");
    expect(responseBody.targets[0].url).toBe("localhost");
    expect(responseBody.targets[0].logs.length).toBeGreaterThanOrEqual(2);
    expect(responseBody.targets[0].logs[0]).toEqual(
      expect.objectContaining({ isUp: false, latencyMs: 0 }),
    );
  });
});
