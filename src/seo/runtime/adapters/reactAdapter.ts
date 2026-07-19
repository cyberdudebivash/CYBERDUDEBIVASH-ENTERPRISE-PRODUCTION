import type { SEORuntimeResult } from "../contracts/types";
import { buildHeadTags } from "./headTags";

// ReactAdapter — transforms a SEORuntimeResult into a plain,
// serializable props object a React `<head>`-management component
// (react-helmet-async, React 19's native `<title>`/`<meta>` hoisting,
// etc.) can spread directly. Deliberately returns data, not JSX or a
// component: src/seo/ has never imported "react" (every engine's own
// header comment says so — "never inspects HTML, the DOM"), and this
// Runtime keeps that boundary rather than being the first file in the
// SEO platform to cross it. Escaping is the consuming component's
// concern (React already escapes text children/attributes by default),
// so — unlike StaticHtmlAdapter/SSRAdapter — this does not reuse
// headTags.ts's HTML-string serialization, only its tag list.

export interface ReactMetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface ReactLinkTag {
  rel: string;
  href: string;
  hreflang?: string;
}

export interface ReactHeadProps {
  title: string;
  meta: ReactMetaTag[];
  links: ReactLinkTag[];
  jsonLd: unknown;
}

export function toReactHeadProps(result: SEORuntimeResult): ReactHeadProps {
  const tags = buildHeadTags(result);

  let title = "";
  const meta: ReactMetaTag[] = [];
  const links: ReactLinkTag[] = [];
  let jsonLd: unknown;

  for (const tag of tags) {
    switch (tag.kind) {
      case "title":
        title = tag.content;
        break;
      case "meta":
        meta.push({ name: tag.name, property: tag.property, content: tag.content });
        break;
      case "link":
        links.push({ rel: tag.rel, href: tag.href, hreflang: tag.hreflang });
        break;
      case "jsonLd":
        jsonLd = tag.data;
        break;
    }
  }

  return { title, meta, links, jsonLd };
}
