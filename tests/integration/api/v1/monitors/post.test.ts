import { describe, expect, test } from "vitest";

describe("POST /api/v1/monitors", () => {
  describe("url parameter", () => {
    test("url is provided in the request body", async () => {
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

      const data = await response.json();
      expect(data.status).toBe("UP");
      expect(data.url).toBe("www.youtube.com");
    });
  });
});