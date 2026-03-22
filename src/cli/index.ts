// env-loader MUST be imported first — sets SKIP_ENV_VALIDATION before ~/env is evaluated
import "./env-loader";

import { getRegistry, getSchemaForProcedure } from "./registry";
import { executeProcedure, getProcedureType, parseInput } from "./executor";
import { formatSuccess, formatError } from "./output";

// Redirect console.log to stderr so stdout stays clean JSON
const write = (data: string) => process.stdout.write(data + "\n");
const origLog = console.log;
console.log = (...args: unknown[]) => {
  console.error(...args);
};

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

function printUsage() {
  write(
    JSON.stringify({
      ok: true,
      usage: {
        commands: {
          list: {
            description: "List all available procedures with their input schemas",
            example: "pnpm cli list",
          },
          schema: {
            description: "Get the input schema for a specific procedure",
            example: "pnpm cli schema order.getFilteredOrders",
          },
          call: {
            description: "Call a TRPC procedure",
            examples: [
              "pnpm cli call order.getPaymentMethods",
              'pnpm cli call order.getOrderDetails \'{"orderId":"42"}\'',
              "echo '{...}' | pnpm cli call order.createOrder --stdin",
            ],
          },
        },
      },
    }),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  switch (command) {
    case "list": {
      write(JSON.stringify(getRegistry()));
      break;
    }

    case "schema": {
      const path = args[1];
      if (!path) {
        write(
          JSON.stringify({
            ok: false,
            error: {
              code: "BAD_REQUEST",
              message: 'Missing procedure path. Usage: pnpm cli schema <router.procedure>',
            },
          }),
        );
        process.exit(1);
      }
      write(JSON.stringify(getSchemaForProcedure(path)));
      break;
    }

    case "call": {
      const path = args[1];
      if (!path) {
        write(
          JSON.stringify(
            formatError("unknown", new Error("Missing procedure path. Usage: pnpm cli call <router.procedure> [json-input]")),
          ),
        );
        process.exit(1);
      }

      // Determine input source
      const useStdin = args.includes("--stdin");
      let input: unknown = undefined;

      if (useStdin) {
        const raw = await readStdin();
        if (raw) {
          input = parseInput(raw);
        }
      } else if (args[2] && args[2] !== "--stdin") {
        input = parseInput(args[2]);
      }

      try {
        const result = await executeProcedure(path, input);
        const type = getProcedureType(path) ?? "unknown";
        write(JSON.stringify(formatSuccess(path, type, result)));
      } catch (err) {
        write(JSON.stringify(formatError(path, err)));
        process.exit(1);
      }
      break;
    }

    default: {
      write(
        JSON.stringify({
          ok: false,
          error: {
            code: "BAD_REQUEST",
            message: `Unknown command: "${command}". Available commands: list, schema, call`,
          },
        }),
      );
      process.exit(1);
    }
  }
}

main()
  .catch((err) => {
    write(
      JSON.stringify(formatError("unknown", err)),
    );
    process.exit(1);
  })
  .finally(() => {
    // Restore console.log
    console.log = origLog;
  });
