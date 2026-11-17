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
- `dataset/` — dataset files used for training and validation
- `frontend/` — Next.js application that renders the intrusion detection dashboard
- `requirements.txt` — Python dependencies
- `package.json` — frontend scripts and dependencies

## Dataset

The project uses the UNSW-NB15 training dataset (`dataset/UNSW_NB15_training-set.csv`). The script prepares the target (`label`) and feature columns, applies preprocessing, and fits models such as:

- Logistic Regression
- Random Forest
- Linear SVC

## Model Selection Strategy

The evaluation process:

1. splits the data into training and validation sets using stratification
2. performs preprocessing for numeric and categorical features
3. trains multiple classifiers
4. computes attack scores on validation data
5. selects the threshold that maximizes recall while keeping false-positive rate at or below 5%
6. compares models using precision, recall, F1-score, and average precision

## Setup

### Python environment

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend dependencies

```bash
npm install
```

## Usage

### Train and evaluate models

```bash
python train_evaluate.py
```

This saves validation results to a JSON file under `frontend/public/data/validation_scores.json` for the dashboard.

### Run the dashboard

```bash
npm run dev
```

Then open the local URL shown by Next.js in your browser.

## Notes

- The dashboard is intended for quick visual comparison of model performance.
- Model selection emphasizes detection recall while constraining false alarms.
- This repository is a practical ML workflow for intrusion detection research and demonstration.
