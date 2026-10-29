"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Database,
  Gauge,
  LayoutDashboard,
  Network,
  ShieldAlert,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Tab = "Overview" | "Threshold Explorer" | "Model Comparison" | "Error Analysis";

type ValidationRow = {
  label: number;
  logistic_regression_score: number;
  random_forest_score: number;
};

type ThresholdMetrics = {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  recall: number;
  fpr: number;
  precision: number;
  f1: number;
};

const validationData = [
  { model: "Logistic Regression", recall: 89.53, fpr: 5.0, precision: 97.45, f1: 93.32 },
  { model: "Random Forest", recall: 95.79, fpr: 4.99, precision: 97.61, f1: 96.69 },
];

const attackData = [
  { category: "Fuzzers", recall: 80.7, records: 6062, missed: 1170 },
  { category: "Shellcode", recall: 98.15, records: 378, missed: 7 },
  { category: "Exploits", recall: 99.33, records: 11132, missed: 75 },
  { category: "Analysis", recall: 99.7, records: 677, missed: 2 },
  { category: "DoS", recall: 99.85, records: 4089, missed: 6 },
  { category: "Reconnaissance", recall: 99.89, records: 3496, missed: 4 },
  { category: "Generic", recall: 99.99, records: 18871, missed: 2 },
  { category: "Backdoor", recall: 100, records: 583, missed: 0 },
  { category: "Worms", recall: 100, records: 44, missed: 0 },
];

const scoreQuantiles = [
  { quantile: "50th", validation: 0.0002, test: 0.0125 },
  { quantile: "75th", validation: 0.0057, test: 0.4708 },
  { quantile: "90th", validation: 0.3913, test: 0.6946 },
  { quantile: "95th", validation: 0.5565, test: 0.7888 },
  { quantile: "99th", validation: 0.8107, test: 0.8937 },
];

const navItems: { label: Tab; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Threshold Explorer", icon: SlidersHorizontal },
  { label: "Model Comparison", icon: BarChart3 },
  { label: "Error Analysis", icon: ShieldAlert },
];

/* ------------------------------------------------------------------ */
/* Colour system                                                       */
/* Each tint is a base colour that is lightened toward white at the    */
/* top-left corner (the "shine") and deepened toward the bottom-right. */
/* ------------------------------------------------------------------ */

type TintName = "teal" | "green" | "amber" | "rose" | "violet";

const TINTS: Record<
  TintName,
  { base: string; deep: string; glow: string; label: string; value: string }
> = {
  teal: { base: "#16414A", deep: "#0B222A", glow: "#2DE2C5", label: "#8BEBDD", value: "#E4FFFB" },
  green: { base: "#194A41", deep: "#0C2622", glow: "#42D6A4", label: "#8BE7C5", value: "#E2FFF4" },
  amber: { base: "#4B3B22", deep: "#261C0F", glow: "#FFBF69", label: "#FFD08A", value: "#FFF3DF" },
  rose: { base: "#4F2535", deep: "#26121B", glow: "#FF647C", label: "#FF9EAE", value: "#FFE7EB" },
  violet: { base: "#342E5C", deep: "#191533", glow: "#A78BFA", label: "#D5C8FF", value: "#F3EEFF" },
};

function glass(name: TintName): CSSProperties {
  const t = TINTS[name];
  return {
    background: [
      // white shine in the top-left corner
      "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.07) 30%, transparent 58%)",
      // coloured bounce light in the opposite corner
      `radial-gradient(90% 90% at 100% 100%, ${t.glow}40 0%, transparent 62%)`,
      `linear-gradient(145deg, ${t.base} 0%, ${t.deep} 100%)`,
    ].join(", "),
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.30)",
      `inset 0 -14px 26px -18px ${t.glow}80`,
      `0 14px 28px -16px ${t.glow}66`,
    ].join(", "),
    borderColor: `${t.glow}33`,
  };
}

