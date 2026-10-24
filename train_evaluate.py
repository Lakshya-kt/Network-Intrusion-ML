
import pandas as pd
import numpy as np

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    roc_curve,
    average_precision_score,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)

DATA_DIR = Path(r"D:\ml project\dataset")
TARGET = "label"
MAX_FPR = 0.05
RANDOM_STATE = 42

# --------------------------------------------------
# 1. Load the official training data only
# --------------------------------------------------
df = pd.read_csv(DATA_DIR / "UNSW_NB15_training-set.csv")

# Exclude identifiers and target-derived information.
X = df.drop(columns=["id", "label", "attack_cat"])
y = df[TARGET]

# Identify numerical and categorical features.
numeric_features = X.select_dtypes(
    include=["number"]
).columns.tolist()

categorical_features = X.select_dtypes(
    exclude=["number"]
).columns.tolist()

print("Dataset shape:", df.shape)
print("Numerical features:", len(numeric_features))
print("Categorical features:", len(categorical_features))
print("Training label proportions:")
print(y.value_counts(normalize=True).sort_index())

# --------------------------------------------------
# 2. Create a stratified train/validation split
# --------------------------------------------------
X_train, X_val, y_train, y_val = train_test_split(
    X,
    y,
    test_size=0.20,
    stratify=y,
    random_state=RANDOM_STATE,
)

print("\nTraining rows:", len(X_train))
print("Validation rows:", len(X_val))

# --------------------------------------------------
# 3. Build leakage-aware preprocessing
# --------------------------------------------------
numeric_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])

categorical_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore")),
])

preprocessor = ColumnTransformer([
    ("numeric", numeric_pipeline, numeric_features),
    ("categorical", categorical_pipeline, categorical_features),
])

# --------------------------------------------------
# 4. Define candidate models
# --------------------------------------------------
models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=150,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),
}

results = []
DASHBOARD_DIR = Path(__file__).parent / "frontend" / "public" / "data"
DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
validation_export=pd.DataFrame({
    "label": y_val.to_numpy()
})
# --------------------------------------------------
# 5. Fit models and select thresholds on validation
# --------------------------------------------------
for name, model in models.items():
    print(f"\n{'=' * 60}")
    print("Fitting:", name)
    print("=" * 60)

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", model),
    ])

    pipeline.fit(X_train, y_train)

    # Probability of the positive class: attack (label 1).
    attack_scores = pipeline.predict_proba(X_val)[:, 1]
    score_column=(
        "logistic_regression_score"
        if name == "Logistic Regression"
        else "random_forest_score"
    )
    validation_export[score_column]=attack_scores
    # Choose the threshold with maximum recall while FPR <= 5%.
    fpr, tpr, thresholds = roc_curve(y_val, attack_scores)

    eligible = np.flatnonzero(
        (fpr <= MAX_FPR) & np.isfinite(thresholds)
    )

    if len(eligible) == 0:
        print("No eligible threshold found.")
        continue

    best_idx = eligible[
        np.argmax(tpr[eligible])
    ]

    threshold = float(thresholds[best_idx])
    val_predictions = (attack_scores >= threshold).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y_val,
        val_predictions,
        labels=[0, 1],
    ).ravel()

    val_fpr = fp / (fp + tn) if (fp + tn) else 0.0
    val_recall = recall_score(y_val, val_predictions)
    val_precision = precision_score(
        y_val, val_predictions, zero_division=0
    )
    val_f1 = f1_score(y_val, val_predictions)
    val_ap = average_precision_score(y_val, attack_scores)

    print(f"Selected threshold: {threshold:.6f}")
    print(f"Validation attack recall: {val_recall:.4f}")
    print(f"Validation false-positive rate: {val_fpr:.4f}")
    print(f"Validation precision: {val_precision:.4f}")
    print(f"Validation F1-score: {val_f1:.4f}")
    print(f"Validation average precision: {val_ap:.4f}")
    print(f"Confusion matrix counts: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    results.append({
        "name": name,
        "pipeline": pipeline,
        "threshold": threshold,
        "val_recall": val_recall,
        "val_fpr": val_fpr,
        "val_precision": val_precision,
        "val_f1": val_f1,
        "val_ap": val_ap,
    })
# --------------------------------------------------
# Export validation predictions for the dashboard
# --------------------------------------------------
validation_json_path = DASHBOARD_DIR / "validation_scores.json"

validation_export.to_json(
    validation_json_path,
    orient="records",
)

print(f"\nSaved dashboard validation scores to: {validation_json_path}")
# --------------------------------------------------
# 6. Choose the candidate using validation results
# --------------------------------------------------
if not results:
    raise RuntimeError("No model produced an eligible threshold.")

