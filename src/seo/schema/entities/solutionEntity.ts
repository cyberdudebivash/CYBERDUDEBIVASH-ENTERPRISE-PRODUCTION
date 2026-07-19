import { SOLUTIONS } from "../../config";
import { buildProduct } from "../builders/productBuilder";
import type { ProductSchemaNode } from "../types/nodes";

export function resolveSolutionSchema(id: string): ProductSchemaNode | undefined {
  const solution = SOLUTIONS.find((s) => s.id === id);
  return solution ? buildProduct(solution) : undefined;
}
