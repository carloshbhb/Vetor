import { randomUUID } from "node:crypto";

type JsonRecord = Record<string, unknown>;

export class DigitalMakerAIError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "DigitalMakerAIError";
    this.status = status;
  }
}

function getEndpoint(): string {
  const endpoint = process.env.DMAI_MCP_URL?.trim();
  if (!endpoint) {
    throw new DigitalMakerAIError(
      "Digital Maker AI ainda não está configurado no ambiente Production.",
      503
    );
  }

  try {
    const parsed = new URL(endpoint);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "digitalmaker.ai" ||
      !parsed.pathname.startsWith("/mcp/")
    ) {
      throw new Error("invalid endpoint");
    }
  } catch {
    throw new DigitalMakerAIError(
      "A URL privada do servidor Digital Maker AI está inválida.",
      503
    );
  }

  return endpoint;
}

function parseRpcPayload(raw: string): JsonRecord {
  try {
    return JSON.parse(raw) as JsonRecord;
  } catch {
    const dataLines = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);

    if (dataLines.length) {
      try {
        return JSON.parse(dataLines.join("\n")) as JsonRecord;
      } catch {
        // Fall through to the sanitized protocol error below.
      }
    }

    throw new DigitalMakerAIError(
      "O servidor Digital Maker AI retornou uma resposta que não é JSON-RPC válido."
    );
  }
}

async function rpcRequest(method: string, params?: JsonRecord): Promise<JsonRecord> {
  const endpoint = getEndpoint();
  const requestId = randomUUID();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method,
        ...(params ? { params } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("timeout") || message.includes("aborted")) {
      throw new DigitalMakerAIError(
        "O servidor Digital Maker AI demorou demais para responder. Consulte o status antes de repetir uma geração."
      );
    }
    throw new DigitalMakerAIError(
      "Não foi possível conectar ao servidor Digital Maker AI."
    );
  }

  const raw = await response.text();
  let payload: JsonRecord;
  try {
    payload = parseRpcPayload(raw);
  } catch (error) {
    if (!response.ok) {
      throw new DigitalMakerAIError(
        "Digital Maker AI respondeu com HTTP " + response.status + ".",
        response.status >= 400 && response.status < 500 ? response.status : 502
      );
    }
    throw error;
  }

  if (!response.ok) {
    const status = response.status;
    const messages: Record<number, string> = {
      401: "A chave do Digital Maker AI foi rejeitada ou expirou.",
      402: "Não há minutos de vídeo suficientes no plano Digital Maker AI.",
      403: "O plano Digital Maker AI atual não permite essa ferramenta.",
      429: "A cota mensal ou o limite de chamadas do Digital Maker AI foi atingido.",
    };
    throw new DigitalMakerAIError(
      messages[status] || "Digital Maker AI respondeu com HTTP " + status + ".",
      status
    );
  }

  const rpcError = payload.error as JsonRecord | undefined;
  if (rpcError && typeof rpcError === "object") {
    const message =
      typeof rpcError.message === "string"
        ? rpcError.message.slice(0, 400)
        : "Erro JSON-RPC do Digital Maker AI.";
    throw new DigitalMakerAIError(message, 502);
  }

  const result = payload.result;
  if (!result || typeof result !== "object") {
    throw new DigitalMakerAIError(
      "Digital Maker AI não retornou um resultado válido."
    );
  }

  return result as JsonRecord;
}

export async function digitalMakerListTools(): Promise<JsonRecord[]> {
  const result = await rpcRequest("tools/list");
  return Array.isArray(result.tools)
    ? (result.tools as JsonRecord[])
    : [];
}

export async function digitalMakerCall(
  name: string,
  args: JsonRecord = {}
): Promise<unknown> {
  const result = await rpcRequest("tools/call", {
    name,
    arguments: args,
  });

  if (result.isError === true) {
    const content = Array.isArray(result.content) ? result.content : [];
    const message = content
      .map((item) =>
        item && typeof item === "object" && typeof (item as JsonRecord).text === "string"
          ? String((item as JsonRecord).text)
          : ""
      )
      .filter(Boolean)
      .join("\n")
      .slice(0, 700);
    throw new DigitalMakerAIError(
      message || "A ferramenta " + name + " falhou no Digital Maker AI."
    );
  }

  const structured = result.structuredContent;
  if (structured && typeof structured === "object") return structured;

  const content = Array.isArray(result.content) ? result.content : [];
  const textParts = content
    .map((item) =>
      item && typeof item === "object" && typeof (item as JsonRecord).text === "string"
        ? String((item as JsonRecord).text)
        : ""
    )
    .filter(Boolean);

  if (textParts.length === 1) {
    const text = textParts[0];
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return textParts.length ? textParts.join("\n") : result;
}
