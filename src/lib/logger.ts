/**
 * logger.ts — Logger profissional para o Painel Admin Choperia 820
 *
 * Características:
 * - Logs estruturados em JSON (searchable, parseable)
 * - Níveis: info | warn | error | fatal
 * - Data masking: nunca loga pinCode, senha, token, apiKey
 * - Contexto: action, userId, component, requestId
 * - Em produção: envia para /api/logs (Sentry, Datadog, etc.)
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error" | "fatal";

export interface LogContext {
  /** Qual ação estava sendo executada (ex: "DELETE_PRODUCT", "ADVANCE_ORDER_STATUS") */
  action?: string;
  /** ID do staff/funcionário logado no momento */
  userId?: string;
  /** Nome do componente React ou módulo onde ocorreu */
  component?: string;
  /** ID da entidade relacionada (orderId, productId, staffId...) */
  resourceId?: string;
  /** Código de erro do Firebase (ex: "permission-denied") */
  errorCode?: string;
  /** Mensagem de erro original */
  errorMessage?: string;
  /** Qualquer dado adicional relevante (não sensível) */
  [key: string]: unknown;
}

// ─── Campos que NUNCA devem aparecer nos logs ─────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "pinCode",
  "pin",
  "password",
  "senha",
  "token",
  "apiKey",
  "api_key",
  "secret",
  "authorization",
  "accessToken",
  "refreshToken",
  "idToken",
  // Dados pessoais (LGPD)
  "cpf",
  "rg",
  "email",
  "userEmail",
  "phone",
  "userPhone",
  "address",        // endereço completo
  "street",
  "neighborhood",
]);

// ─── Sanitização recursiva ────────────────────────────────────────────────────

function sanitize(data: unknown, depth = 0): unknown {
  // Evita loops infinitos em objetos circulares
  if (depth > 5) return "[MAX_DEPTH]";

  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitize(value, depth + 1);
    }
  }
  return sanitized;
}

// ─── Gera um requestId simples para correlação de logs ────────────────────────

let _reqCounter = 0;
export function generateRequestId(): string {
  _reqCounter += 1;
  return `req_${Date.now()}_${_reqCounter}`;
}

// ─── Recupera a sessão do admin (para incluir userId nos logs) ────────────────

function getCurrentUserId(): string | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const session = localStorage.getItem("admin_session");
    if (!session) return undefined;
    const parsed = JSON.parse(session) as { id?: string; name?: string };
    return parsed.id;
  } catch {
    return undefined;
  }
}

// ─── Função central de log ────────────────────────────────────────────────────

function createLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): Record<string, unknown> {
  const { errorCode, errorMessage, action, userId, component, resourceId, ...rest } = context;

  return {
    level: level.toUpperCase(),
    timestamp: new Date().toISOString(),
    message,
    userId: userId ?? getCurrentUserId() ?? "anonymous",
    action: action ?? "UNKNOWN",
    component: component ?? "App",
    ...(resourceId ? { resourceId } : {}),
    ...(errorCode ? { errorCode } : {}),
    ...(errorMessage ? { errorMessage } : {}),
    ...(Object.keys(rest).length > 0 ? { data: sanitize(rest) } : {}),
  };
}

function emit(level: LogLevel, entry: Record<string, unknown>) {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // Em produção: enviar para API Route que repassa ao Sentry/Datadog
    // Não bloqueia a UI (fire-and-forget)
    try {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        keepalive: true,
      }).catch(() => {
        // Ignora erros de rede ao enviar logs — não queremos loops
      });
    } catch {
      // Silencia completamente em prod se fetch falhar
    }
    return;
  }

  // Em desenvolvimento: print colorido no console
  const json = JSON.stringify(entry, null, 2);
  switch (level) {
    case "fatal":
    case "error":
      console.error(json);
      break;
    case "warn":
      console.warn(json);
      break;
    default:
      console.log(json);
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

function log(level: LogLevel, message: string, context: LogContext = {}) {
  try {
    const entry = createLogEntry(level, message, context);
    emit(level, entry);
  } catch {
    // O logger nunca deve quebrar a aplicação
  }
}

/** Logger singleton — use em qualquer componente */
export const logger = {
  /** Operação normal bem-sucedida */
  info: (message: string, context?: LogContext) => log("info", message, context),

  /** Situação anômala mas não crítica (dado faltando, fallback usado) */
  warn: (message: string, context?: LogContext) => log("warn", message, context),

  /** Erro recuperável — operação falhou mas o app continua */
  error: (message: string, context?: LogContext) => log("error", message, context),

  /** Erro irrecuperável — requer atenção imediata */
  fatal: (message: string, context?: LogContext) => log("fatal", message, context),

  /** Helper: extrai informações de um erro FirebaseError ou Error genérico */
  fromError: (err: unknown): Pick<LogContext, "errorCode" | "errorMessage"> => {
    if (!err) return {};
    if (typeof err === "object") {
      const e = err as Record<string, unknown>;
      return {
        errorCode: (e.code as string) ?? undefined,
        errorMessage: (e.message as string) ?? String(err),
      };
    }
    return { errorMessage: String(err) };
  },
};

export default logger;
