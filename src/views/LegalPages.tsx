import type { ViewType } from "../types/app";
import { aligned } from "../constants/ecosystemData";
import { SecurityBadge } from "../design-system/components/SecurityBadge";
import { SectionHeader } from "../design-system/components/SectionHeader";
import { StatCard } from "../design-system/components/StatCard";
import { FeatureCard } from "../design-system/components/FeatureCard";

interface LegalPagesProps {
  currentView: "about" | "privacy" | "terms" | "copyright";
  onNavigate: (view: ViewType) => void;
  onContact: () => void;
}

export default function LegalPages({ currentView, onNavigate, onContact }: LegalPagesProps) {
  return (
    <div className="min-h-screen bg-[#030912] border-t border-slate-800/60">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button onClick={() => onNavigate("home")} className="mb-10 text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 font-mono group">
          <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to Gateway
        </button>

        {/* ===== ABOUT US ===== */}
        {currentView === "about" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="cyan"
              subtitle="Corporate Profile · Est. 2020"
              title={<>About CyberDudeBivash<span className="text-cyan-400">®</span></>}
              description="CYBERDUDEBIVASH PRIVATE LIMITED is India's autonomous AI-powered cybersecurity authority — delivering real-time threat intelligence, managed SOC operations, AI security auditing, and 100+ production-grade security tools to enterprise teams, government agencies, and security researchers globally. Founded in Odisha in 2020, we stand at the intersection of AI innovation and enterprise-grade cyber defense."
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: "500K+", label: "Threat IOCs Tracked", color: "cyan" as const },
                { value: "50+", label: "Countries Protected", color: "emerald" as const },
                { value: "100+", label: "AI Security Tools", color: "violet" as const },
                { value: "99.9%", label: "Platform SLA Uptime", color: "amber" as const },
              ].map(s => (
                <StatCard key={s.label} value={s.value} label={s.label} tone={s.color} />
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                { title: "Mission", accent: "cyan" as const, body: "To democratize enterprise-grade cybersecurity with AI-native tools, real-time threat intelligence, and autonomous SOC operations — protecting organizations of every scale, from Indian SMEs to the largest global enterprises." },
                { title: "Vision", accent: "violet" as const, body: "To be India's premier global cybersecurity authority, setting the international standard for AI-driven threat defense in the Asia-Pacific region and establishing CYBERDUDEBIVASH as the most trusted name in autonomous cyber intelligence." },
                { title: "Core Values", accent: "emerald" as const, body: "Integrity in intelligence reporting. Zero-tolerance for false positives. Radical transparency in compliance. Responsible disclosure. India-first data sovereignty. Open-source contribution to the global security community." },
              ].map(c => (
                <FeatureCard key={c.title} variant="tinted" accent={c.accent} title={c.title} description={c.body} />
              ))}
            </div>

            <div className="bg-gradient-to-r from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-800 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-cyan-900/40">B</div>
              <div className="flex-1 space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Founder & CEO</div>
                <h3 className="text-lg font-bold text-white">Bivasha Kumar Nayak</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">Cybersecurity Engineer, Threat Intelligence Specialist, and OWASP contributor based in Jajpur Road, Odisha, India. Bivasha founded CYBERDUDEBIVASH in 2020 with a singular mission: to bring autonomous AI-powered cyber defense to Indian enterprises at scale. With expertise spanning penetration testing, SIGMA rule engineering, incident response, and AI security auditing, he leads a platform trusted by security teams across 50+ nations.</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["OWASP Contributor", "MITRE ATT&CK Expert", "India DPDP Specialist", "AI Red Team Lead", "ISO 27001 Practitioner"].map(tag => (
                    <span key={tag} className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/40 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader size="subsection" title="What We Deliver" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Managed SOC-as-a-Service", desc: "24×7 autonomous security operations center monitoring your infrastructure with AI-driven alert triage, threat hunting, and incident response playbooks." },
                  { title: "Sentinel APEX™ Threat Intelligence", desc: "Real-time IOC feeds, CVE tracking, SIGMA detection rules, and geo-tagged attack maps covering 500K+ active threat indicators globally." },
                  { title: "AI Security Audit Platform", desc: "Automated vulnerability scanning, OWASP LLM Top 10 assessments, code security reviews, and compliance gap analysis against NIST, ISO 27001, and DPDP Act." },
                  { title: "ThreatCore™ Security Toolkits", desc: "100+ production-grade security tools for penetration testing, digital forensics, OSINT, network analysis, and malware reverse engineering." },
                  { title: "India DPDP Act Compliance", desc: "End-to-end data protection compliance scanning, privacy impact assessments, DPO advisory, and breach notification readiness for Indian enterprises." },
                  { title: "Enterprise REST API", desc: "Programmable threat intelligence API delivering IOC enrichment, malware hash lookups, CVE data, and geolocation threat data to your SIEM/SOAR in real time." },
                ].map(s => (
                  <FeatureCard key={s.title} iconWrapper="dot" title={s.title} description={s.desc} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader size="subsection" title="Compliance Framework Alignment" />
              <p className="text-[11px] text-slate-500 -mt-2">Our internal practices are aligned with the frameworks below. We are not yet formally certified against ISO/IEC 27001 or audited against SOC 2; formal certification will be pursued as the organization scales.</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: aligned("iso27001"), color: "text-cyan-400 bg-cyan-950/40 border-cyan-900/40" },
                  { label: aligned("soc2"), color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/40" },
                  { label: aligned("gdpr"), color: "text-sky-400 bg-sky-950/40 border-sky-900/40" },
                  { label: aligned("pciDss"), color: "text-violet-400 bg-violet-950/40 border-violet-900/40" },
                  { label: "India DPDP Act 2023", color: "text-amber-400 bg-amber-950/40 border-amber-900/40" },
                  { label: "MITRE ATT&CK Mapped", color: "text-red-400 bg-red-950/40 border-red-900/40" },
                  { label: "OWASP LLM Top 10", color: "text-pink-400 bg-pink-950/40 border-pink-900/40" },
                  { label: "NIST CSF 2.0", color: "text-slate-300 bg-slate-800/60 border-slate-700/40" },
                  { label: "CERT-In Notified", color: "text-orange-400 bg-orange-950/40 border-orange-900/40" },
                ].map(b => (
                  <SecurityBadge key={b.label} label={b.label} colorClassName={b.color} variant="pill-solid" />
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Corporate Registration & Identity</h3>
              {[
                ["Legal Name", "CYBERDUDEBIVASH PRIVATE LIMITED"],
                ["Brand", "CyberDudeBivash®"],
                ["Incorporation", "Companies Act 2013, Republic of India"],
                ["PAN", "ARKPN8270G"],
                ["GSTIN", "21ARKPN8270G1ZP"],
                ["Registered Address", "29, Korai-Sukinda Rd, Ragadi, JAJPUR ROAD, Odisha 755019, India"],
                ["Operational Email", "bivash@cyberdudebivash.com"],
                ["Enterprise Hotline", "+91 81798 81447"],
                ["Business Hours", "Monday–Saturday, 9:00 AM – 7:00 PM IST"],
                ["Jurisdiction", "Odisha High Court, India"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4 text-xs font-mono border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-500 w-36 shrink-0">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-cyan-950/30 to-slate-900/60 border border-cyan-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Ready to secure your enterprise?</h3>
                <p className="text-xs text-slate-400 font-sans">Contact our security coordinators for a free assessment and platform demo.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors cursor-pointer">
                Request Enterprise Demo
              </button>
            </div>
          </div>
        )}

        {/* ===== PRIVACY POLICY ===== */}
        {currentView === "privacy" && (
          <div className="space-y-10">
            <div>
              <SectionHeader size="page" accent="emerald" pulse={false} subtitle="Legal Document" title="Privacy Policy" className="mb-3" />
              <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2.5 py-1 rounded">Last updated: June 2026</span>
                <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">DPDP Act 2023 Aligned</span>
                <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">{aligned("gdpr")}</span>
              </div>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-5">
              <p className="text-xs text-slate-300 leading-relaxed font-sans">This Privacy Policy describes how <strong className="text-white">CYBERDUDEBIVASH PRIVATE LIMITED</strong> collects, uses, stores, and protects personal data in accordance with the <strong className="text-emerald-400">Digital Personal Data Protection Act 2023 (India)</strong>, the <strong className="text-sky-400">General Data Protection Regulation (EU) 2016/679</strong>, and applicable CERT-In guidelines.</p>
            </div>
            {[
              { num: "01", title: "Data Controller / Data Fiduciary", color: "border-emerald-500/50", body: "CYBERDUDEBIVASH PRIVATE LIMITED is the Data Fiduciary under India's DPDP Act 2023 and the Data Controller under GDPR for all personal data processed through our platforms, tools, APIs, and services. Our designated Data Protection Officer (DPO) is Bivasha Kumar Nayak, reachable at bivash@cyberdudebivash.com." },
              { num: "02", title: "Personal Data We Collect", color: "border-sky-500/50", body: "We collect: (a) Identity data — full name, email address, phone number, company name when submitted via enterprise inquiry forms; (b) Usage analytics — page views, session duration, browser type, anonymized IP geolocation; (c) API access metadata — endpoint calls, rate limit counters, API key hashes; (d) Security telemetry — from opted-in managed SOC deployments under a signed DPA. We do NOT collect sensitive personal data without explicit written consent." },
              { num: "03", title: "Purpose of Processing", color: "border-cyan-500/50", body: "Your personal data is processed exclusively for: delivering requested cybersecurity products and managed services; responding to enterprise inquiries; platform performance monitoring; compliance audit logging. We do NOT sell, rent, or share personal data with third-party advertisers." },
              { num: "04", title: "Data Localisation (DPDP Act 2023)", color: "border-amber-500/50", body: "Pursuant to Section 16 of the DPDP Act 2023 and MeitY guidelines, all personal data of Indian residents is stored exclusively on servers physically located within the Republic of India (primary data center: Odisha, India). Cross-border data transfers are conducted only to jurisdictions approved under DPDP Act schedules, under Standard Contractual Clauses." },
              { num: "05", title: "Your Rights as a Data Principal", color: "border-violet-500/50", body: "Under the DPDP Act 2023 and GDPR, you have the right to: (a) Access a summary of your personal data; (b) Correct inaccurate data; (c) Erasure of your data upon request; (d) Withdraw consent at any time; (e) Nominate a successor for your data; (f) Grievance redressal within 30 days. Submit requests to: bivash@cyberdudebivash.com with subject 'Data Rights Request'." },
              { num: "06", title: "Data Retention", color: "border-slate-500/50", body: "Contact and inquiry data: retained for 36 months from last interaction, then securely deleted. API usage logs: 12 months for billing/audit, then purged. Managed SOC telemetry: per DPA terms, typically 24 months." },
              { num: "07", title: "Security Measures", color: "border-red-500/50", body: "We implement enterprise-grade security controls: AES-256 encryption at rest; TLS 1.3 for data in transit; access controls aligned with SOC 2 Type II principles; role-based access controls; multi-factor authentication; regular penetration testing; and CERT-In-compliant incident response procedures." },
              { num: "08", title: "Personal Data Breach Notification", color: "border-orange-500/50", body: "In the event of a personal data breach, CYBERDUDEBIVASH will: (1) Notify the Data Protection Board of India within 6 hours per CERT-In Directions 2022; (2) Notify affected Data Principals within 72 hours; (3) Provide a detailed breach report including nature of breach and remediation measures." },
              { num: "09", title: "Cookies & Tracking Technologies", color: "border-pink-500/50", body: "We use strictly necessary session cookies for platform security. Analytics cookies (Google Analytics 4) are used only with your explicit consent via our Cookie Consent banner. We do NOT use third-party advertising or cross-site tracking cookies." },
              { num: "10", title: "Contact & Grievance Redressal", color: "border-emerald-500/50", body: "Data Protection Officer: Bivasha Kumar Nayak | Email: bivash@cyberdudebivash.com | Phone: +91 81798 81447 | Address: CYBERDUDEBIVASH PRIVATE LIMITED, 29 Korai-Sukinda Rd, Ragadi, Jajpur Road, Odisha 755019, India." },
            ].map(s => (
              <div key={s.num} className={`border-l-2 ${s.color} pl-5 space-y-1.5`}>
                <div className="text-[9px] font-mono text-slate-600 uppercase">Section {s.num}</div>
                <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* ===== TERMS OF SERVICE ===== */}
        {currentView === "terms" && (
          <div className="space-y-10">
            <div>
              <SectionHeader size="page" accent="violet" pulse={false} subtitle="Legal Document" title="Terms of Service" className="mb-3" />
              <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                <span className="bg-violet-950/40 text-violet-400 border border-violet-900/40 px-2.5 py-1 rounded">Last updated: June 2026</span>
                <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">Governing Law: India</span>
                <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">IT Act 2000</span>
              </div>
            </div>
            <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-5">
              <p className="text-xs text-slate-300 leading-relaxed font-sans">These Terms of Service constitute a legally binding agreement between you and <strong className="text-white">CYBERDUDEBIVASH PRIVATE LIMITED</strong> governing your access to and use of all platforms, tools, APIs, documentation, and services. By accessing any CYBERDUDEBIVASH service, you agree to be bound by these Terms.</p>
            </div>
            {[
              { num: "01", title: "Acceptance of Terms", color: "border-violet-500/50", body: "By accessing any CYBERDUDEBIVASH platform, tool, API, or documentation, you agree to be bound by these Terms of Service, our Privacy Policy, and any additional guidelines. If you access our services on behalf of an organization, you represent that you have authority to bind that organization to these Terms." },
              { num: "02", title: "Authorized Use & Prohibited Activities", color: "border-red-500/50", body: "Our platforms are authorized exclusively for legitimate cybersecurity defense operations, threat intelligence consumption, compliance monitoring, security research, and educational purposes. STRICTLY PROHIBITED: Using our tools against third-party systems without authorization; reverse engineering our platform; reselling without a Partner Agreement; uploading malware to our infrastructure. Violations will be reported to CERT-In and law enforcement." },
              { num: "03", title: "Intellectual Property Rights", color: "border-cyan-500/50", body: "All content, software code, brand names (CyberDudeBivash®, Sentinel APEX™, ThreatCore™, GE-Neural Architecture™), logos, threat intelligence reports, SIGMA detection rules, and documentation are the exclusive intellectual property of CYBERDUDEBIVASH PRIVATE LIMITED, protected under the Copyright Act 1957, Trade Marks Act 1999, and Berne Convention." },
              { num: "04", title: "Platform Access & Subscription Tiers", color: "border-sky-500/50", body: "Platform access is provided under tiered subscription plans: Free Tier (public threat feeds, limited API calls), Professional Tier (extended API access, SIGMA rules, compliance reports), and Enterprise Tier (managed SOC, dedicated support, SLA guarantees, custom integrations). Subscription fees are non-refundable after the 7-day evaluation period." },
              { num: "05", title: "API Usage Terms", color: "border-amber-500/50", body: "API access is subject to rate limits: Free: 100 calls/day; Professional: 10,000 calls/day; Enterprise: unlimited under fair use. Not permitted: credential sharing between organizations; bulk IOC export beyond licensed volume; building competing products using our API data." },
              { num: "06", title: "Limitation of Liability", color: "border-orange-500/50", body: "Maximum aggregate liability shall not exceed the total fees paid to CYBERDUDEBIVASH in the 3 calendar months immediately preceding the claim. CyberDudeBivash provides services on a best-effort basis and is not liable for breaches that occur despite our services being deployed." },
              { num: "07", title: "Governing Law & Dispute Resolution", color: "border-violet-500/50", body: "These Terms are governed exclusively by the laws of the Republic of India. Disputes shall be submitted to binding arbitration under the Arbitration and Conciliation Act 1996 (India), with the seat of arbitration at Bhubaneswar, Odisha. Nothing prevents either party from seeking urgent injunctive relief from Indian courts." },
            ].map(s => (
              <div key={s.num} className={`border-l-2 ${s.color} pl-5 space-y-1.5`}>
                <div className="text-[9px] font-mono text-slate-600 uppercase">Section {s.num}</div>
                <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* ===== COPYRIGHT & IP ===== */}
        {currentView === "copyright" && (
          <div className="space-y-10">
            <div>
              <SectionHeader size="page" accent="amber" pulse={false} subtitle="Legal Document" title="Copyright & Intellectual Property" className="mb-3" />
              <p className="text-xs text-slate-500 font-mono">&copy; {new Date().getFullYear()} CYBERDUDEBIVASH PRIVATE LIMITED. All rights reserved worldwide.</p>
            </div>

            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-amber-400">Comprehensive Copyright Notice</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">All content, software, source code, AI model weights, SIGMA detection rules, incident response playbooks, threat intelligence feeds, API schemas, documentation, and brand elements published across the entire CYBERDUDEBIVASH ecosystem are the exclusive intellectual property of <strong className="text-white">CYBERDUDEBIVASH PRIVATE LIMITED</strong>. All rights reserved under the <strong className="text-amber-400">Copyright Act, 1957 (India)</strong> and the Berne Convention.</p>
            </div>

            <div className="space-y-4">
              <SectionHeader size="subsection" title="Trademark & Brand Registry" />
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { mark: "CyberDudeBivash®", type: "Registered Trademark", desc: "Primary corporate brand and platform name. Protected under Trade Marks Act 1999, Class 42 (IT services)." },
                  { mark: "Sentinel APEX™", type: "Common Law Trademark", desc: "Threat intelligence and SOC platform brand. TM protection under use in commerce since 2021." },
                  { mark: "ThreatCore™", type: "Common Law Trademark", desc: "Security toolkits and penetration testing suite brand. Protected since 2022." },
                  { mark: "GE-Neural Architecture™", type: "Common Law Trademark", desc: "Proprietary AI model architecture brand used in CDB's autonomous threat detection engine." },
                ].map(m => (
                  <div key={m.mark} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-amber-400">{m.mark}</h4>
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{m.type}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {[
              { num: "01", title: "Scope of Protection", color: "border-amber-500/50", body: "Copyright protection extends to all original works created by CYBERDUDEBIVASH PRIVATE LIMITED including: platform source code; AI threat detection model architectures; SIGMA rule sets; incident response playbooks; threat intelligence reports; API documentation; graphic design assets. Protection subsists automatically upon creation under the Berne Convention." },
              { num: "02", title: "Software License Terms", color: "border-orange-500/50", body: "CYBERDUDEBIVASH platform software is proprietary. Unless explicitly licensed: (a) You may NOT copy, modify, or create derivative works; (b) You may NOT reverse engineer or decompile our software; (c) You may NOT distribute or sublicense; (d) You may NOT use the software to build competing cybersecurity intelligence products." },
              { num: "03", title: "Permitted Fair Uses", color: "border-sky-500/50", body: "The following uses are expressly permitted without prior written consent: (1) Linking to CYBERDUDEBIVASH public platforms; (2) Quoting brief excerpts (under 200 words) in journalistic or academic contexts with full attribution; (3) Using our public API within licensed call limits; (4) Citing our research in academic papers with proper bibliography entry." },
              { num: "04", title: "DMCA & Infringement Reporting", color: "border-red-500/50", body: "To report copyright infringement: Email: bivash@cyberdudebivash.com | Subject: 'IP Infringement Notice / DMCA' | Include: Description of the copyrighted work infringed; URL of the infringing content; your contact information and sworn statement of good faith belief. We respond within 5 business days." },
            ].map(s => (
              <div key={s.num} className={`border-l-2 ${s.color} pl-5 space-y-1.5`}>
                <div className="text-[9px] font-mono text-slate-600 uppercase">Section {s.num}</div>
                <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
              </div>
            ))}

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center space-y-2">
              <p className="text-[11px] text-slate-500 font-mono">&copy; {new Date().getFullYear()} CYBERDUDEBIVASH PRIVATE LIMITED. All Rights Reserved.</p>
              <p className="text-[10px] text-slate-600 font-sans">Registered in India · PAN: ARKPN8270G · GSTIN: 21ARKPN8270G1ZP</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