const panelStyle: CSSProperties = {
  background: [
    "radial-gradient(90% 60% at 0% 0%, rgba(255,255,255,0.075) 0%, transparent 60%)",
    "radial-gradient(70% 60% at 100% 100%, rgba(45,226,197,0.07) 0%, transparent 65%)",
    "linear-gradient(160deg, #1A233D 0%, #121A2E 100%)",
  ].join(", "),
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 24px 44px -28px rgba(0,0,0,0.7)",
};

const pageStyle: CSSProperties = {
  background: [
    "radial-gradient(60% 45% at 88% -8%, rgba(45,226,197,0.16) 0%, transparent 70%)",
    "radial-gradient(50% 40% at 0% 100%, rgba(167,139,250,0.12) 0%, transparent 70%)",
    "radial-gradient(40% 30% at 50% 55%, rgba(255,191,105,0.04) 0%, transparent 70%)",
    "#0B1020",
  ].join(", "),
};

const tooltipStyle: CSSProperties = {
  background: "linear-gradient(145deg, rgba(30,40,66,0.96), rgba(11,16,32,0.96))",
  border: "1px solid rgba(45,226,197,0.35)",
  borderRadius: 12,
  color: "#F8FAFC",
  padding: 12,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 36px -12px rgba(0,0,0,0.7)",
  backdropFilter: "blur(8px)",
};

/* Gradient fills for charts: light top -> base -> deep bottom */
function grad(id: string, light: string, mid: string, deep: string, horizontal = false) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={horizontal ? "1" : "0"} y2={horizontal ? "0" : "1"}>
      <stop offset="0%" stopColor={light} />
      <stop offset="45%" stopColor={mid} />
      <stop offset="100%" stopColor={deep} />
    </linearGradient>
  );
}

const chartDefs = (
  <defs>
    {grad("gTeal", "#B8FFF3", "#2DE2C5", "#0E7C6E")}
    {grad("gGreen", "#C2FFE6", "#42D6A4", "#12805F")}
    {grad("gAmber", "#FFE3B5", "#FFBF69", "#B5701A")}
    {grad("gViolet", "#E1D6FF", "#A78BFA", "#5B3FC4")}
    {grad("gTealH", "#B8FFF3", "#2DE2C5", "#0E7C6E", true)}
    {grad("gRoseH", "#FFC2CC", "#FF647C", "#A92B43", true)}
  </defs>
);

/* ------------------------------------------------------------------ */
/* Hover popup                                                         */
/* ------------------------------------------------------------------ */

