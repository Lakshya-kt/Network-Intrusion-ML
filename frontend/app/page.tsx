
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Database,
  Gauge,
  LayoutDashboard,
  Network,
  ShieldAlert,
  ShieldCheck,
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
  { category: "Fuzzers", recall: 80.70, records: 6062, missed: 1170 },
  { category: "Shellcode", recall: 98.15, records: 378, missed: 7 },
  { category: "Exploits", recall: 99.33, records: 11132, missed: 75 },
  { category: "Analysis", recall: 99.70, records: 677, missed: 2 },
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

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "blue" | "green" | "orange" | "red";
}) {
  const tones = {
    blue: "bg-[#12343B] text-[#2DE2C5]",
    green: "bg-[#153B36] text-[#42D6A4]",
    orange: "bg-[#3B3020] text-[#FFBF69]",
    red: "bg-[#3D202D] text-[#FF647C]",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151D32] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
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
      <h2 className="text-lg font-semibold tracking-tight text-slate-100">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [threshold, setThreshold] = useState(0.5571254829);
  const [selectedModel, setSelectedModel] = useState<"Random Forest" | "Logistic Regression">("Random Forest");
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

  const frozenThreshold =
    selectedModel === "Random Forest" ? 0.5571254829012706 : 0.624422;
  const isFrozenThreshold = Math.abs(threshold - frozenThreshold) < 0.0005;
  const scoreKey =
    selectedModel === "Random Forest"
      ? "random_forest_score"
      : "logistic_regression_score";

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
    const f1 = precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

    return { tn, fp, fn, tp, recall, fpr, precision, f1 };
  }, [validationScores, scoreKey, threshold]);

  return (
    <main className="min-h-screen bg-[#0B1020] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#151D32] p-5 lg:flex">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="rounded-xl bg-[#2DE2C5] p-2.5 text-white">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    activeTab === label
                      ? "bg-[#12343B] text-[#8BEBDD]"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto rounded-2xl border border-white/10 bg-[#0B1020] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database size={17} className="text-[#2DE2C5]" />
              Dataset
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              UNSW-NB15 · 175,341 training records
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#42D6A4]">
              <span className="h-2 w-2 rounded-full bg-[#42D6A4]" />
              Experiment results loaded
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#151D32] px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs font-medium text-slate-400">
                MACHINE LEARNING / SECURITY
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Network Intrusion Detection
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-300">
              <span className="h-2 w-2 rounded-full bg-[#42D6A4]" />
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
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${
                    activeTab === label
                      ? "bg-[#2DE2C5] text-[#0B1020]"
                      : "bg-[#202A43] text-slate-300"
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
                <p className="text-sm font-medium text-[#2DE2C5]">
                  UNSW-NB15 BENCHMARK
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {activeTab}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Understand how alert thresholds affect intrusion detection,
                  false alarms and generalization to unseen traffic.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#151D32] px-4 py-3">
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
                    tone="green"
                  />
                  <MetricCard
                    title="Test false-positive rate"
                    value="18.68%"
                    detail="6,912 normal records incorrectly flagged"
                    icon={ShieldAlert}
                    tone="red"
                  />
                  <MetricCard
                    title="Test precision"
                    value="86.44%"
                    detail="Share of predicted attacks that were attacks"
                    icon={Gauge}
                    tone="blue"
                  />
                  <MetricCard
                    title="Test average precision"
                    value="98.81%"
                    detail="Precision-recall ranking metric; not threshold-specific"
                    icon={Activity}
                    tone="orange"
                  />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <section className="rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
                    <SectionTitle
                      title="Validation vs. test"
                      description="The frozen model and threshold show a substantial false-positive gap."
                    />
                    <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                        Validation
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
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
                          <CartesianGrid stroke="#28344D" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#151D32", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F8FAFC" }} labelStyle={{ color: "#CBD5E1" }} formatter={(value) => `${value}%`} />
                          <Bar dataKey="validation" name="Validation" fill="#2DE2C5" radius={[5, 5, 0, 0]} />
                          <Bar dataKey="test" name="Official test" fill="#FFBF69" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 rounded-xl bg-[#3B3020] p-3 text-sm leading-6 text-[#FFE0B0]">
                      The test false-positive rate is 13.69 percentage points
                      higher than validation, despite using the same frozen
                      threshold.
                    </p>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
                    <SectionTitle
                      title="Test confusion matrix"
                      description="Counts at the frozen Random Forest threshold."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#153B36] p-5">
                        <p className="text-xs font-medium text-[#8BE7C5]">True negatives</p>
                        <p className="mt-2 text-2xl font-semibold text-[#D6FFF0]">30,088</p>
                        <p className="mt-1 text-xs text-[#8BE7C5]">Normal correctly identified</p>
                      </div>
                      <div className="rounded-xl bg-[#3B3020] p-5">
                        <p className="text-xs font-medium text-[#FFD08A]">False positives</p>
                        <p className="mt-2 text-2xl font-semibold text-[#FFF0D5]">6,912</p>
                        <p className="mt-1 text-xs text-[#FFD08A]">Normal flagged as attack</p>
                      </div>
                      <div className="rounded-xl bg-[#3D202D] p-5">
                        <p className="text-xs font-medium text-[#FF9EAE]">False negatives</p>
                        <p className="mt-2 text-2xl font-semibold text-[#FFE0E5]">1,266</p>
                        <p className="mt-1 text-xs text-[#FF9EAE]">Attacks missed</p>
                      </div>
                      <div className="rounded-xl bg-[#12343B] p-5">
                        <p className="text-xs font-medium text-[#8BEBDD]">True positives</p>
                        <p className="mt-2 text-2xl font-semibold text-[#D8FFFA]">44,066</p>
                        <p className="mt-1 text-xs text-[#8BEBDD]">Attacks detected</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-slate-400">
                      Official test set: 82,332 records. These results are
                      reported at the previously selected threshold.
                    </p>
                  </section>
                </div>

                <section className="mt-6 rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
                  <SectionTitle
                    title="What this experiment investigates"
                    description="Beyond accuracy: evaluating intrusion detection under different alert thresholds."
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 p-4">
                      <Target className="text-[#2DE2C5]" size={21} />
                      <h3 className="mt-3 font-semibold">Detection performance</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        How many genuine attacks are detected at a chosen threshold?
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-4">
                      <ShieldAlert className="text-[#FFBF69]" size={21} />
                      <h3 className="mt-3 font-semibold">False-alarm cost</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        How much normal traffic is incorrectly flagged?
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-4">
                      <Activity className="text-[#42D6A4]" size={21} />
                      <h3 className="mt-3 font-semibold">Generalization</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Does validation performance carry over to the official test set?
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === "Threshold Explorer" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
                <section className="rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
                  <SectionTitle
                    title="Explore the alert threshold"
                    description="A prediction is flagged as an attack when its score is at least the selected threshold."
                  />
                  <div className="rounded-xl bg-[#0B1020] p-5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="threshold" className="text-sm font-medium">
                        Attack probability threshold
                      </label>
                      <span className="rounded-lg bg-[#16464A] px-3 py-1.5 font-mono text-sm font-semibold text-[#8BEBDD]">
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

                  <div className="mt-5 rounded-xl border border-[#2DE2C5]/20 bg-[#12343B] p-4">
                    <div className="flex gap-3">
                      <CircleHelp size={20} className="mt-0.5 shrink-0 text-[#2DE2C5]" />
                      <div>
                        <p className="font-semibold text-[#D8FFFA]">
                          {isFrozenThreshold
                            ? "Original evaluated threshold"
                            : "Exploration threshold"}
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
                    <div className="rounded-xl border border-white/10 p-4">
                      <p className="text-xs text-slate-400">Frozen threshold</p>
                      <p className="mt-2 text-2xl font-semibold">{frozenThreshold.toFixed(6)}</p>
                      <p className="mt-1 text-xs text-slate-400">Chosen on validation data</p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-4">
                      <p className="text-xs text-slate-400">Validation FPR constraint</p>
                      <p className="mt-2 text-2xl font-semibold">≤ 5%</p>
                      <p className="mt-1 text-xs text-slate-400">Threshold selection objective</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
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
                    <div className="rounded-xl border border-[#FF647C]/25 bg-[#3D202D] p-4 text-sm leading-6 text-[#FFC0CA]">
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
                        <div className="rounded-xl bg-[#153B36] p-4">
                          <p className="text-xs font-medium text-[#8BE7C5]">Attack recall</p>
                          <p className="mt-2 text-2xl font-semibold text-[#D6FFF0]">
                            {(thresholdMetrics.recall * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#3B3020] p-4">
                          <p className="text-xs font-medium text-[#FFD08A]">False-positive rate</p>
                          <p className="mt-2 text-2xl font-semibold text-[#FFF0D5]">
                            {(thresholdMetrics.fpr * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#12343B] p-4">
                          <p className="text-xs font-medium text-[#8BEBDD]">Precision</p>
                          <p className="mt-2 text-2xl font-semibold text-[#D8FFFA]">
                            {(thresholdMetrics.precision * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#292449] p-4">
                          <p className="text-xs font-medium text-[#D5C8FF]">F1-score</p>
                          <p className="mt-2 text-2xl font-semibold text-[#F0E9FF]">
                            {(thresholdMetrics.f1 * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <h3 className="mt-6 font-semibold text-slate-100">Validation confusion matrix</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Counts are recalculated whenever the threshold changes.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#153B36] p-4">
                          <p className="text-xs font-medium text-[#8BE7C5]">True negatives</p>
                          <p className="mt-1 text-xl font-semibold text-[#D6FFF0]">
                            {thresholdMetrics.tn.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#3B3020] p-4">
                          <p className="text-xs font-medium text-[#FFD08A]">False positives</p>
                          <p className="mt-1 text-xl font-semibold text-[#FFF0D5]">
                            {thresholdMetrics.fp.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#3D202D] p-4">
                          <p className="text-xs font-medium text-[#FF9EAE]">False negatives</p>
                          <p className="mt-1 text-xl font-semibold text-[#FFE0E5]">
                            {thresholdMetrics.fn.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#12343B] p-4">
                          <p className="text-xs font-medium text-[#8BEBDD]">True positives</p>
                          <p className="mt-1 text-xl font-semibold text-[#D8FFFA]">
                            {thresholdMetrics.tp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}

            {activeTab === "Model Comparison" && (
              <>
                <section className="rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
                  <SectionTitle
                    title="Validation model comparison"
                    description="Both models were evaluated with a threshold selected under the same 5% FPR constraint."
                  />
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={validationData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid stroke="#28344D" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="model" tick={{ fontSize: 12, fill: "#CBD5E1" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <Tooltip contentStyle={{ backgroundColor: "#151D32", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F8FAFC" }} labelStyle={{ color: "#CBD5E1" }} formatter={(value) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="recall" name="Attack recall" fill="#2DE2C5" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="precision" name="Precision" fill="#42D6A4" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="f1" name="F1-score" fill="#A78BFA" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
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
                      <tr className="border-b border-white/10">
                        <td className="px-3 py-4">Logistic Regression</td>
                        <td className="px-3 py-4 font-mono">0.624422</td>
                        <td className="px-3 py-4">89.53%</td>
                        <td className="px-3 py-4">5.00%</td>
                        <td className="px-3 py-4">97.45%</td>
                        <td className="px-3 py-4">93.32%</td>
                        <td className="px-3 py-4">99.20%</td>
                      </tr>
                      <tr className="bg-violet-500/10">
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
                    Average precision is displayed as a percentage. It is a
                    ranking metric calculated across score thresholds.
                  </p>
                </section>
              </>
            )}

            {activeTab === "Error Analysis" && (
              <>
                <section className="rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
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
                        <CartesianGrid stroke="#28344D" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <Tooltip contentStyle={{ backgroundColor: "#151D32", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F8FAFC" }} labelStyle={{ color: "#CBD5E1" }} formatter={(value) => `${value}%`} />
                        <Bar dataKey="recall" name="Recall" radius={[0, 5, 5, 0]}>
                          {attackData.map((item) => (
                            <Cell
                              key={item.category}
                              fill={item.category === "Fuzzers" ? "#FF647C" : "#2DE2C5"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 rounded-xl border border-[#FF647C]/25 bg-[#3D202D] p-4">
                    <p className="font-semibold text-[#FFE0E5]">
                      Fuzzers: the clearest weakness
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#FFC0CA]">
                      4,892 of 6,062 Fuzzer records were detected. The model
                      missed 1,170, giving a recall of 80.70%.
                    </p>
                  </div>
                </section>

                <section className="mt-6 rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
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
                        <Tooltip contentStyle={{ backgroundColor: "#151D32", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F8FAFC" }} labelStyle={{ color: "#CBD5E1" }} />
                        <Legend />
                        <Line type="monotone" dataKey="validation" name="Validation" stroke="#2DE2C5" strokeWidth={2.5} dot />
                        <Line type="monotone" dataKey="test" name="Official test" stroke="#FFBF69" strokeWidth={2.5} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    These are score quantiles for normal records only, not
                    attack-category scores. They describe the distribution
                    shift; they do not establish its cause.
                  </p>
                </section>

                <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#151D32] p-5 sm:p-6">
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
                        <tr key={item.category} className="border-b border-white/10 last:border-0">
                          <td className="px-3 py-3 font-medium">{item.category}</td>
                          <td className="px-3 py-3">{item.records.toLocaleString()}</td>
                          <td className={`px-3 py-3 ${item.missed > 100 ? "font-semibold text-[#FF647C]" : ""}`}>
                            {item.missed.toLocaleString()}
                          </td>
                          <td className="px-3 py-3">{item.recall.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
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
