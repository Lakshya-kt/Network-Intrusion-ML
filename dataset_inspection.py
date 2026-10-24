
import pandas as pd
from pathlib import Path

DATA_DIR = Path(r"D:\ml project\dataset")

train_path = DATA_DIR / "UNSW_NB15_training-set.csv"
test_path = DATA_DIR / "UNSW_NB15_testing-set.csv"

for path in [train_path, test_path]:
    if not path.exists():
        print(f"File not found: {path.resolve()}")
        print("Check the filename and the data folder.")
        raise SystemExit(1)

    df = pd.read_csv(path, low_memory=False)

    print("\n" + "=" * 60)
    print("FILE:", path.name)
    print("=" * 60)

    print("Shape:", df.shape)
    print("\nColumns:")
    print(df.columns.tolist())

    print("\nData types:")
    print(df.dtypes)

    print("\nMissing values:")
    print(df.isnull().sum().sort_values(ascending=False).head(15))

    print("\nDuplicate rows:", df.duplicated().sum())

    if "label" in df.columns:
        print("\nTarget distribution:")
        print(df["label"].value_counts(dropna=False))
        print("\nTarget proportions:")
        print(df["label"].value_counts(normalize=True).round(4))

    if "attack_cat" in df.columns:
        print("\nAttack categories:")
        print(df["attack_cat"].value_counts(dropna=False))
