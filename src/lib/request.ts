export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readJson(
  request: Request,
  maxBytes = 40000,
): Promise<Record<string, unknown>> {
  if (!request.body) throw new RequestError("Send a JSON request body.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let bodyText = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw new RequestError("This request is too large.", 413);
      }
      bodyText += decoder.decode(value, { stream: true });
    }
    bodyText += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    const result = JSON.parse(bodyText);
    if (!result || typeof result !== "object" || Array.isArray(result))
      throw new Error();
    return result;
  } catch {
    throw new RequestError("Send a valid JSON object.");
  }
}
