import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";

interface SuccessEnvelope {
  ok: true;
  procedure: string;
  type: string;
  data: unknown;
}

interface ErrorEnvelope {
  ok: false;
  procedure: string;
  error: {
    code: string;
    message: string;
    zodErrors: ReturnType<ZodError["flatten"]> | null;
  };
}

export function formatSuccess(
  procedure: string,
  type: string,
  data: unknown,
): SuccessEnvelope {
  return { ok: true, procedure, type, data };
}

export function formatError(
  procedure: string,
  error: unknown,
): ErrorEnvelope {
  if (error instanceof TRPCError) {
    const zodError =
      error.cause instanceof ZodError ? error.cause.flatten() : null;
    return {
      ok: false,
      procedure,
      error: {
        code: error.code,
        message: error.message,
        zodErrors: zodError,
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      ok: false,
      procedure,
      error: {
        code: "BAD_REQUEST",
        message: "Input validation failed",
        zodErrors: error.flatten(),
      },
    };
  }

  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  return {
    ok: false,
    procedure,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
      zodErrors: null,
    },
  };
}
