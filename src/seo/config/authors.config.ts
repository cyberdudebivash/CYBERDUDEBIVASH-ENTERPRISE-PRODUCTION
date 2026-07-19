import type { SEOAuthor } from "../types/entities";

// Owns: content bylines. Transcribed from the three attributions
// actually used in src/views/BlogView.tsx's sample posts — one real
// person (the founder) and two team-level bylines. Not invented: these
// are the only three author names found anywhere in the app's content.

export const AUTHORS: SEOAuthor[] = [
  {
    id: "bivasha-kumar-nayak",
    name: "Bivasha Kumar Nayak",
    role: "Founder & CEO, CyberDudeBivash Private Limited",
    bio: "Cybersecurity Engineer, Threat Intelligence Specialist, and OWASP contributor based in Jajpur Road, Odisha, India.",
    url: "https://www.cyberdudebivash.com/about.html",
    sameAs: [
      "https://www.linkedin.com/company/cyberdudebivash/",
      "https://x.com/CDBSENTINELAPEX",
    ],
  },
  {
    id: "sentinel-apex-team",
    name: "Sentinel APEX Team",
    role: "Threat Intelligence Team",
  },
  {
    id: "cyberdude-research-lab",
    name: "CyberDude Research Lab",
    role: "AI & Application Security Research",
  },
];
