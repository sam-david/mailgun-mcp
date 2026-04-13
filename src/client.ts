const DEFAULT_BASE_URL = "https://api.mailgun.net";

export class MailgunInspectClient {
  private authHeader: string;
  private baseUrl: string;

  constructor(apiKey: string, region: string = "us") {
    const encoded = Buffer.from(`api:${apiKey}`).toString("base64");
    this.authHeader = `Basic ${encoded}`;
    this.baseUrl =
      region === "eu" ? "https://api.eu.mailgun.net" : DEFAULT_BASE_URL;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    contentType?: string
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };
    if (body !== undefined && !contentType) {
      headers["Content-Type"] = "application/json";
    }
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `Mailgun Inspect API returned non-JSON response (${res.status}): ${text.slice(0, 500)}`
      );
    }

    if (!res.ok) {
      const msg =
        typeof json === "object" && json !== null && "error" in json
          ? JSON.stringify((json as { error: unknown }).error)
          : typeof json === "object" && json !== null && "message" in json
            ? String((json as { message: unknown }).message)
            : text.slice(0, 500);
      throw new Error(`Mailgun Inspect API error (${res.status}): ${msg}`);
    }

    return json;
  }

  get(path: string): Promise<unknown> {
    return this.request("GET", path);
  }

  post(path: string, body?: unknown): Promise<unknown> {
    return this.request("POST", path, body);
  }

  put(path: string, body?: unknown): Promise<unknown> {
    return this.request("PUT", path, body);
  }

  delete(path: string): Promise<unknown> {
    return this.request("DELETE", path);
  }
}
