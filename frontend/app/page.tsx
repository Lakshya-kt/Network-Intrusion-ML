
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
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Tab =
  | "Overview"
  | "Threshold Explorer"
  | "Model Comparison"
  | "Error Analysis";

type ModelName =
  | "Logistic Regression"
  | "Random Forest"
  | "Linear SVC";

type ValidationRow = {
  label: number;
  logistic_regression_score: number;
  random_forest_score: number;
  linear_svc_score: number;
};

type ValidationModelResult = {
  model: ModelName;
  threshold: number;
  validation_recall: number;
  validation_fpr: number;
  validation_precision: number;
  validation_f1: number;
  validation_average_precision: number;
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

/* ------------------------------------------------------------------ */
/* Dataset results                                                     */
/* ------------------------------------------------------------------ */

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
/* Platinum background theme                                          */
/* ------------------------------------------------------------------ */

const pageStyle: CSSProperties = {
  background: [
    "radial-gradient(ellipse 55% 40% at 90% 0%, rgba(196,174,133,0.16), transparent 75%)",
    "radial-gradient(ellipse 55% 45% at 0% 100%, rgba(183,192,202,0.30), transparent 75%)",
    "radial-gradient(ellipse 40% 30% at 50% 50%, rgba(255,255,255,0.9), transparent 80%)",
    "linear-gradient(135deg, #E6E9ED 0%, #F4F5F6 40%, #E2E5E9 100%)",
  ].join(", "),
};

const panelStyle: CSSProperties = {
  background: [
    "radial-gradient(100% 80% at 0% 0%, rgba(255,255,255,0.95), transparent 65%)",
    "linear-gradient(145deg, #FFFFFF 0%, #F4F5F6 55%, #EAEDF0 100%)",
  ].join(", "),
  borderColor: "#D9DDE2",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 28px -18px rgba(48,55,65,0.32), 0 2px 6px rgba(48,55,65,0.04)",
};

const sidebarStyle: CSSProperties = {
  background: [
    "radial-gradient(100% 40% at 0% 0%, rgba(255,255,255,0.95), transparent 75%)",
    "linear-gradient(180deg, #F8F9FA 0%, #E9ECEF 100%)",
  ].join(", "),
  boxShadow: "4px 0 24px rgba(45,52,60,0.045)",
};

const headerStyle: CSSProperties = {
  background: [
    "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(246,247,248,0.92))",
  ].join(", "),
  boxShadow: "0 2px 12px rgba(40,45,55,0.035)",
};

const platinumActiveStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, #FFFFFF 0%, #E9E4DA 100%)",
  borderColor: "#C8B58F",
  color: "#6A5433",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 12px rgba(65,55,40,0.09)",
};

const platinumLogoStyle: CSSProperties = {
  background:
    "linear-gradient(145deg, #4A5059 0%, #20252B 55%, #737B84 100%)",
  borderColor: "#B5A078",
  color: "#F6EBD7",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px rgba(35,40,48,0.20)",
};

const platinumInsetStyle: CSSProperties = {
  background:
    "linear-gradient(145deg, #F5F6F7 0%, #E8EBEE 100%)",
  borderColor: "#D7DCE1",
  boxShadow:
    "inset 0 2px 5px rgba(50,55,65,0.06), inset 0 1px 0 white",
};

/* ------------------------------------------------------------------ */
/* Existing information-card colour system                            */
/* These colours and all chart colours are intentionally preserved.    */
/* ------------------------------------------------------------------ */

type TintName = "teal" | "green" | "amber" | "rose" | "violet";

const TINTS: Record<
  TintName,
  { base: string; deep: string; glow: string; label: string; value: string }
> = {
  teal: {
    base: "#16414A",
    deep: "#0B222A",
    glow: "#2DE2C5",
    label: "#8BEBDD",
    value: "#E4FFFB",
  },
  green: {
    base: "#194A41",
    deep: "#0C2622",
    glow: "#42D6A4",
    label: "#8BE7C5",
    value: "#E2FFF4",
  },
  amber: {
    base: "#4B3B22",
    deep: "#261C0F",
    glow: "#FFBF69",
    label: "#FFD08A",
    value: "#FFF3DF",
  },
  rose: {
    base: "#4F2535",
    deep: "#26121B",
    glow: "#FF647C",
    label: "#FF9EAE",
    value: "#FFE7EB",
  },
  violet: {
    base: "#342E5C",
    deep: "#191533",
    glow: "#A78BFA",
    label: "#D5C8FF",
    value: "#F3EEFF",
  },
};

