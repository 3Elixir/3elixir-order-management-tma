import { appRouter } from "~/server/api/root";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";

interface ProcedureInfo {
  path: string;
  router: string;
  name: string;
  type: "query" | "mutation";
  inputSchema: Record<string, unknown> | null;
}

let cachedRegistry: ProcedureInfo[] | null = null;

function buildRegistry(): ProcedureInfo[] {
  const procedures: ProcedureInfo[] = [];
  const routerDef = appRouter._def;

  // tRPC v11 exposes procedures as a flat record keyed by "router.procedure"
  const procedureMap = routerDef.procedures as Record<string, unknown>;

  for (const [fullPath, procedure] of Object.entries(procedureMap)) {
    const parts = fullPath.split(".");
    const routerName = parts.slice(0, -1).join(".");
    const procedureName = parts[parts.length - 1]!;

    const proc = procedure as {
      _def: {
        type: "query" | "mutation";
        inputs: ZodTypeAny[];
      };
    };

    // Extract type
    const type = proc._def.type;

    // Extract and merge input schemas
    let inputSchema: Record<string, unknown> | null = null;
    const inputs = proc._def.inputs;
    if (inputs && inputs.length > 0) {
      // tRPC may have multiple input schemas (from .input() chains)
      // For a single input, just convert it directly
      // For multiple, they are merged via intersection
      if (inputs.length === 1) {
        inputSchema = zodToJsonSchema(inputs[0]!) as Record<string, unknown>;
      } else {
        // Multiple .input() calls create a merged/intersection schema
        // Convert each and present them as allOf
        const schemas = inputs.map(
          (s) => zodToJsonSchema(s) as Record<string, unknown>,
        );
        inputSchema = { allOf: schemas };
      }
    }

    procedures.push({
      path: fullPath,
      router: routerName,
      name: procedureName,
      type,
      inputSchema,
    });
  }

  // Sort by path for consistent output
  procedures.sort((a, b) => a.path.localeCompare(b.path));
  return procedures;
}

export function getRegistry(): { procedures: ProcedureInfo[] } {
  if (!cachedRegistry) {
    cachedRegistry = buildRegistry();
  }
  return { procedures: cachedRegistry };
}

export function getSchemaForProcedure(
  path: string,
): ProcedureInfo | { ok: false; error: { code: string; message: string } } {
  const { procedures } = getRegistry();
  const proc = procedures.find((p) => p.path === path);
  if (!proc) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: `Procedure "${path}" not found. Use "list" to see available procedures.`,
      },
    };
  }
  return proc;
}
