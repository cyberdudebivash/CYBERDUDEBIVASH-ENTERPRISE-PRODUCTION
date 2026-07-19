import { issue, makeResult, findDuplicates, isMissing, type ValidationIssue, type ValidationResult } from "../../validators/shared";
import type { SchemaNode, PageSchemaSet } from "../types/nodes";
import type { IdReference } from "../types/common";

// SchemaValidator — every SchemaNode and every composed PageSchemaSet
// is checked here: "no generated schema may bypass validation." Reuses
// Phase 1.0.5's validation primitives (issue/makeResult/findDuplicates/
// isMissing from validators/shared.ts) rather than a second, parallel
// vocabulary — the same reasoning and the same physical isolation
// (lives under src/seo/schema/, not src/seo/validators/) as Phase
// 1.1's MetadataValidator; see documentation/SCHEMA_ENGINE.md's
// Architecture Decisions.

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function isIdReference(value: unknown): value is IdReference {
  return typeof value === "object" && value !== null && typeof (value as IdReference)["@id"] === "string";
}

/** Every field on a node that looks like `{ "@id": string }` — provider/publisher/author/isPartOf/mainEntity across every node type, found generically rather than enumerated per type so a future node type with a new reference field needs no change here. */
function collectReferences(node: SchemaNode): IdReference[] {
  return Object.values(node).filter(isIdReference);
}

export function validateSchemaNode(node: SchemaNode): ValidationResult {
  const issues: ValidationIssue[] = [];
  const location = node["@id"] || node["@type"];

  if (isMissing(node["@type"])) {
    issues.push(issue("error", "SCHEMA_MISSING_TYPE", `A node at "${location}" has no @type`, location));
  }
  if (isMissing(node["@id"])) {
    issues.push(issue("error", "SCHEMA_MISSING_ID", `A "${node["@type"]}" node has no @id`, location));
  } else if (!isAbsoluteUrl(node["@id"].split("#")[0])) {
    issues.push(issue("error", "SCHEMA_ID_NOT_ABSOLUTE", `Node "${location}" has a non-absolute @id`, location));
  }

  switch (node["@type"]) {
    case "Organization":
    case "WebSite":
    case "WebPage":
    case "AboutPage":
    case "ContactPage":
    case "Product":
    case "SoftwareApplication":
    case "LocalBusiness":
      if (isMissing(node.name)) issues.push(issue("error", "SCHEMA_MISSING_NAME", `Node "${location}" (${node["@type"]}) has no name`, location));
      if (!isAbsoluteUrl(node.url)) issues.push(issue("error", "SCHEMA_URL_NOT_ABSOLUTE", `Node "${location}" has a non-absolute url "${node.url}"`, location));
      break;
    case "Person":
      if (isMissing(node.name)) issues.push(issue("error", "SCHEMA_MISSING_NAME", `Node "${location}" (Person) has no name`, location));
      break;
    case "Service":
      if (isMissing(node.name)) issues.push(issue("error", "SCHEMA_MISSING_NAME", `Node "${location}" (Service) has no name`, location));
      if (node.url !== undefined && !isAbsoluteUrl(node.url)) {
        issues.push(issue("error", "SCHEMA_URL_NOT_ABSOLUTE", `Node "${location}" has a non-absolute url "${node.url}"`, location));
      }
      break;
    case "Article":
      if (isMissing(node.headline)) issues.push(issue("error", "SCHEMA_MISSING_HEADLINE", `Article "${location}" has no headline`, location));
      if (!isAbsoluteUrl(node.url)) issues.push(issue("error", "SCHEMA_URL_NOT_ABSOLUTE", `Node "${location}" has a non-absolute url "${node.url}"`, location));
      break;
    case "BreadcrumbList":
      if (isMissing(node.itemListElement)) issues.push(issue("error", "SCHEMA_MISSING_ITEMS", `BreadcrumbList "${location}" has no itemListElement`, location));
      break;
    case "FAQPage":
      if (isMissing(node.mainEntity)) issues.push(issue("error", "SCHEMA_MISSING_ITEMS", `FAQPage "${location}" has no mainEntity`, location));
      break;
  }

  return makeResult("validateSchemaNode", issues);
}

/** Validates a fully composed page graph: every node individually, no duplicate @id, and no dangling @id reference (a provider/publisher/author/etc pointing at a node that isn't actually present in this graph). */
export function validatePageSchemaSet(pageSchemaSet: PageSchemaSet): ValidationResult {
  const issues: ValidationIssue[] = [];
  const graph = pageSchemaSet["@graph"];

  for (const node of graph) {
    issues.push(...validateSchemaNode(node).issues);
  }

  for (const [id, group] of findDuplicates(graph, (node) => node["@id"])) {
    issues.push(issue("error", "SCHEMA_DUPLICATE_ID", `${group.length} nodes share @id "${id}"`, id));
  }

  const knownIds = new Set(graph.map((node) => node["@id"]));
  for (const node of graph) {
    for (const ref of collectReferences(node)) {
      if (!knownIds.has(ref["@id"])) {
        issues.push(
          issue("error", "SCHEMA_UNRESOLVED_REFERENCE", `Node "${node["@id"]}" references "${ref["@id"]}", which is not present in this page's schema set`, node["@id"]),
        );
      }
    }
  }

  return makeResult("validatePageSchemaSet", issues);
}
