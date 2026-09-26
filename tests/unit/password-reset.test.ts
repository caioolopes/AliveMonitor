import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSmtpConfiguration: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  hashCode: vi.fn(),
  createForEmail: vi.fn(),
  deleteByHash: vi.fn(),
  consume: vi.fn(),
  hashPassword: vi.fn(),
}));

// Mockeia banco e SMTP para testar os handlers sem apagar ou alterar dados locais.
vi.mock("../../infra/email", () => ({
  default: {
    getSmtpConfiguration: mocks.getSmtpConfiguration,
    sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  },
}));

vi.mock("../../models/password-reset", () => ({
  default: {
    hashCode: mocks.hashCode,
    createForEmail: mocks.createForEmail,
    deleteByHash: mocks.deleteByHash,
    consume: mocks.consume,
  },
}));

vi.mock("../../models/password", () => ({
  default: { hash: mocks.hashPassword },
}));

import forgotPassword from "../../pages/api/v1/password/forgot";
import resetPassword from "../../pages/api/v1/password/reset";

interface MockRequest {
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
}

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(statusCode: number): MockResponse;
  json(body: unknown): MockResponse;
}

type ApiRoute = (request: MockRequest, response: MockResponse) => Promise<unknown>;

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function callRoute(route: unknown, body: unknown) {
  const request = { method: "POST", url: "/", body, headers: {} };
  const response = createResponse();
  await (route as ApiRoute)(request, response);
  return response;
}

describe("Recuperação de senha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mocks.getSmtpConfiguration.mockReturnValue(null);
    mocks.hashCode.mockReturnValue("hashed-code");
    mocks.createForEmail.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.consume.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("envia um código de seis dígitos por email quando SMTP está configurado", async () => {
    const smtpConfiguration = { host: "smtp.example.test" };
    mocks.getSmtpConfiguration.mockReturnValue(smtpConfiguration);

    const response = await callRoute(forgotPassword, {
      email: "pessoa@example.test",
    });
    const responseBody = response.body as Record<string, unknown>;

    expect(response.statusCode).toBe(200);
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledOnce();
    const [recipient, code, configuration] =
      mocks.sendPasswordResetEmail.mock.calls[0];
    expect(recipient).toBe("pessoa@example.test");
    expect(code).toMatch(/^\d{6}$/);
    expect(configuration).toBe(smtpConfiguration);
    expect(responseBody).not.toHaveProperty("developmentCode");
    expect(mocks.createForEmail).toHaveBeenCalledWith(
      "pessoa@example.test",
      "hashed-code",
      15,
    );
  });

  it("responde genericamente quando o email não corresponde a uma conta", async () => {
    mocks.createForEmail.mockResolvedValue(false);

    const response = await callRoute(forgotPassword, {
      email: "ausente@example.test",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toHaveProperty("developmentCode");
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("rejeita emails inválidos antes de criar código", async () => {
    const response = await callRoute(forgotPassword, { email: "invalido" });

    expect(response.statusCode).toBe(400);
    expect(mocks.createForEmail).not.toHaveBeenCalled();
  });

  it("atualiza a senha após validar o email e o código", async () => {
    const response = await callRoute(resetPassword, {
      email: "pessoa@example.test",
      code: "012345",
      newPassword: "senha-nova-123",
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.hashCode).toHaveBeenCalledWith("012345");
    expect(mocks.hashPassword).toHaveBeenCalledWith("senha-nova-123");
    expect(mocks.consume).toHaveBeenCalledWith(
      "pessoa@example.test",
      "hashed-code",
      "hashed-password",
    );
  });

  it("rejeita código em formato inválido sem consultar o banco", async () => {
    const response = await callRoute(resetPassword, {
      email: "pessoa@example.test",
      code: "123",
      newPassword: "senha-nova-123",
    });

    expect(response.statusCode).toBe(400);
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it("informa quando o código expirou, foi usado ou excedeu as tentativas", async () => {
    mocks.consume.mockResolvedValue(false);

    const response = await callRoute(resetPassword, {
      email: "pessoa@example.test",
      code: "012345",
      newPassword: "senha-nova-123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      message: "O código é inválido, expirou ou excedeu o limite de tentativas.",
    });
  });
});