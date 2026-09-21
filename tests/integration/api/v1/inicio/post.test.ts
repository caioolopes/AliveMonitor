import { describe, expect, test } from "vitest";

describe("POST inicio", () => {
  describe("url parameter", () => {
    test("url is provided in the request body", async () => {
      const response = await fetch("http://localhost:3000/api/v1/inicial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "www.youtube.com",
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("UP");
      expect(data.url).toBe("www.youtube.com");
      expect(data.metrics).toBeDefined();
    });

    test("url is required", async () => {
      const response = await fetch("http://localhost:3000/api/v1/inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Parâmetro `url` é obrigatório" });
    });
  });
});