import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";

// Integration tests that run the actual CLI as a subprocess
// These test the full pipeline: arg parsing → routing → output formatting

const ENV_VARS = [
  "DATABASE_URL=postgresql://localhost:5432/test",
  "DIRECT_URL=postgresql://localhost:5432/test",
  "STRAPI_API_URL=https://strapi.example.com",
  "STRAPI_API_TOKEN=test-token",
  "TELEGRAM_BOT_TOKEN=test-bot-token",
  "TELEGRAM_CHANNEL_ID=test-channel-id",
].join(" ");

function runCli(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`${ENV_VARS} npx tsx src/cli/index.ts ${args}`, {
      encoding: "utf-8",
      timeout: 30000,
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://localhost:5432/test",
        DIRECT_URL: "postgresql://localhost:5432/test",
        STRAPI_API_URL: "https://strapi.example.com",
        STRAPI_API_TOKEN: "test-token",
        TELEGRAM_BOT_TOKEN: "test-bot-token",
        TELEGRAM_CHANNEL_ID: "test-channel-id",
      },
    });
    return { stdout: stdout.trim(), exitCode: 0 };
  } catch (err: unknown) {
    const error = err as { stdout?: string; status?: number };
    return {
      stdout: (error.stdout ?? "").trim(),
      exitCode: error.status ?? 1,
    };
  }
}

function parseOutput(stdout: string): unknown {
  // The CLI output may have pnpm script header lines; take the last line that's valid JSON
  const lines = stdout.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]!);
    } catch {
      continue;
    }
  }
  throw new Error(`No valid JSON in output: ${stdout}`);
}

describe("CLI integration", () => {
  describe("help command", () => {
    it("returns usage info", () => {
      const { stdout, exitCode } = runCli("help");
      const output = parseOutput(stdout) as Record<string, unknown>;
      expect(exitCode).toBe(0);
      expect(output.ok).toBe(true);
      expect(output).toHaveProperty("usage");
    });

    it("returns usage for --help flag", () => {
      const { stdout, exitCode } = runCli("--help");
      const output = parseOutput(stdout) as Record<string, unknown>;
      expect(exitCode).toBe(0);
      expect(output.ok).toBe(true);
    });

    it("returns usage when no command given", () => {
      const { stdout, exitCode } = runCli("");
      const output = parseOutput(stdout) as Record<string, unknown>;
      expect(exitCode).toBe(0);
      expect(output.ok).toBe(true);
    });
  });

  describe("list command", () => {
    it("returns all procedures", () => {
      const { stdout, exitCode } = runCli("list");
      const output = parseOutput(stdout) as {
        procedures: Array<{ path: string; type: string }>;
      };
      expect(exitCode).toBe(0);
      expect(output.procedures.length).toBe(40);
    });

    it("each procedure has required fields", () => {
      const { stdout } = runCli("list");
      const output = parseOutput(stdout) as {
        procedures: Array<Record<string, unknown>>;
      };
      for (const proc of output.procedures) {
        expect(proc).toHaveProperty("path");
        expect(proc).toHaveProperty("router");
        expect(proc).toHaveProperty("name");
        expect(proc).toHaveProperty("type");
        expect(proc).toHaveProperty("inputSchema");
        expect(["query", "mutation"]).toContain(proc.type);
      }
    });
  });

  describe("schema command", () => {
    it("returns schema for valid procedure", () => {
      const { stdout, exitCode } = runCli("schema order.getOrderDetails");
      const output = parseOutput(stdout) as Record<string, unknown>;
      expect(exitCode).toBe(0);
      expect(output.path).toBe("order.getOrderDetails");
      expect(output.type).toBe("query");
      expect(output.inputSchema).toBeDefined();
    });

    it("returns error for invalid procedure", () => {
      const { stdout, exitCode } = runCli("schema nonexistent.proc");
      const output = parseOutput(stdout) as {
        ok: boolean;
        error: { code: string };
      };
      expect(exitCode).toBe(0); // schema returns error in body, not exit code
      expect(output.ok).toBe(false);
      expect(output.error.code).toBe("NOT_FOUND");
    });

    it("returns error when path is missing", () => {
      const { stdout, exitCode } = runCli("schema");
      const output = parseOutput(stdout) as {
        ok: boolean;
        error: { code: string };
      };
      expect(exitCode).toBe(1);
      expect(output.ok).toBe(false);
      expect(output.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("unknown command", () => {
    it("returns error for unknown command", () => {
      const { stdout, exitCode } = runCli("foobar");
      const output = parseOutput(stdout) as {
        ok: boolean;
        error: { code: string; message: string };
      };
      expect(exitCode).toBe(1);
      expect(output.ok).toBe(false);
      expect(output.error.code).toBe("BAD_REQUEST");
      expect(output.error.message).toContain("foobar");
    });
  });

  describe("call command", () => {
    it("returns error when path is missing", () => {
      const { stdout, exitCode } = runCli("call");
      const output = parseOutput(stdout) as {
        ok: boolean;
        error: { code: string };
      };
      expect(exitCode).toBe(1);
      expect(output.ok).toBe(false);
    });

    it("returns error for non-existent procedure", () => {
      const { stdout, exitCode } = runCli("call fake.procedure");
      const output = parseOutput(stdout) as {
        ok: boolean;
        error: { message: string };
      };
      expect(exitCode).toBe(1);
      expect(output.ok).toBe(false);
      expect(output.error.message).toContain("not found");
    });
  });
});
