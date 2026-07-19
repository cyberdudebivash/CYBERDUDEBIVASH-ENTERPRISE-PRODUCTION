// Container Width Tokens
//
// Frequency audit of max-w-* in src/: max-w-7xl (10x — the outer
// HomeView shell), max-w-3xl (8x — hero/description copy blocks),
// max-w-5xl (3x — ServicePages/LegalPages content column). Named by
// role since "7xl vs 5xl vs 3xl" doesn't communicate intent on its own.

export const containerWidth = {
  proseNarrow: "max-w-md",
  prose: "max-w-2xl",
  copyBlock: "max-w-3xl",  // hero/section description paragraphs
  contentColumn: "max-w-5xl", // ServicePages / LegalPages page shell
  pageShell: "max-w-7xl",     // HomeView's outermost wrapper
} as const;
