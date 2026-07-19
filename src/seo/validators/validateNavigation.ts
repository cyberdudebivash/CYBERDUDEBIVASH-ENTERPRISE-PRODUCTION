import { PRIMARY_NAVIGATION, FOOTER_NAVIGATION } from "../config";
import type { SEONavigationNode } from "../types";
import { findDuplicates, issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// Validates the navigation trees as data. Flattens each tree recursively
// so duplicate-id checking sees every descendant, not just top-level
// nodes. Duplicate `path` is checked WITHIN each tree only — primary and
// footer nav intentionally mirror many of the same paths (e.g. both link
// to /apps.html), which is correct, expected structure, not a bug; a path
// repeated twice inside the *same* tree would be.

function flatten(nodes: readonly SEONavigationNode[]): SEONavigationNode[] {
  const result: SEONavigationNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) result.push(...flatten(node.children));
  }
  return result;
}

export interface NavigationInput {
  primary?: readonly SEONavigationNode[];
  footer?: readonly SEONavigationNode[];
}

export function validateNavigation(input: NavigationInput = {}): ValidationResult {
  const primary = input.primary ?? PRIMARY_NAVIGATION;
  const footer = input.footer ?? FOOTER_NAVIGATION;
  const issues: ValidationIssue[] = [];

  const allNodes = [...flatten(primary), ...flatten(footer)];
  for (const [id, group] of findDuplicates(allNodes, (n) => n.id)) {
    issues.push(issue("error", "NAV_DUPLICATE_ID", `${group.length} navigation nodes share id "${id}"`, id));
  }

  for (const [treeName, nodes] of [
    ["primary", flatten(primary)],
    ["footer", flatten(footer)],
  ] as const) {
    for (const [path, group] of findDuplicates(nodes, (n) => n.path)) {
      issues.push(
        issue("error", "NAV_DUPLICATE_PATH_IN_TREE", `${group.length} nodes in the ${treeName} tree share path "${path}"`, group.map((n) => n.id).join(", ")),
      );
    }
  }

  for (const node of allNodes) {
    const isLeaf = !node.children || node.children.length === 0;
    if (isLeaf && !node.path) {
      issues.push(issue("warning", "NAV_LEAF_NO_PATH", `Navigation leaf "${node.id}" ("${node.label}") has neither a path nor children`, node.id));
    }
  }

  return makeResult("validateNavigation", issues);
}
