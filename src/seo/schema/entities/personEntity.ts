import { AUTHORS } from "../../config";
import { buildPerson } from "../builders/personBuilder";
import type { PersonSchemaNode } from "../types/nodes";

export function resolvePersonSchema(id: string): PersonSchemaNode | undefined {
  const author = AUTHORS.find((a) => a.id === id);
  return author ? buildPerson(author) : undefined;
}
