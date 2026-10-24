
import pandas as pd
from pathlib import Path

DATA_DIR = Path(r"D:\ml project\dataset")

train = pd.read_csv(DATA_DIR / "UNSW_NB15_training-set.csv")
test = pd.read_csv(DATA_DIR / "UNSW_NB15_testing-set.csv")

print("=" * 60)
print("DATA QUALITY AND LEAKAGE AUDIT")
print("=" * 60)

# 1. Check whether IDs overlap across the supplied splits
print("\n1. ID overlap")
print("Overlapping IDs:", len(set(train["id"]) & set(test["id"])))

# 2. Check whether attack categories agree with binary labels
print("\n2. Attack category vs. binary label")
for name, df in [("Training", train), ("Test", test)]:
    inconsistent = (
        ((df["attack_cat"] == "Normal") & (df["label"] != 0))
        | ((df["attack_cat"] != "Normal") & (df["label"] != 1))
    )
    print(f"{name} inconsistent rows:", int(inconsistent.sum()))

# 3. Check for exact rows shared between the two files
print("\n3. Exact row overlap")
shared_columns = list(train.columns)
combined_test = test[shared_columns]

train_rows = set(
    pd.util.hash_pandas_object(train, index=False).tolist()
)
test_rows = pd.util.hash_pandas_object(
    combined_test, index=False
).tolist()

print("Matching row hashes:", sum(h in train_rows for h in test_rows))

# 4. Check whether traffic features overlap, ignoring identifiers
# and labels. This is an audit only; repeated feature values
# do not automatically mean leakage.
feature_columns = [
    c for c in train.columns
    if c not in ["id", "label", "attack_cat"]
]

train_features = train[feature_columns].copy()
test_features = test[feature_columns].copy()

train_feature_hashes = set(
    pd.util.hash_pandas_object(
        train_features, index=False
    ).tolist()
)
test_feature_hashes = pd.util.hash_pandas_object(
    test_features, index=False
).tolist()

print("\n4. Matching feature-only row hashes")
print(
    "Test rows matching training feature patterns:",
    sum(h in train_feature_hashes for h in test_feature_hashes)
)

# 5. Check for infinite numerical values
print("\n5. Infinite numerical values")
for name, df in [("Training", train), ("Test", test)]:
    numeric = df.select_dtypes(include="number")
    count = int((numeric.isin([float("inf"), float("-inf")])).sum().sum())
    print(f"{name} infinite values:", count)

print("\nAudit complete.")
