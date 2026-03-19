import { getCaller } from "./caller";
import { getRegistry } from "./registry";

// Reviver function to convert ISO date strings to Date objects
function reviveDates(_key: string, value: unknown): unknown {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
  ) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return value;
}

export function parseInput(raw: string): unknown {
  return JSON.parse(raw, reviveDates);
}

export function getProcedureType(path: string): "query" | "mutation" | null {
  const { procedures } = getRegistry();
  const proc = procedures.find((p) => p.path === path);
  return proc?.type ?? null;
}

export async function executeProcedure(
  path: string,
  input: unknown,
): Promise<unknown> {
  // Validate procedure exists
  const { procedures } = getRegistry();
  const proc = procedures.find((p) => p.path === path);
  if (!proc) {
    throw new Error(
      `Procedure "${path}" not found. Use "list" to see available procedures.`,
    );
  }

  const caller = getCaller();

  // Navigate the caller by dotted path
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = caller;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]!];
    if (!current) {
      throw new Error(`Router "${parts.slice(0, i + 1).join(".")}" not found.`);
    }
  }

  const procedureName = parts[parts.length - 1]!;
  const procedureFn = current[procedureName];
  if (typeof procedureFn !== "function") {
    throw new Error(`"${path}" is not a callable procedure.`);
  }

  return await procedureFn(input);
}
