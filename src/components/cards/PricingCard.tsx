interface PricingCardProps {
  tier: string;
  price: string;
  subtitle?: string;
  color: string;
  badge: string;
  features: string[];
}

// Same card markup appeared 3 times in ServicePages.tsx (SOC service tiers,
// MSSP partner tiers, vCISO engagement models) - identical except an
// optional subtitle line under the price (client count / hours-per-month /
// nothing). Genuine duplication, not a speculative API.
export function PricingCard({ tier, price, subtitle, color, badge, features }: PricingCardProps) {
  return (
    <div className={`border ${color} rounded-xl p-5 space-y-3`}>
      <div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${badge}`}>{tier}</span>
        <div className="text-xl font-extrabold text-white mt-2 font-mono">{price}</div>
        {subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      <ul className="space-y-1.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-[11px] text-slate-400 font-sans">
            <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  );
}