# Primary objective: maximize validation recall under the FPR limit.
# Tie-breakers: average precision, then precision.
best = max(
    results,
    key=lambda r: (
        r["val_recall"],
        r["val_ap"],
        r["val_precision"],
    ),
)

print("\n" + "=" * 60)
print("MODEL SELECTED USING VALIDATION DATA")
print("=" * 60)
print("Model:", best["name"])
print("Frozen threshold:", best["threshold"])
print("Validation recall:", round(best["val_recall"], 4))
print("Validation FPR:", round(best["val_fpr"], 4))

# --------------------------------------------------
# 7. Final evaluation on the untouched official test set
# --------------------------------------------------
print("\nLoading official test set for final evaluation...")

test_df = pd.read_csv(DATA_DIR / "UNSW_NB15_testing-set.csv")

X_test = test_df.drop(
    columns=["id", "label", "attack_cat"]
)
y_test = test_df[TARGET]

# No fitting or threshold tuning on test data.
test_scores = best["pipeline"].predict_proba(X_test)[:, 1]
test_predictions = (
    test_scores >= best["threshold"]
).astype(int)

tn, fp, fn, tp = confusion_matrix(
    y_test,
    test_predictions,
    labels=[0, 1],
).ravel()

test_fpr = fp / (fp + tn) if (fp + tn) else 0.0

print("\n" + "=" * 60)
print("FINAL TEST RESULTS")
print("=" * 60)
print("Selected model:", best["name"])
print(f"Frozen threshold: {best['threshold']:.6f}")
print(f"Attack recall: {recall_score(y_test, test_predictions):.4f}")
print(f"False-positive rate: {test_fpr:.4f}")
print(
    f"Precision: {precision_score(y_test, test_predictions, zero_division=0):.4f}"
)
print(f"F1-score: {f1_score(y_test, test_predictions):.4f}")
print(f"Average precision: {average_precision_score(y_test, test_scores):.4f}")
print(f"TN={tn}, FP={fp}, FN={fn}, TP={tp}")

# --------------------------------------------------
# 8. Save validation results for later comparison
# --------------------------------------------------
summary = pd.DataFrame([
    {
        "model": r["name"],
        "threshold": r["threshold"],
        "validation_recall": r["val_recall"],
        "validation_fpr": r["val_fpr"],
        "validation_precision": r["val_precision"],
        "validation_f1": r["val_f1"],
        "validation_average_precision": r["val_ap"],
    }
    for r in results
])

summary.to_csv("validation_model_comparison.csv", index=False)
print("\nSaved validation_model_comparison.csv")

# --------------------------------------------------
# 9. Post-evaluation error analysis
# Diagnostic only: do not tune the threshold on test data.
# --------------------------------------------------

print("\n" + "=" * 60)
print("ERROR ANALYSIS")
print("=" * 60)

# Compare score distributions for normal traffic.
val_scores = best["pipeline"].predict_proba(X_val)[:, 1]

val_normal_scores = val_scores[
    np.asarray(y_val) == 0
]
test_normal_scores = test_scores[
    np.asarray(y_test) == 0
]

quantiles = [0.50, 0.75, 0.90, 0.95, 0.99]

print("\nNormal-traffic attack-score quantiles")
print("Quantile | Validation | Official test")

for q in quantiles:
    val_q = np.quantile(val_normal_scores, q)
    test_q = np.quantile(test_normal_scores, q)
    print(f"{q:7.0%} | {val_q:10.4f} | {test_q:13.4f}")

print(f"\nFrozen threshold: {best['threshold']:.6f}")

# Breakdown of detection performance by attack category.
print("\nAttack-category recall on official test data")

category_results = []

for category, group in test_df.groupby("attack_cat"):
    if category == "Normal":
        continue

    indices = group.index
    # test_df and test_predictions preserve the original row order.
    positions = test_df.index.get_indexer(indices)

    actual = y_test.iloc[positions].to_numpy()
    predicted = test_predictions[positions]

    tp = int(((actual == 1) & (predicted == 1)).sum())
    fn = int(((actual == 1) & (predicted == 0)).sum())
    recall = tp / (tp + fn) if (tp + fn) else 0.0

    category_results.append({
        "attack_category": category,
        "records": len(group),
        "detected": tp,
        "missed": fn,
        "recall": recall,
    })

category_report = pd.DataFrame(category_results)
category_report = category_report.sort_values("recall")

print(category_report.to_string(
    index=False,
    formatters={"recall": "{:.4f}".format},
))

category_report.to_csv(
    "test_attack_category_analysis.csv",
    index=False,
)

print("\nSaved test_attack_category_analysis.csv")