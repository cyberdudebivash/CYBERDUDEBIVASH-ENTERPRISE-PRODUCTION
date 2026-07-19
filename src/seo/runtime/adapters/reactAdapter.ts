import { toStaticHtmlHead } from "./staticHtmlAdapter";
import type { SEORuntimeResult } from "../contracts/types";

// reactAdapter — transformation only, reusing staticHtmlAdapter's
// structured head data rather than re-deriving it. Deliberately
// returns plain, serializable props (SEOHeadProps) rather than a JSX
// element: this keeps src/seo/runtime/ free of any dependency on a
// specific head-management library (react-helmet, next/head, React 19
// native <title>/<meta> hoisting, ...), leaving that choice to
// whichever React component a future consumer writes. That component
// spreads/reads these props; it does not belong in this platform.

export interface SEOHeadProps {
  title: string;
  meta: Array<{ name?: string; property?: string; content: string }>;
  link: Array<{ rel: string; href: string; hreflang?: string }>;
  /** Parsed schema graph (not a pre-serialized string), since a React consumer typically wants to control its own `<script type="application/ld+json">` element and serialization point. */
  schema: SEORuntimeResult["schemas"];
}

export function toSEOHeadProps(result: SEORuntimeResult): SEOHeadProps {
  const head = toStaticHtmlHead(result);
  return {
    title: head.title,
    meta: head.metaTags,
    link: head.linkTags,
    schema: result.schemas,
  };
}
