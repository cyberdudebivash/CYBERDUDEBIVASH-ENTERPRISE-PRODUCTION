import { PRODUCTS } from "../../config";
import { buildSoftwareApplication } from "../builders/softwareApplicationBuilder";
import type { SoftwareApplicationSchemaNode } from "../types/nodes";

// productEntity — resolves a PRODUCTS id (as used in
// SEOPage.relatedEntityIds and knowledge-graph.config.ts) directly to
// its generated schema node, for callers that only have an id, not the
// full SEOProduct object (e.g. a future Phase 1.3 internal-linking
// consumer walking relatedEntityIds).

export function resolveProductSchema(id: string): SoftwareApplicationSchemaNode | undefined {
  const product = PRODUCTS.find((p) => p.id === id);
  return product ? buildSoftwareApplication(product) : undefined;
}
