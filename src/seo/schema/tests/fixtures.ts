import type { SEOPage } from "../../types/page";
import type { SEOService, SEOProduct, SEOSolution, SEOArticle, SEOAuthor } from "../../types/entities";

// Shared synthetic fixtures for this platform's test suite — not a
// `.test.ts` file itself, so the test runner never executes it
// directly. Mirrors metadata/__tests__/fixtures.ts's own approach.

export function makePage(overrides: Partial<SEOPage> = {}): SEOPage {
  return {
    id: "test-page",
    path: "/test-page.html",
    title: "Test Page",
    description: "A test page.",
    canonical: { path: "/test-page.html" },
    openGraph: { title: "Test Page OG", description: "Test page OG description.", type: "website", image: { url: "https://example.com/img.png", alt: "Test image" } },
    twitterCard: { card: "summary_large_image", title: "Test Page Twitter", description: "Test page Twitter description." },
    ...overrides,
  };
}

export function makeService(overrides: Partial<SEOService> = {}): SEOService {
  return { id: "test-service", name: "Test Service", description: "A test service.", url: "/test-service.html", ...overrides };
}

export function makeProduct(overrides: Partial<SEOProduct> = {}): SEOProduct {
  return { id: "test-product", name: "Test Product", description: "A test product.", url: "https://products.example.com/", ...overrides };
}

export function makeSolution(overrides: Partial<SEOSolution> = {}): SEOSolution {
  return { id: "test-solution", name: "Test Solution", description: "A test solution.", url: "https://example.com/#gumroad-test", price: "₹499", ...overrides };
}

export function makeAuthor(overrides: Partial<SEOAuthor> = {}): SEOAuthor {
  return { id: "test-author", name: "Test Author", role: "Test Role", ...overrides };
}

export function makeArticle(overrides: Partial<SEOArticle> = {}): SEOArticle {
  return { id: "test-article", title: "Test Article", description: "A test article.", url: "https://blog.example.com/test-article", authorId: "test-author", ...overrides };
}
