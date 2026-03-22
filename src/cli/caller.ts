import { createCaller } from "~/server/api/root";
import { db } from "~/server/db";

export function getCaller() {
  return createCaller({ db });
}
