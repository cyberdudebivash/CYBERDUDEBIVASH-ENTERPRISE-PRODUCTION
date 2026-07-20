import { useMemo } from "react";

const PARTICLE_COUNT = 30;

interface ParticleStyle {
  left: string;
  animationDuration: string;
  animationDelay: string;
}

// Purely decorative background animation, ported from the original scanner.
// aria-hidden on the container — Discovery-adjacent fix: the original never
// excluded this from the accessibility tree, so assistive tech had 30 meaningless
// generated <div>s to skip past to reach real content.
export function Particles() {
  const particles = useMemo<ParticleStyle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        left: `${Math.random() * 100}%`,
        animationDuration: `${15 + Math.random() * 20}s`,
        animationDelay: `${Math.random() * 10}s`,
      })),
    [],
  );

  return (
    <div className="dpdp-particles" aria-hidden="true">
      {/* Index as key is fine here: a static list generated once (useMemo, empty
          deps), never reordered, added to, or removed from after mount. */}
      {particles.map((style, i) => (
        <div key={i} className="dpdp-particle" style={style} />
      ))}
    </div>
  );
}
