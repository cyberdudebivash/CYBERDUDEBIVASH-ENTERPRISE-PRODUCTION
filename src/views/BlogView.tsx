import { Play } from "lucide-react";

export default function BlogView() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="space-y-1 border-l-4 border-amber-500 pl-3">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Cybersecurity Research Blog &amp; Academy</h2>
        <p className="text-xs text-slate-500">Explore technical advisories, zero-day CVE teardowns, and course modules delivered directly from our training coordinators.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">Recent Threat Advisories</h3>
          {[
            {
              title: "Deep-Dive Teardown of DirtyClone (CVE-2026-43503) Linux Privilege Escalation",
              desc: "An exhaustive static and behavioral walkthrough of the DirtyClone memory corruption flaw allowing unprivileged users to silently rewrite executable code segments directly in kernel buffers.",
              meta: "Published: June 26, 2026 &bull; Author: Bivash Kumar Nayak &bull; Category: Kernel exploits"
            },
            {
              title: "MFA Bypass via Adversary-in-the-Middle (AiTM) Phishing Kits: Bluekit Operational Report",
              desc: "Our threat intelligence scouts have tracked nearly 70 active hostnames distributing browser-in-the-middle proxy configurations. Analysis of OIDC token stealing patterns and direct countermeasures.",
              meta: "Published: June 24, 2026 &bull; Author: Sentinel APEX Team &bull; Category: Phishing analysis"
            },
            {
              title: "OWASP Top 10 Mapping for Large Language Models: Prompt Injection Vectors Explored",
              desc: "How prompt injections bypass sanitization logic to trick AI coding assistants into cloning malicious subrepositories and executing local OS shell codes.",
              meta: "Published: June 20, 2026 &bull; Author: CyberDude Research Lab &bull; Category: LLM Security"
            }
          ].map((post, idx) => (
            <div key={idx} className="bg-[#0c1117] border border-slate-800 p-5 rounded-lg space-y-2 hover:border-slate-700 transition-all">
              <h4 className="text-sm font-extrabold text-slate-100 hover:text-cyan-400 transition-colors cursor-pointer">{post.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{post.desc}</p>
              <div className="pt-2 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span dangerouslySetInnerHTML={{ __html: post.meta }}></span>
                <span className="text-cyan-500 hover:underline cursor-pointer">Read Full Intel →</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">Ecosystem Academy Courses</h3>
          <div className="space-y-4">
            {[
              { title: "SOC Analyst Runbook (Tier 1-3)", cost: "₹499", level: "Intermediate", desc: "Build incident response playbooks, learn SPL/KQL alerts, and run network forensics." },
              { title: "AI Red Teaming & LLM Security", cost: "₹999", level: "Advanced", desc: "Hardening LLM data flows, writing secure API code, testing prompt injections." },
              { title: "Active OSINT & Threat Hunting", cost: "₹699", level: "Beginner-Intermediate", desc: "Querying CT logs, WHOIS metadata, certificate mappings, and hash reputations." }
            ].map((course, idx) => (
              <div key={idx} className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-extrabold text-slate-200 leading-tight">{course.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded border border-emerald-900">{course.cost}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug font-sans">{course.desc}</p>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/60">Level: {course.level}</span>
                  <button className="text-slate-300 hover:text-cyan-400 font-bold flex items-center gap-1">
                    <Play className="w-3 h-3 fill-slate-300 hover:fill-cyan-400" /> Start Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
