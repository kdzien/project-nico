import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CollectionDocument } from "./types.js";

export interface CollectionRepository {
  save(document: CollectionDocument): Promise<string>;
}

export class JsonRepository implements CollectionRepository {
  constructor(private readonly outputPath: string) {}

  async save(document: CollectionDocument): Promise<string> {
    await mkdir(dirname(this.outputPath), { recursive: true });
    const temporaryPath = `${this.outputPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.outputPath);
    return this.outputPath;
  }
}
