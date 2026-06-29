import React, { useState, useEffect } from "react";
import { Shield, X, Cookie } from "lucide-react";

const CONSENT_KEY = "cdb_cookie_consent";
const CONSENT_VERSION = "1.0";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored || JSON.parse(stored).version !== CONSENT_VERSION) {
      setTimeout(() => setVisible(true), 1500);
    }
  }, []);

  const accept = (type: "all" | "necessary") => {
    const consent = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      analytics: type === "all",
      advertising: type === "all",
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

    if (type === "all" && typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      });
    } else if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-5xl mx-auto bg-[#06080a] border border-cyan-900/50 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mt-0.5">
              <Cookie className="w-5 h-5 text-cyan-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-white">
                  CYBERDUDEBIVASH® Privacy & Cookie Notice
                </h3>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono">
                  DPDP + GDPR
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                We use cookies and Google services (Analytics, AdSense) to improve platform performance,
                display relevant ads, and analyze usage. Strictly necessary cookies ensure core security
                functions work. By accepting all, you consent to analytics and advertising cookies per
                our{" "}
                <button
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  onClick={() => document.dispatchEvent(new CustomEvent("cdb:nav", { detail: "privacy" }))}
                >
                  Privacy Policy
                </button>{" "}
                and the India DPDP Act 2023.
              </p>

              {expanded && (
                <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    {
                      name: "Necessary",
                      desc: "Security, session management, core platform functions",
                      always: true,
                    },
                    {
                      name: "Analytics (GA4)",
                      desc: "Google Analytics 4 — anonymized usage data to improve the platform",
                      always: false,
                    },
                    {
                      name: "Advertising (AdSense)",
                      desc: "Google AdSense — contextual ads that help fund free platform access",
                      always: false,
                    },
                  ].map((cat) => (
                    <div
                      key={cat.name}
                      className="bg-slate-900/50 border border-slate-800 rounded-lg p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-300">{cat.name}</span>
                        {cat.always ? (
                          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            Always On
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 leading-relaxed">{cat.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => accept("all")}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={() => accept("necessary")}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  Necessary Only
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors underline underline-offset-2"
                >
                  {expanded ? "Hide details" : "Cookie details"}
                </button>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => accept("necessary")}
              className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors mt-0.5"
              aria-label="Dismiss — accept necessary cookies only"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
