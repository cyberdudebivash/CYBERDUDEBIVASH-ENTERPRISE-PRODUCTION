/**
 * Structured logging (Workstream 8). One JSON line per call to console.log,
 * not because it's pretty in a local terminal, but because Cloudflare's
 * Workers log ingestion (and any future log drain) parses structured JSON,
 * not printf-style strings — the whole point of "structured logging" as a
 * requirement, not just "log more".
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogFields {
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function write(level: LogLevel, message: string, fields: LogFields | undefined): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(baseFields: LogFields = {}): Logger {
  return {
    info: (message, fields) => write("info", message, { ...baseFields, ...fields }),
    warn: (message, fields) => write("warn", message, { ...baseFields, ...fields }),
    error: (message, fields) => write("error", message, { ...baseFields, ...fields }),
  };
}