function Hint({
  content,
  title = "Technical details",
  align = "full",
  className = "",
  children,
}: {
  content: ReactNode;
  title?: string;
  align?: "full" | "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const pos =
    align === "full"
      ? "left-2 right-2"
      : align === "left"
        ? "left-0 w-64 max-w-[80vw]"
        : "right-0 w-64 max-w-[80vw]";
  const arrow = align === "right" ? "right-8" : "left-8";

  return (
    <div
      tabIndex={0}
      className={`group relative outline-none transition duration-200 motion-reduce:transition-none hover:z-50 hover:-translate-y-1 focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-[#2DE2C5]/60 rounded-2xl ${className}`}
    >
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute top-full z-50 mt-3 ${pos} translate-y-2 scale-95 rounded-xl border border-[#2DE2C5]/40 p-4 text-xs leading-5 text-slate-200 opacity-0 transition duration-200 motion-reduce:transition-none group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100`}
        style={tooltipStyle}
      >
        <span
          className={`absolute -top-1.5 ${arrow} h-3 w-3 rotate-45 border-l border-t border-[#2DE2C5]/40 bg-[#1E2842]`}
        />
        <p className="mb-1 font-semibold text-[#2DE2C5]">{title}</p>
        {content}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-white/10 p-5 sm:p-6 ${className}`}
      style={panelStyle}
    >
      {children}
    </section>
  );
}

function Tile({
  tint,
  label,
  value,
  note,
  hint,
  align = "full",
  large = true,
}: {
  tint: TintName;
  label: string;
  value: string;
  note?: string;
  hint: ReactNode;
  align?: "full" | "left" | "right";
  large?: boolean;
}) {
  const t = TINTS[tint];
  return (
    <Hint content={hint} align={align}>
      <div className={`rounded-xl border ${large ? "p-5" : "p-4"}`} style={glass(tint)}>
        <p className="text-xs font-medium" style={{ color: t.label }}>
          {label}
        </p>
        <p
          className={`mt-2 font-semibold ${large ? "text-2xl" : "text-xl"}`}
          style={{ color: t.value }}
        >
          {value}
        </p>
        {note && (
          <p className="mt-1 text-xs" style={{ color: t.label }}>
            {note}
          </p>
        )}
      </div>
    </Hint>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tint,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tint: TintName;
}) {
  const t = TINTS[tint];
  const technicalDetails: Record<string, string> = {
    "Test attack recall":
      "Recall = TP / (TP + FN). It measures the share of actual attack records detected. Test counts: TP 44,066; FN 1,266; 45,332 attack records total.",
    "Test false-positive rate":
      "FPR = FP / (FP + TN). It measures normal traffic incorrectly flagged as malicious. Test counts: FP 6,912; TN 30,088; 37,000 normal records total.",
    "Test precision":
      "Precision = TP / (TP + FP). It measures the share of attack alerts that were actual attacks. Test counts: TP 44,066 and FP 6,912.",
    "Test average precision":
      "Average precision summarizes the precision–recall curve across score thresholds. It is a ranking metric, not a single-threshold metric.",
  };

  return (
    <Hint content={technicalDetails[title] ?? detail}>
      <div className="rounded-2xl border p-5" style={glass(tint)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: t.label }}>
              {title}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: t.value }}>
              {value}
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              background: `radial-gradient(120% 100% at 20% 0%, rgba(255,255,255,0.35), transparent 60%), ${t.glow}33`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px -6px ${t.glow}99`,
              color: t.value,
            }}
          >
            <Icon size={21} />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: t.label }}>
          {detail}
        </p>
      </div>
    </Hint>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [threshold, setThreshold] = useState(0.5571254829);
  const [selectedModel, setSelectedModel] = useState<"Random Forest" | "Logistic Regression">(
    "Random Forest"
  );
  const [validationScores, setValidationScores] = useState<ValidationRow[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState("");

  useEffect(() => {
    fetch("/data/validation_scores.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load validation_scores.json (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then((data: ValidationRow[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("The validation score file is empty or has an unexpected format.");
        }
        setValidationScores(data);
        setScoresError("");
      })
      .catch((error: unknown) => {
        setScoresError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred while loading validation scores."
        );
      })
      .finally(() => setScoresLoading(false));
  }, []);

  const frozenThreshold = selectedModel === "Random Forest" ? 0.5571254829012706 : 0.624422;
  const isFrozenThreshold = Math.abs(threshold - frozenThreshold) < 0.0005;
  const scoreKey =
    selectedModel === "Random Forest" ? "random_forest_score" : "logistic_regression_score";

  const thresholdMetrics = useMemo<ThresholdMetrics>(() => {
    let tn = 0;
    let fp = 0;
    let fn = 0;
    let tp = 0;

    for (const row of validationScores) {
      const predictedAttack = row[scoreKey] >= threshold;
      if (row.label === 1 && predictedAttack) tp++;
      else if (row.label === 1 && !predictedAttack) fn++;
      else if (row.label === 0 && predictedAttack) fp++;
      else tn++;
    }

    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { tn, fp, fn, tp, recall, fpr, precision, f1 };
  }, [validationScores, scoreKey, threshold]);

  const m = thresholdMetrics;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const n = (v: number) => v.toLocaleString();

  return (
    <main className="min-h-screen text-slate-100" style={pageStyle}>
      <div className="flex min-h-screen">
        <aside
          className="hidden w-64 shrink-0 flex-col border-r border-white/10 p-5 lg:flex"
          style={{
            background:
              "radial-gradient(100% 40% at 0% 0%, rgba(255,255,255,0.06), transparent 70%), linear-gradient(180deg, #19223C 0%, #121A2E 100%)",
          }}
        >
          <div className="flex items-center gap-3 px-2 py-3">
            <div
              className="rounded-xl border p-2.5 text-white"
              style={glass("teal")}
            >
              <Network size={23} />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight">NetGuard ML</h1>
              <p className="text-xs text-slate-400">Research dashboard</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Workspace
            </p>
            <nav className="space-y-1">
              {navItems.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  style={activeTab === label ? glass("teal") : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition motion-reduce:transition-none ${
                    activeTab === label
                      ? "text-[#C9FFF6]"
                      : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div
            className="mt-auto rounded-2xl border border-white/10 p-4"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.07), transparent 60%), #0D1428",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database size={17} className="text-[#2DE2C5]" />
              Dataset
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              UNSW-NB15 · 175,341 training records
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#42D6A4]">
              <span className="h-2 w-2 rounded-full bg-[#42D6A4] shadow-[0_0_8px_#42D6A4]" />
              Experiment results loaded
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-8"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01) 60%), #151D32",
            }}
          >
            <div>
              <p className="text-xs font-medium text-slate-400">MACHINE LEARNING / SECURITY</p>
              <h2 className="mt-1 text-lg font-semibold">Network Intrusion Detection</h2>
            </div>
            <div
              className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-300"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
            >
              <span className="h-2 w-2 rounded-full bg-[#42D6A4] shadow-[0_0_8px_#42D6A4]" />
              Offline evaluation
              <ChevronDown size={14} />
            </div>
          </header>

          <div className="border-b border-white/10 bg-[#151D32] px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  style={activeTab === label ? glass("teal") : undefined}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium ${
                    activeTab === label
                      ? "text-[#C9FFF6]"
                      : "border-transparent bg-[#202A43] text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-7xl p-4 sm:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#2DE2C5]">UNSW-NB15 BENCHMARK</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {activeTab}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Understand how alert thresholds affect intrusion detection, false alarms and
                  generalization to unseen traffic.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 px-4 py-3" style={panelStyle}>
                <p className="text-xs text-slate-400">Selected model</p>
                <p className="mt-1 font-semibold">{selectedModel}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Frozen threshold: {frozenThreshold.toFixed(6)}
                </p>
              </div>
            </div>

            {activeTab === "Overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Test attack recall"
                    value="97.21%"
                    detail="44,066 of 45,332 attack records detected"
                    icon={Target}
                    tint="green"
                  />
                  <MetricCard
                    title="Test false-positive rate"
                    value="18.68%"
                    detail="6,912 normal records incorrectly flagged"
                    icon={ShieldAlert}
                    tint="rose"
                  />
                  <MetricCard
                    title="Test precision"
                    value="86.44%"
                    detail="Share of predicted attacks that were attacks"
                    icon={Gauge}
                    tint="teal"
                  />
                  <MetricCard
                    title="Test average precision"
                    value="98.81%"
                    detail="Precision-recall ranking metric; not threshold-specific"
                    icon={Activity}
                    tint="amber"
                  />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <Panel>
                    <SectionTitle
                      title="Validation vs. test"
                      description="The frozen model and threshold show a substantial false-positive gap."
                    />
                    <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#2DE2C5]" />
                        Validation
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#FFBF69]" />
                        Official test
                      </span>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { metric: "Attack recall", validation: 95.79, test: 97.21 },
                            { metric: "False-positive rate", validation: 4.99, test: 18.68 },
                          ]}
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                        >
                          {chartDefs}
                          <CartesianGrid stroke="#28344D" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: "#2DE2C5", fontWeight: 600 }}
                            itemStyle={{ color: "#E2E8F0" }}
                            cursor={{ fill: "rgba(45, 226, 197, 0.08)" }}
                          />
                          <Bar dataKey="validation" name="Validation" fill="url(#gTeal)" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="test" name="Official test" fill="url(#gAmber)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p
                      className="mt-3 rounded-xl border p-3 text-sm leading-6 text-[#FFE9C7]"
                      style={glass("amber")}
                    >
                      The test false-positive rate is 13.69 percentage points higher than
                      validation, despite using the same frozen threshold.
                    </p>
                  </Panel>

                  <Panel>
                    <SectionTitle
                      title="Test confusion matrix"
                      description="Counts at the frozen Random Forest threshold."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Tile
                        tint="green"
                        label="True negatives"
                        value="30,088"
                        note="Normal correctly identified"
                        align="left"
                        hint="Normal traffic the model correctly let through. 30,088 of 37,000 normal records."
                      />
                      <Tile
                        tint="amber"
                        label="False positives"
                        value="6,912"
                        note="Normal flagged as attack"
                        align="right"
                        hint="False alarms. Each one is a normal record scored at or above the threshold. FPR = 6,912 / 37,000 = 18.68%."
                      />
                      <Tile
                        tint="rose"
                        label="False negatives"
                        value="1,266"
                        note="Attacks missed"
                        align="left"
                        hint="Attacks that slipped under the threshold. 1,170 of these are Fuzzers."
                      />
                      <Tile
                        tint="teal"
                        label="True positives"
                        value="44,066"
                        note="Attacks detected"
                        align="right"
                        hint="Attacks correctly flagged. Recall = 44,066 / 45,332 = 97.21%."
                      />
                    </div>
                    <p className="mt-4 text-xs leading-5 text-slate-400">
                      Official test set: 82,332 records. These results are reported at the
                      previously selected threshold.
                    </p>
                  </Panel>
                </div>

                <Panel className="mt-6">
                  <SectionTitle
                    title="What this experiment investigates"
                    description="Beyond accuracy: evaluating intrusion detection under different alert thresholds."
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <Hint
                      content="Measured with recall: of all real attacks in the data, how many cross the alert threshold."
                      title="How it is measured"
                    >
                      <div className="rounded-xl border p-4" style={glass("teal")}>
                        <Target className="text-[#2DE2C5]" size={21} />
                        <h3 className="mt-3 font-semibold">Detection performance</h3>
                        <p className="mt-2 text-sm leading-6 text-[#B7F7EE]">
                          How many genuine attacks are detected at a chosen threshold?
                        </p>
                      </div>
                    </Hint>
                    <Hint
                      content="Measured with false-positive rate: of all normal records, how many trigger an alert."
                      title="How it is measured"
                    >
                      <div className="rounded-xl border p-4" style={glass("amber")}>
                        <ShieldAlert className="text-[#FFBF69]" size={21} />
                        <h3 className="mt-3 font-semibold">False-alarm cost</h3>
                        <p className="mt-2 text-sm leading-6 text-[#FFE0B0]">
                          How much normal traffic is incorrectly flagged?
                        </p>
                      </div>
                    </Hint>
                    <Hint
                      content="Compares validation results with the official test set at the same frozen threshold."
                      title="How it is measured"
                    >
                      <div className="rounded-xl border p-4" style={glass("green")}>
                        <Activity className="text-[#42D6A4]" size={21} />
                        <h3 className="mt-3 font-semibold">Generalization</h3>
                        <p className="mt-2 text-sm leading-6 text-[#B8F5DC]">
                          Does validation performance carry over to the official test set?
                        </p>
                      </div>
                    </Hint>
                  </div>
                </Panel>
              </>
            )}

            {activeTab === "Threshold Explorer" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
                <Panel>
                  <SectionTitle
                    title="Explore the alert threshold"
                    description="A prediction is flagged as an attack when its score is at least the selected threshold."
                  />
                  <div
                    className="rounded-xl border border-white/10 p-5"
                    style={{
                      background:
                        "radial-gradient(100% 80% at 0% 0%, rgba(255,255,255,0.06), transparent 60%), #0B1020",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <label htmlFor="threshold" className="text-sm font-medium">
                        Attack probability threshold
                      </label>
                      <span
                        className="rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold text-[#C9FFF6]"
                        style={glass("teal")}
                      >
                        {threshold.toFixed(3)}
                      </span>
                    </div>
                    <input
                      id="threshold"
                      type="range"
                      min="0.01"
                      max="0.99"
                      step="0.000001"
                      value={threshold}
                      onChange={(event) => setThreshold(Number(event.target.value))}
                      className="mt-6 w-full accent-[#2DE2C5]"
                    />
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span>0.01 · More sensitive</span>
                      <span>0.99 · More conservative</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border p-4" style={glass("teal")}>
                    <div className="flex gap-3">
                      <CircleHelp size={20} className="mt-0.5 shrink-0 text-[#2DE2C5]" />
                      <div>
                        <p className="font-semibold text-[#E4FFFB]">
                          {isFrozenThreshold ? "Original evaluated threshold" : "Exploration threshold"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#B7F7EE]">
                          {isFrozenThreshold
                            ? "This matches the frozen threshold used for the reported validation and test results."
                            : "Metrics on the right are recalculated from saved validation scores. These are validation results, not official test results."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Hint
                      align="left"
                      title="Why this value"
                      content="The lowest threshold that keeps validation false-positive rate at or below 5%, so the model catches as many attacks as possible within that alarm budget."
                    >
                      <div className="rounded-xl border border-white/10 p-4" style={panelStyle}>
                        <p className="text-xs text-slate-400">Frozen threshold</p>
                        <p className="mt-2 text-2xl font-semibold">{frozenThreshold.toFixed(6)}</p>
                        <p className="mt-1 text-xs text-slate-400">Chosen on validation data</p>
                      </div>
                    </Hint>
                    <Hint
                      align="right"
                      title="Why 5%"
                      content="A fixed false-alarm budget lets both models be compared fairly: same FPR, different recall."
                    >
                      <div className="rounded-xl border border-white/10 p-4" style={panelStyle}>
                        <p className="text-xs text-slate-400">Validation FPR constraint</p>
                        <p className="mt-2 text-2xl font-semibold">≤ 5%</p>
                        <p className="mt-1 text-xs text-slate-400">Threshold selection objective</p>
                      </div>
                    </Hint>
                  </div>
                </Panel>

                <Panel>
                  <SectionTitle
                    title="Live validation metrics"
                    description={`Calculated from ${validationScores.length.toLocaleString()} saved validation predictions at the selected threshold.`}
                  />

                  <label htmlFor="model-select" className="mb-2 block text-sm font-medium text-slate-200">
                    Model to explore
                  </label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(event) => {
                      const nextModel = event.target.value as "Random Forest" | "Logistic Regression";
                      setSelectedModel(nextModel);
                      setThreshold(nextModel === "Random Forest" ? 0.5571254829012706 : 0.624422);
                    }}
                    className="mb-5 w-full rounded-xl border border-white/10 bg-[#151D32] px-3 py-2.5 text-sm outline-none focus:border-[#2DE2C5]"
                  >
                    <option>Random Forest</option>
                    <option>Logistic Regression</option>
                  </select>

                  {scoresLoading ? (
                    <p className="rounded-xl bg-[#0B1020] p-4 text-sm text-slate-300">
                      Loading saved validation predictions…
                    </p>
                  ) : scoresError ? (
                    <div className="rounded-xl border p-4 text-sm leading-6 text-[#FFC0CA]" style={glass("rose")}>
                      <p className="font-semibold">Could not load validation scores</p>
                      <p className="mt-1">{scoresError}</p>
                      <p className="mt-2">
                        Confirm the file exists at <code>frontend/public/data/validation_scores.json</code>,
                        then refresh this page.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Tile
                          tint="green"
                          label="Attack recall"
                          value={pct(m.recall)}
                          large={false}
                          align="left"
                          hint={`Recall = TP / (TP + FN) = ${n(m.tp)} / ${n(m.tp + m.fn)}. Share of real attacks caught.`}
                        />
                        <Tile
                          tint="amber"
                          label="False-positive rate"
                          value={pct(m.fpr)}
                          large={false}
                          align="right"
                          hint={`FPR = FP / (FP + TN) = ${n(m.fp)} / ${n(m.fp + m.tn)}. Share of normal traffic wrongly flagged.`}
                        />
                        <Tile
                          tint="teal"
                          label="Precision"
                          value={pct(m.precision)}
                          large={false}
                          align="left"
                          hint={`Precision = TP / (TP + FP) = ${n(m.tp)} / ${n(m.tp + m.fp)}. Share of alerts that were real attacks.`}
                        />
                        <Tile
                          tint="violet"
                          label="F1-score"
                          value={pct(m.f1)}
                          large={false}
                          align="right"
                          hint="F1 = 2 · precision · recall / (precision + recall). The harmonic mean, so it drops if either one is low."
                        />
                      </div>

                      <h3 className="mt-6 font-semibold text-slate-100">Validation confusion matrix</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Counts are recalculated whenever the threshold changes.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <Tile
                          tint="green"
                          label="True negatives"
                          value={n(m.tn)}
                          large={false}
                          align="left"
                          hint="Normal records scored below the threshold."
                        />
                        <Tile
                          tint="amber"
                          label="False positives"
                          value={n(m.fp)}
                          large={false}
                          align="right"
                          hint="Normal records scored at or above the threshold. These are false alarms."
                        />
                        <Tile
                          tint="rose"
                          label="False negatives"
                          value={n(m.fn)}
                          large={false}
                          align="left"
                          hint="Attack records scored below the threshold. These are missed attacks."
                        />
                        <Tile
                          tint="teal"
                          label="True positives"
                          value={n(m.tp)}
                          large={false}
                          align="right"
                          hint="Attack records scored at or above the threshold."
                        />
                      </div>
                    </>
                  )}
                </Panel>
              </div>
            )}

            {activeTab === "Model Comparison" && (
              <>
                <Panel>
                  <SectionTitle
                    title="Validation model comparison"
                    description="Both models were evaluated with a threshold selected under the same 5% FPR constraint."
                  />
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={validationData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        {chartDefs}
                        <CartesianGrid stroke="#28344D" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="model" tick={{ fontSize: 12, fill: "#CBD5E1" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={{ color: "#2DE2C5", fontWeight: 600 }}
                          cursor={{ fill: "rgba(45, 226, 197, 0.08)" }}
                          formatter={(value) => `${value}%`}
                        />
                        <Legend />
                        <Bar dataKey="recall" name="Attack recall" fill="url(#gTeal)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="precision" name="Precision" fill="url(#gGreen)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="f1" name="F1-score" fill="url(#gViolet)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel className="mt-6 overflow-x-auto">
                  <SectionTitle
                    title="Validation metrics"
                    description="Recorded results from your training and validation pipeline."
                  />
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-slate-400">
                        <th className="px-3 py-3 font-medium">Model</th>
                        <th className="px-3 py-3 font-medium">Threshold</th>
                        <th className="px-3 py-3 font-medium">Recall</th>
                        <th className="px-3 py-3 font-medium">FPR</th>
                        <th className="px-3 py-3 font-medium">Precision</th>
                        <th className="px-3 py-3 font-medium">F1</th>
                        <th className="px-3 py-3 font-medium">Avg. precision</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/10 transition hover:bg-white/5">
                        <td className="px-3 py-4">Logistic Regression</td>
                        <td className="px-3 py-4 font-mono">0.624422</td>
                        <td className="px-3 py-4">89.53%</td>
                        <td className="px-3 py-4">5.00%</td>
                        <td className="px-3 py-4">97.45%</td>
                        <td className="px-3 py-4">93.32%</td>
                        <td className="px-3 py-4">99.20%</td>
                      </tr>
                      <tr
                        className="transition hover:brightness-125"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(167,139,250,0.20), rgba(167,139,250,0.06) 60%, transparent)",
                        }}
                      >
                        <td className="px-3 py-4 font-semibold">Random Forest</td>
                        <td className="px-3 py-4 font-mono">0.557125</td>
                        <td className="px-3 py-4">95.79%</td>
                        <td className="px-3 py-4">4.99%</td>
                        <td className="px-3 py-4">97.61%</td>
                        <td className="px-3 py-4">96.69%</td>
                        <td className="px-3 py-4">99.71%</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-4 text-xs leading-5 text-slate-400">
                    Average precision is displayed as a percentage. It is a ranking metric
                    calculated across score thresholds.
                  </p>
                </Panel>
              </>
            )}

            {activeTab === "Error Analysis" && (
              <>
                <Panel>
                  <SectionTitle
                    title="Attack-category recall"
                    description="Official test results at the frozen Random Forest threshold."
                  />
                  <div className="h-[390px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={attackData}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
                      >
                        {chartDefs}
                        <CartesianGrid stroke="#28344D" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={{ color: "#2DE2C5", fontWeight: 600 }}
                          cursor={{ fill: "rgba(45, 226, 197, 0.08)" }}
                          formatter={(value) => `${value}%`}
                        />
                        <Bar dataKey="recall" name="Recall" radius={[0, 6, 6, 0]}>
                          {attackData.map((item) => (
                            <Cell
                              key={item.category}
                              fill={item.category === "Fuzzers" ? "url(#gRoseH)" : "url(#gTealH)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 rounded-xl border p-4" style={glass("rose")}>
                    <p className="font-semibold text-[#FFE7EB]">Fuzzers: the clearest weakness</p>
                    <p className="mt-1 text-sm leading-6 text-[#FFC0CA]">
                      4,892 of 6,062 Fuzzer records were detected. The model missed 1,170, giving a
                      recall of 80.70%.
                    </p>
                  </div>
                </Panel>

                <Panel className="mt-6">
                  <SectionTitle
                    title="Normal-traffic attack-score distribution"
                    description="Higher scores on normal traffic can lead to more false alarms at a fixed threshold."
                  />
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreQuantiles} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid stroke="#28344D" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="quantile" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={{ color: "#2DE2C5", fontWeight: 600 }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="validation" name="Validation" stroke="#2DE2C5" strokeWidth={2.5} dot />
                        <Line type="monotone" dataKey="test" name="Official test" stroke="#FFBF69" strokeWidth={2.5} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    These are score quantiles for normal records only, not attack-category scores.
                    They describe the distribution shift; they do not establish its cause.
                  </p>
                </Panel>

                <Panel className="mt-6 overflow-x-auto">
                  <SectionTitle
                    title="Category-level details"
                    description="Counts and recall on the official test set."
                  />
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-slate-400">
                        <th className="px-3 py-3 font-medium">Attack category</th>
                        <th className="px-3 py-3 font-medium">Records</th>
                        <th className="px-3 py-3 font-medium">Missed</th>
                        <th className="px-3 py-3 font-medium">Recall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attackData.map((item) => (
                        <tr
                          key={item.category}
                          className="border-b border-white/10 transition hover:bg-white/5 last:border-0"
                        >
                          <td className="px-3 py-3 font-medium">{item.category}</td>
                          <td className="px-3 py-3">{item.records.toLocaleString()}</td>
                          <td
                            className={`px-3 py-3 ${item.missed > 100 ? "font-semibold text-[#FF647C]" : ""}`}
                          >
                            {item.missed.toLocaleString()}
                          </td>
                          <td className="px-3 py-3">{item.recall.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              </>
            )}

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-xs text-slate-400">
              <p>Network Intrusion Detection · UNSW-NB15</p>
              <p>Research dashboard · Offline evaluation only</p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}