import { createHash } from "node:crypto";

export function splitFor(jobId: number): "dev" | "test" {
  return createHash("md5").update(String(jobId)).digest().readUInt32BE(0) % 4 === 0 ? "test" : "dev";
}
