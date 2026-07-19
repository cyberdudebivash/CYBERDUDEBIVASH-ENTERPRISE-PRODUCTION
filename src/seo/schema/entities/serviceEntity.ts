import { SERVICES } from "../../config";
import { buildService } from "../builders/serviceBuilder";
import type { ServiceSchemaNode } from "../types/nodes";

export function resolveServiceSchema(id: string): ServiceSchemaNode | undefined {
  const service = SERVICES.find((s) => s.id === id);
  return service ? buildService(service) : undefined;
}