function glass(name: TintName): CSSProperties {
  const t = TINTS[name];

  return {
    background: [
      "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.07) 30%, transparent 58%)",
      `radial-gradient(90% 90% at 100% 100%, ${t.glow}40 0%, transparent 62%)`,
      `linear-gradient(145deg, ${t.base} 0%, ${t.deep} 100%)`,
    ].join(", "),
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.30)",
      `inset 0 -14px 26px -18px ${t.glow}80`,
      `0 14px 28px -16px ${t.glow}66`,
    ].join(", "),
    borderColor: `${t.glow}55`,
  };
}

/* ------------------------------------------------------------------ */
/* Chart colors: unchanged                                             */
/* ------------------------------------------------------------------ */

const tooltipStyle: CSSProperties = {
  background:
    "linear-gradient(145deg, rgba(30,40,66,0.97), rgba(11,16,32,0.97))",
  border: "1px solid rgba(45,226,197,0.35)",
  borderRadius: 12,
  color: "#F8FAFC",
  padding: 12,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 36px -12px rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
};

function grad(
  id: string,
  light: string,
  mid: string,
  deep: string,
  horizontal = false
) {
  return (
    <linearGradient
      id={id}
      x1="0"
      y1="0"
      x2={horizontal ? "1" : "0"}
      y2={horizontal ? "0" : "1"}
    >
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
    {grad("gTealH", "#127A6D", "#2DE2C5", "#C9FFF6", true)}
    {grad("gRoseH", "#9E2A41", "#FF647C", "#FFD0D8", true)}
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
      className={`group relative outline-none transition duration-200 motion-reduce:transition-none hover:z-50 hover:-translate-y-1 focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-[#B89B68]/60 rounded-2xl ${className}`}
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

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${className}`}
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
      <div
        className={`rounded-xl border ${large ? "p-5" : "p-4"}`}
        style={glass(tint)}
      >
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
      "Recall = TP / (TP + FN). Test counts: TP 44,066; FN 1,266; 45,332 attack records total.",
    "Test false-positive rate":
      "FPR = FP / (FP + TN). Test counts: FP 6,912; TN 30,088; 37,000 normal records total.",
    "Test precision":
      "Precision = TP / (TP + FP). Test counts: TP 44,066 and FP 6,912.",
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

            <p
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ color: t.value }}
            >
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

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight text-[#252A30]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main dashboard                                                      */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const [selectedModel, setSelectedModel] =
    useState<ModelName>("Random Forest");

  const [threshold, setThreshold] = useState<number | null>(null);

  const [validationScores, setValidationScores] =
    useState<ValidationRow[]>([]);

  const [modelResults, setModelResults] =
    useState<ValidationModelResult[]>([]);

  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState("");

  /* -------------------------------------------------------------- */
  /* Load Python-generated files                                    */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    Promise.all([
      fetch(`${basePath}/data/validation_scores.json`),
      fetch(`${basePath}/data/validation_model_comparison.json`),
    ])
      .then(async ([scoresResponse, comparisonResponse]) => {
        if (!scoresResponse.ok) {
          throw new Error(
            `Could not load validation_scores.json (HTTP ${scoresResponse.status}).`
          );
        }

        if (!comparisonResponse.ok) {
          throw new Error(
            `Could not load validation_model_comparison.json (HTTP ${comparisonResponse.status}).`
          );
        }

        const [scores, comparison] = await Promise.all([
          scoresResponse.json(),
          comparisonResponse.json(),
        ]);

        if (!Array.isArray(scores) || scores.length === 0) {
          throw new Error("Validation scores are empty or invalid.");
        }

        if (!Array.isArray(comparison) || comparison.length === 0) {
          throw new Error("Model comparison data is empty or invalid.");
        }

        const requiredColumns = [
          "label",
          "logistic_regression_score",
          "random_forest_score",
          "linear_svc_score",
        ];

        if (!requiredColumns.every((key) => key in scores[0])) {
          throw new Error(
            "The validation score file does not contain all three model scores. Run the updated Python script."
          );
        }

        setValidationScores(scores as ValidationRow[]);
        setModelResults(comparison as ValidationModelResult[]);
        setScoresError("");
      })
      .catch((error: unknown) => {
        setScoresError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred while loading validation data."
        );
      })
      .finally(() => setScoresLoading(false));
  }, []);

  /* -------------------------------------------------------------- */
  /* Selected model and threshold                                   */
  /* -------------------------------------------------------------- */

  const selectedResult = modelResults.find(
    (result) => result.model === selectedModel
  );

  const frozenThreshold = selectedResult?.threshold ?? 0;

  const activeThreshold = threshold ?? frozenThreshold;

  const isFrozenThreshold =
    Math.abs(activeThreshold - frozenThreshold) < 1e-9;

  const scoreKey =
    selectedModel === "Random Forest"
      ? "random_forest_score"
      : selectedModel === "Logistic Regression"
        ? "logistic_regression_score"
        : "linear_svc_score";

  /* -------------------------------------------------------------- */
  /* Slider range                                                   */
  /* -------------------------------------------------------------- */

  const scoreRange = useMemo(() => {
    if (validationScores.length === 0) {
      return { min: 0, max: 1 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const row of validationScores) {
      const value = row[scoreKey];

      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 1 };
    }

    const margin = Math.max((max - min) * 0.02, 1e-6);

    return {
      min: min - margin,
      max: max + margin,
    };
  }, [validationScores, scoreKey]);

  /* -------------------------------------------------------------- */
  /* Live validation metrics                                        */
  /* -------------------------------------------------------------- */

  const thresholdMetrics = useMemo<ThresholdMetrics>(() => {
    let tn = 0;
    let fp = 0;
    let fn = 0;
    let tp = 0;

    for (const row of validationScores) {
      const predictedAttack = row[scoreKey] >= activeThreshold;

      if (row.label === 1 && predictedAttack) tp++;
      else if (row.label === 1 && !predictedAttack) fn++;
      else if (row.label === 0 && predictedAttack) fp++;
      else tn++;
    }

    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;

    const f1 =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    return { tn, fp, fn, tp, recall, fpr, precision, f1 };
  }, [validationScores, scoreKey, activeThreshold]);

  /* -------------------------------------------------------------- */
  /* Dynamic model comparison                                       */
  /* -------------------------------------------------------------- */

  const comparisonChartData = modelResults.map((result) => ({
    model: result.model,
    recall: result.validation_recall * 100,
    fpr: result.validation_fpr * 100,
    precision: result.validation_precision * 100,
    f1: result.validation_f1 * 100,
    averagePrecision: result.validation_average_precision * 100,
  }));

  const m = thresholdMetrics;

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const n = (v: number) => v.toLocaleString();

  /* ================================================================ */
  /* PAGE                                                              */
  /* ================================================================ */

  return (
    <main
      className="min-h-screen text-[#252A30]"
      style={pageStyle}
    >
      <div className="flex min-h-screen">

        {/* -------------------------------------------------------- */}
        {/* SIDEBAR                                                  */}
        {/* -------------------------------------------------------- */}

        <aside
          className="hidden w-64 shrink-0 flex-col border-r border-[#D6DBE1] p-5 lg:flex"
          style={sidebarStyle}
        >
          <div className="flex items-center gap-3 px-2 py-3">
            <div
              className="rounded-xl border p-2.5"
              style={platinumLogoStyle}
            >
              <Network size={23} />
            </div>

            <div>
              <h1 className="font-semibold tracking-tight text-[#252A30]">
                NetGuard ML
              </h1>
              <p className="text-xs text-slate-500">
                Research dashboard
              </p>
            </div>
          </div>

          <div className="mt-10">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Workspace
            </p>

            <nav className="space-y-1">
              {navItems.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  style={
                    activeTab === label
                      ? platinumActiveStyle
                      : undefined
                  }
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                    activeTab === label
                      ? "text-[#6A5433]"
                      : "border-transparent text-slate-600 hover:border-[#E0D8CA] hover:bg-white/70 hover:text-[#252A30]"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div
            className="mt-auto rounded-2xl border border-[#D6DBE1] p-4"
            style={panelStyle}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[#333942]">
              <Database size={17} className="text-[#A78955]" />
              Dataset
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              UNSW-NB15 · 175,341 training records
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-[#278A68]">
              <span className="h-2 w-2 rounded-full bg-[#42D6A4]" />
              {scoresLoading
                ? "Loading results..."
                : scoresError
                  ? "Data loading error"
                  : "Experiment results loaded"}
            </div>
          </div>
        </aside>

        {/* -------------------------------------------------------- */}
        {/* MAIN CONTENT                                             */}
        {/* -------------------------------------------------------- */}

        <div className="min-w-0 flex-1">

          {/* Header */}

          <header
            className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D6DBE1] px-5 py-4 sm:px-8"
            style={headerStyle}
          >
            <div>
              <p className="text-xs font-semibold tracking-widest text-[#9A7B4C]">
                MACHINE LEARNING / SECURITY
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#252A30]">
                Network Intrusion Detection
              </h2>
            </div>

            <div
              className="flex items-center gap-2 rounded-full border border-[#D7CCB8] bg-[#F4EFE6] px-3 py-2 text-xs font-semibold text-[#6F5733]"
            >
              <span className="h-2 w-2 rounded-full bg-[#42D6A4]" />
              Offline evaluation
              <ChevronDown size={14} />
            </div>
          </header>

          {/* Mobile navigation */}

          <div
            className="border-b border-[#D6DBE1] px-4 py-3 lg:hidden"
            style={headerStyle}
          >
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  style={
                    activeTab === label
                      ? platinumActiveStyle
                      : undefined
                  }
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium ${
                    activeTab === label
                      ? "text-[#6A5433]"
                      : "border-[#E0E3E7] bg-white/70 text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-7xl p-4 sm:p-8">

            {/* Page heading */}

            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-widest text-[#A18456]">
                  UNSW-NB15 BENCHMARK
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#252A30] sm:text-3xl">
                  {activeTab}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Understand how alert thresholds affect intrusion detection,
                  false alarms and generalization to unseen traffic.
                </p>
              </div>

              <div
                className="rounded-xl border px-4 py-3"
                style={panelStyle}
              >
                <p className="text-xs text-slate-500">
                  Selected model
                </p>

                <p className="mt-1 font-semibold text-[#252A30]">
                  {selectedModel}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Frozen threshold:{" "}
                  {selectedResult
                    ? frozenThreshold.toFixed(6)
                    : scoresLoading
                      ? "Loading..."
                      : "Unavailable"}
                </p>
              </div>
            </div>

            {/* Data error */}

            {scoresError && (
              <div
                className="mb-6 rounded-xl border p-4 text-sm leading-6 text-[#FFC0CA]"
                style={glass("rose")}
              >
                <p className="font-semibold">
                  Could not load experiment data
                </p>
                <p className="mt-1">{scoresError}</p>
                <p className="mt-2">
                  Check that both JSON files exist inside
                  frontend/public/data/, then refresh the page.
                </p>
              </div>
            )}

            {/* ==================================================== */}
            {/* OVERVIEW                                              */}
            {/* ==================================================== */}

            {activeTab === "Overview" && (
              <>
                <p className="mb-4 text-xs font-medium text-slate-500">
                  Official test snapshot: Random Forest at its frozen
                  validation-selected threshold.
                </p>

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

                  {/* Validation vs test */}

                  <Panel>
                    <SectionTitle
                      title="Validation vs. test"
                      description="Random Forest results at the same frozen threshold."
                    />

                    <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-600">
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
                            {
                              metric: "Attack recall",
                              validation: 95.79,
                              test: 97.21,
                            },
                            {
                              metric: "False-positive rate",
                              validation: 4.99,
                              test: 18.68,
                            },
                          ]}
                          margin={{
                            top: 10,
                            right: 10,
                            left: 0,
                            bottom: 5,
                          }}
                        >
                          {chartDefs}

                          <CartesianGrid
                            stroke="#DCE1E6"
                            strokeDasharray="3 3"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="metric"
                            tick={{ fontSize: 11, fill: "#64748B" }}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                          />

                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{
                              color: "#2DE2C5",
                              fontWeight: 600,
                            }}
                            itemStyle={{ color: "#E2E8F0" }}
                            cursor={{
                              fill: "rgba(45,226,197,0.08)",
                            }}
                          />

                          <Bar
                            dataKey="validation"
                            name="Validation"
                            fill="url(#gTeal)"
                            radius={[6, 6, 0, 0]}
                          />

                          <Bar
                            dataKey="test"
                            name="Official test"
                            fill="url(#gAmber)"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <p
                      className="mt-3 rounded-xl border p-3 text-sm leading-6 text-[#FFE9C7]"
                      style={glass("amber")}
                    >
                      The test false-positive rate is 13.69 percentage points
                      higher than validation, despite using the same frozen
                      threshold.
                    </p>
                  </Panel>

                  {/* Confusion matrix */}

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
                        hint="30,088 of 37,000 normal records correctly identified."
                      />

                      <Tile
                        tint="amber"
                        label="False positives"
                        value="6,912"
                        note="Normal flagged as attack"
                        align="right"
                        hint="False alarms. FPR = 6,912 / 37,000 = 18.68%."
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

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      Official test set: 82,332 records.
                    </p>
                  </Panel>
                </div>

                {/* Research objectives */}

                <Panel className="mt-6">
                  <SectionTitle
                    title="What this experiment investigates"
                    description="Beyond accuracy: evaluating intrusion detection under different alert thresholds."
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <Hint
                      content="Measured with recall: of all real attacks, how many cross the alert threshold."
                      title="How it is measured"
                    >
                      <div className="rounded-xl border p-4" style={glass("teal")}>
                        <Target className="text-[#2DE2C5]" size={21} />

                        <h3 className="mt-3 font-semibold">
                          Detection performance
                        </h3>

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

                        <h3 className="mt-3 font-semibold">
                          False-alarm cost
                        </h3>

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

                        <h3 className="mt-3 font-semibold">
                          Generalization
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#B8F5DC]">
                          Does validation performance carry over to unseen traffic?
                        </p>
                      </div>
                    </Hint>
                  </div>
                </Panel>
              </>
            )}

            {/* ==================================================== */}
            {/* THRESHOLD EXPLORER                                    */}
            {/* ==================================================== */}

            {activeTab === "Threshold Explorer" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">

                {/* Left panel */}

                <Panel>
                  <SectionTitle
                    title="Explore the alert threshold"
                    description="A record is flagged as an attack when its model score is at least the selected threshold."
                  />

                  {scoresLoading ? (
                    <p className="rounded-xl border border-[#D9DDE2] bg-white p-4 text-sm text-slate-600">
                      Loading saved validation predictions...
                    </p>
                  ) : !scoresError && validationScores.length > 0 ? (
                    <>
                      <div
                        className="rounded-xl border p-5"
                        style={platinumInsetStyle}
                      >
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="threshold"
                            className="text-sm font-semibold text-[#303640]"
                          >
                            Attack score threshold
                          </label>

                          <span
                            className="rounded-lg border border-[#C8B58F] bg-[#F4EFE6] px-3 py-1.5 font-mono text-sm font-semibold text-[#705833]"
                          >
                            {activeThreshold.toFixed(6)}
                          </span>
                        </div>

                        <input
                          id="threshold"
                          type="range"
                          min={scoreRange.min}
                          max={scoreRange.max}
                          step="any"
                          value={activeThreshold}
                          onChange={(event) =>
                            setThreshold(Number(event.target.value))
                          }
                          className="mt-6 w-full accent-[#B89B68]"
                        />

                        <div className="mt-2 flex justify-between text-xs text-slate-500">
                          <span>Lower score · More alerts</span>
                          <span>Higher score · Fewer alerts</span>
                        </div>

                        <p className="mt-4 text-xs leading-5 text-slate-500">
                          {selectedModel === "Linear SVC"
                            ? "Linear SVC uses decision scores, which may be negative or positive. These are not probabilities."
                            : "Logistic Regression and Random Forest use attack probability scores."}
                        </p>
                      </div>

                      <div className="mt-5 rounded-xl border p-4" style={glass("teal")}>
                        <div className="flex gap-3">
                          <CircleHelp
                            size={20}
                            className="mt-0.5 shrink-0 text-[#2DE2C5]"
                          />

                          <div>
                            <p className="font-semibold text-[#E4FFFB]">
                              {isFrozenThreshold
                                ? "Original evaluated threshold"
                                : "Exploration threshold"}
                            </p>

                            <p className="mt-1 text-sm leading-6 text-[#B7F7EE]">
                              {isFrozenThreshold
                                ? "This matches the threshold selected for this model using validation data."
                                : "Metrics on the right are recalculated from saved validation scores. These are validation results, not official test results."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Hint
                          align="left"
                          title="Why this value"
                          content="The threshold was selected on validation data to maximize recall while keeping false-positive rate at or below 5%."
                        >
                          <div
                            className="rounded-xl border border-[#D9DDE2] p-4"
                            style={panelStyle}
                          >
                            <p className="text-xs text-slate-500">
                              Frozen threshold
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-[#252A30]">
                              {frozenThreshold.toFixed(6)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Chosen on validation data
                            </p>
                          </div>
                        </Hint>

                        <Hint
                          align="right"
                          title="Why 5%"
                          content="A fixed false-alarm budget allows all models to be compared under the same validation FPR constraint."
                        >
                          <div
                            className="rounded-xl border border-[#D9DDE2] p-4"
                            style={panelStyle}
                          >
                            <p className="text-xs text-slate-500">
                              Validation FPR constraint
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-[#252A30]">
                              ≤ 5%
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Threshold selection objective
                            </p>
                          </div>
                        </Hint>
                      </div>
                    </>
                  ) : null}
                </Panel>

                {/* Right panel */}

                <Panel>
                  <SectionTitle
                    title="Live validation metrics"
                    description={`Calculated from ${validationScores.length.toLocaleString()} saved validation predictions at the selected threshold.`}
                  />

                  <label
                    htmlFor="model-select"
                    className="mb-2 block text-sm font-semibold text-[#303640]"
                  >
                    Model to explore
                  </label>

                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(event) => {
                      setSelectedModel(event.target.value as ModelName);
                      setThreshold(null);
                    }}
                    disabled={scoresLoading || Boolean(scoresError)}
                    className="mb-5 w-full rounded-xl border border-[#D1D6DC] bg-white px-3 py-2.5 text-sm text-[#303640] outline-none focus:border-[#B89B68] disabled:opacity-50"
                  >
                    <option value="Random Forest">Random Forest</option>
                    <option value="Logistic Regression">Logistic Regression</option>
                    <option value="Linear SVC">Linear SVC</option>
                  </select>

                  {scoresLoading ? (
                    <p className="rounded-xl border border-[#D9DDE2] bg-white p-4 text-sm text-slate-600">
                      Loading validation predictions...
                    </p>
                  ) : scoresError ? (
                    <div
                      className="rounded-xl border p-4 text-sm leading-6 text-[#FFC0CA]"
                      style={glass("rose")}
                    >
                      Could not load validation results. Check your JSON files.
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
                          hint={`Recall = TP / (TP + FN) = ${n(m.tp)} / ${n(m.tp + m.fn)}. Share of real attacks detected.`}
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
                          hint="F1 is the harmonic mean of precision and recall."
                        />
                      </div>

                      <h3 className="mt-6 font-semibold text-[#303640]">
                        Validation confusion matrix
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
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
                          hint="Normal records scored at or above the threshold."
                        />

                        <Tile
                          tint="rose"
                          label="False negatives"
                          value={n(m.fn)}
                          large={false}
                          align="left"
                          hint="Attack records scored below the threshold."
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

            {/* ==================================================== */}
            {/* MODEL COMPARISON                                      */}
            {/* ==================================================== */}

            {activeTab === "Model Comparison" && (
              <>
                {scoresLoading ? (
                  <Panel>
                    <p className="text-sm text-slate-600">
                      Loading model comparison results...
                    </p>
                  </Panel>
                ) : scoresError ? (
                  <Panel>
                    <p className="text-sm text-[#C24157]">
                      Could not load model comparison data.
                    </p>
                  </Panel>
                ) : (
                  <>
                    <Panel>
                      <SectionTitle
                        title="Validation model comparison"
                        description="All three models were evaluated with thresholds selected under the same 5% FPR constraint."
                      />

                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={comparisonChartData}
                            margin={{
                              top: 10,
                              right: 10,
                              left: 0,
                              bottom: 10,
                            }}
                          >
                            {chartDefs}

                            <CartesianGrid
                              stroke="#DCE1E6"
                              strokeDasharray="3 3"
                              vertical={false}
                            />

                            <XAxis
                              dataKey="model"
                              tick={{ fontSize: 11, fill: "#64748B" }}
                              interval={0}
                            />

                            <YAxis
                              domain={[0, 100]}
                              tick={{ fontSize: 11, fill: "#64748B" }}
                            />

                            <Tooltip
                              contentStyle={tooltipStyle}
                              labelStyle={{
                                color: "#2DE2C5",
                                fontWeight: 600,
                              }}
                              cursor={{
                                fill: "rgba(45,226,197,0.08)",
                              }}
                              formatter={(value) => `${value}%`}
                            />

                            <Legend />

                            <Bar
                              dataKey="recall"
                              name="Attack recall"
                              fill="url(#gTeal)"
                              radius={[6, 6, 0, 0]}
                            />

                            <Bar
                              dataKey="precision"
                              name="Precision"
                              fill="url(#gGreen)"
                              radius={[6, 6, 0, 0]}
                            />

                            <Bar
                              dataKey="f1"
                              name="F1-score"
                              fill="url(#gViolet)"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>

                    <Panel className="mt-6 overflow-x-auto">
                      <SectionTitle
                        title="Validation metrics"
                        description="Results loaded directly from the Python model comparison output."
                      />

                      <table className="w-full min-w-[750px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#DCE1E6] text-xs text-slate-500">
                            <th className="px-3 py-3 font-semibold">Model</th>
                            <th className="px-3 py-3 font-semibold">Threshold</th>
                            <th className="px-3 py-3 font-semibold">Recall</th>
                            <th className="px-3 py-3 font-semibold">FPR</th>
                            <th className="px-3 py-3 font-semibold">Precision</th>
                            <th className="px-3 py-3 font-semibold">F1</th>
                            <th className="px-3 py-3 font-semibold">Avg. precision</th>
                          </tr>
                        </thead>

                        <tbody>
                          {modelResults.map((result) => (
                            <tr
                              key={result.model}
                              className="border-b border-[#E4E7EB] text-[#374151] transition hover:bg-[#F1EEE8] last:border-0"
                            >
                              <td className="px-3 py-4 font-semibold">
                                {result.model}
                              </td>

                              <td className="px-3 py-4 font-mono">
                                {result.threshold.toFixed(6)}
                              </td>

                              <td className="px-3 py-4">
                                {(result.validation_recall * 100).toFixed(2)}%
                              </td>

                              <td className="px-3 py-4">
                                {(result.validation_fpr * 100).toFixed(2)}%
                              </td>

                              <td className="px-3 py-4">
                                {(result.validation_precision * 100).toFixed(2)}%
                              </td>

                              <td className="px-3 py-4">
                                {(result.validation_f1 * 100).toFixed(2)}%
                              </td>

                              <td className="px-3 py-4">
                                {(result.validation_average_precision * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <p className="mt-4 text-xs leading-5 text-slate-500">
                        Average precision is displayed as a percentage. It is
                        calculated across score thresholds.
                      </p>
                    </Panel>
                  </>
                )}
              </>
            )}

            {/* ==================================================== */}
            {/* ERROR ANALYSIS                                        */}
            {/* ==================================================== */}

            {activeTab === "Error Analysis" && (
              <>
                <p className="mb-4 text-xs font-medium text-slate-500">
                  The following official test results are from the Random Forest evaluation.
                </p>

                {/* Attack category chart */}

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
                        margin={{
                          top: 5,
                          right: 25,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        {chartDefs}

                        <CartesianGrid
                          stroke="#DCE1E6"
                          strokeDasharray="3 3"
                          horizontal={false}
                        />

                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "#64748B" }}
                        />

                        <YAxis
                          type="category"
                          dataKey="category"
                          width={110}
                          tick={{ fontSize: 11, fill: "#64748B" }}
                        />

                        <Tooltip
                          cursor={{
                            fill: "rgba(224,176,255,0.07)",
                          }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const d = payload[0].payload as (typeof attackData)[number];

                            return (
                              <div
                                className="rounded-xl border border-[#2DE2C5]/40 px-4 py-3 text-xs leading-5 text-slate-200"
                                style={tooltipStyle}
                              >
                                <p className="mb-1 font-semibold text-[#2DE2C5]">
                                  {d.category}
                                </p>

                                <p>
                                  Recall:{" "}
                                  <span className="font-semibold text-white">
                                    {d.recall.toFixed(2)}%
                                  </span>
                                </p>

                                <p>
                                  Records: {d.records.toLocaleString()}
                                </p>

                                <p>
                                  Missed: {d.missed.toLocaleString()}
                                </p>
                              </div>
                            );
                          }}
                        />

                        <Bar
                          dataKey="recall"
                          name="Recall"
                          barSize={20}
                          radius={[10, 10, 10, 10]}
                          background={{
                            fill: "rgba(100,116,139,0.09)",
                            radius: 10,
                          }}
                        >
                          {attackData.map((item) => (
                            <Cell
                              key={item.category}
                              fill={
                                item.category === "Fuzzers"
                                  ? "url(#gRoseH)"
                                  : "url(#gTealH)"
                              }
                            />
                          ))}

                          <LabelList
                            dataKey="recall"
                            position="insideRight"
                            formatter={(v) => `${Number(v).toFixed(1)}%`}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              fill: "#0B1020",
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 rounded-xl border p-4" style={glass("rose")}>
                    <p className="font-semibold text-[#FFE7EB]">
                      Fuzzers: the clearest weakness
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#FFC0CA]">
                      4,892 of 6,062 Fuzzer records were detected.
                      The model missed 1,170, giving a recall of 80.70%.
                    </p>
                  </div>
                </Panel>

                {/* Normal score distribution */}

                <Panel className="mt-6">
                  <SectionTitle
                    title="Normal-traffic attack-score distribution"
                    description="Random Forest score quantiles for normal traffic in validation and test data."
                  />

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={scoreQuantiles}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          stroke="#DCE1E6"
                          strokeDasharray="3 3"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="quantile"
                          tick={{ fontSize: 11, fill: "#64748B" }}
                        />

                        <YAxis
                          domain={[0, 1]}
                          tick={{ fontSize: 11, fill: "#64748B" }}
                        />

                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelStyle={{
                            color: "#2DE2C5",
                            fontWeight: 600,
                          }}
                        />

                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="validation"
                          name="Validation"
                          stroke="#2DE2C5"
                          strokeWidth={2.5}
                          dot
                        />

                        <Line
                          type="monotone"
                          dataKey="test"
                          name="Official test"
                          stroke="#FFBF69"
                          strokeWidth={2.5}
                          dot
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    These are score quantiles for normal records only, not
                    attack-category scores. They describe the distribution
                    shift; they do not establish its cause.
                  </p>
                </Panel>

                {/* Category table */}

                <Panel className="mt-6 overflow-x-auto">
                  <SectionTitle
                    title="Category-level details"
                    description="Random Forest counts and recall on the official test set."
                  />

                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#DCE1E6] text-xs text-slate-500">
                        <th className="px-3 py-3 font-semibold">
                          Attack category
                        </th>
                        <th className="px-3 py-3 font-semibold">Records</th>
                        <th className="px-3 py-3 font-semibold">Missed</th>
                        <th className="px-3 py-3 font-semibold">Recall</th>
                      </tr>
                    </thead>

                    <tbody>
                      {attackData.map((item) => (
                        <tr
                          key={item.category}
                          className="border-b border-[#E4E7EB] text-[#374151] transition hover:bg-[#F1EEE8] last:border-0"
                        >
                          <td className="px-3 py-3 font-semibold">
                            {item.category}
                          </td>

                          <td className="px-3 py-3">
                            {item.records.toLocaleString()}
                          </td>

                          <td
                            className={`px-3 py-3 ${
                              item.missed > 100
                                ? "font-semibold text-[#D94B65]"
                                : ""
                            }`}
                          >
                            {item.missed.toLocaleString()}
                          </td>

                          <td className="px-3 py-3">
                            {item.recall.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              </>
            )}

            {/* ---------------------------------------------------- */}
            {/* FOOTER                                                */}
            {/* ---------------------------------------------------- */}

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#D4D9DF] py-5 text-xs text-slate-500">
              <p>Network Intrusion Detection · UNSW-NB15</p>
              <p>Research dashboard · Offline evaluation only</p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}