import type { SEOPage } from "../../types/page";

// Shared synthetic fixture for the metadata engine's test suite — not
// a `.test.ts` file itself, so the test runner never executes it
// directly. Mirrors validators/__tests__/validators.test.ts's own
// makePage(), reused across files here because five-plus suites in
// this directory need one (validators.test.ts only needed it in one).

export function makePage(overrides: Partial<SEOPage> = {}): SEOPage {
  return {
    id: "test-page",
    path: "/test-page.html",
    title: "Test Page",
    description: "A test page.",
    canonical: { path: "/test-page.html" },
    openGraph: {
      title: "Test Page OG Title",
      description: "Test page OG description.",
      type: "website",
      image: { url: "https://example.com/img.png", alt: "Test image" },
    },
    twitterCard: {
      card: "summary_large_image",
      title: "Test Page Twitter Title",
      description: "Test page Twitter description.",
    },
    ...overrides,
  };
}
