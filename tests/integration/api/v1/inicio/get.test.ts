import { describe, test, expect } from "vitest";

describe("GET /api/v1/inicial", () => {
  test("não permite consultar o endpoint inicial com GET", async () => {
    const response = await fetch("http://localhost:3000/api/v1/inicial", {
      method: "GET",
    });

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Método não permitido" });
  });
});