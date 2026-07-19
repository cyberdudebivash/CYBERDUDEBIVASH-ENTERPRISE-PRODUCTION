// Owns: the shape of a single internal-link recommendation. The engine
// that walks entities and produces these (Phase 1.3) doesn't exist
// yet — this only defines what one recommendation looks like once it
// does, so nothing downstream has to guess its shape.

export type InternalLinkRelationType =
  | "relatedProduct"
  | "relatedService"
  | "relatedSolution"
  | "relatedArticle"
  | "relatedDocumentation"
  | "relatedDownload"
  | "relatedLearning"
  | "relatedRepository";

export interface InternalLinkDefinition {
  /** The page or entity id this link definition originates from. */
  sourceId: string;
  /** The page or entity id this link points to. */
  targetId: string;
  relationType: InternalLinkRelationType;
  /** Anchor text to render — kept here so link wording stays consistent everywhere this relationship is shown, rather than re-worded ad hoc per placement. */
  anchorText: string;
}
