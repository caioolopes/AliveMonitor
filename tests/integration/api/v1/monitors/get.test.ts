import { describe, test, expect } from "vitest";

describe("Fluxo Monitor sem histórico", () => {
  test("configura url no POST e consulta o status atual no GET", async () => {
    const response = await fetch("http://localhost:3000/api/v1/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "www.youtube.com",
      }),
    });

    expect(response.status).toBe(200);

   
    const getRes = await fetch("http://localhost:3000/api/v1/monitors", {
      method: "GET",
    });

    expect(getRes.status).toBe(200);

    const data = await getRes.json();
    console.log("Resultado do GET:", data);

    expect(data.status).toBe("UP");
    expect(data.metrics).toBeDefined();
    expect(data.url).toBe("www.youtube.com");
  });
});