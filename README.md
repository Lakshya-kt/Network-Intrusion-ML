# Network Intrusion Detection with Machine Learning

This project builds and evaluates machine learning models for network intrusion detection using the UNSW-NB15 dataset. It includes:

- data inspection and quality checks
- preprocessing and model training
- threshold tuning to control false positives
- validation metrics for model comparison
- a Next.js dashboard for visualizing model results

## Project Goals

The goal is to detect malicious or abnormal network activity with high recall while keeping the false-positive rate within a practical limit. The training pipeline compares several classifiers and exports validation scores for dashboard visualization.

## Repository Structure

- `train_evaluate.py` — loads the dataset, trains candidate models, tunes decision thresholds, and exports validation metrics
- `dataset_inspection.py` — inspects dataset structure and feature distributions
- `dataset_quality_checks.py` — validates dataset quality and consistency
- `dataset/` — local UNSW-NB15 CSV files (not tracked by Git)
- `frontend/app/` — Next.js dashboard source
- `frontend/public/data/` — JSON data consumed by the dashboard
- `requirements.txt` — Python dependencies
- `frontend/package.json` — frontend scripts and dependencies

## Data access

Download the UNSW-NB15 training and testing CSV files from the [official UNSW-NB15 dataset page](https://research.unsw.edu.au/projects/unsw-nb15-dataset). Place the files in the repository's `dataset/` directory with these exact names:

- `UNSW_NB15_training-set.csv`
- `UNSW_NB15_testing-set.csv`

The `dataset/` directory is ignored by Git, so the data must be obtained separately after cloning. The training script uses the training CSV for a stratified train/validation split, then evaluates the selected model once on the separate official test CSV. It excludes `id`, `label`, and `attack_cat` from the input features; `label` is the binary target.

## Setup and rebuild

From the repository root, create the Python environment and install dependencies:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Install frontend dependencies from the frontend directory:

```powershell
cd frontend
npm ci
```

To rebuild model results, return to the repository root and run:

```powershell
cd ..
python train_evaluate.py
```

The script writes validation scores and model comparisons to `frontend/public/data/`, and writes `validation_model_comparison.csv` and `test_attack_category_analysis.csv` in the repository root. These generated results are used by the dashboard.

To run the dashboard locally, from `frontend/` run:

```bash
npm run dev
```

Open the local URL printed by Next.js. To create the static production build used for deployment, run `npm run build` from `frontend/`; the build is written to `frontend/out/`.

## Model selection

The pipeline compares Logistic Regression, Random Forest, and Linear SVC using numeric and categorical preprocessing. It chooses the validation threshold with the highest recall while keeping the false-positive rate at or below 5%, then reports precision, recall, F1, and average precision. The selected model and frozen threshold are evaluated on the official test set, which is not used for fitting or threshold selection.

## Citations and AI-use disclosure

The dataset page requests citation of the dataset publications. Relevant references:

- Moustafa, Nour, and Jill Slay. “UNSW-NB15: a comprehensive data set for network intrusion detection systems (UNSW-NB15 network data set).” *2015 Military Communications and Information Systems Conference (MilCIS)*, IEEE, 2015. [IEEE Xplore](https://ieeexplore.ieee.org/abstract/document/7348942).
- Moustafa, Nour, and Jill Slay. “The evaluation of Network Anomaly Detection Systems: Statistical analysis of the UNSW-NB15 dataset and the comparison with the KDD99 dataset.” *Information Security Journal: A Global Perspective* (2016). [Publisher page](https://www.tandfonline.com/doi/abs/10.1080/19393555.2015.1125974).
- Dataset access and description: [UNSW-NB15 dataset page](https://research.unsw.edu.au/projects/unsw-nb15-dataset).

AI-use disclosure: I used generative AI tools throughout this assignment to support my research, coding, data analysis, and documentation. I reviewed and adapted AI-generated suggestions as appropriate, and I take responsibility for the final submission.
