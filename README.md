
---

# 🏦 Bank Marketing - Term Deposit Prediction

This project is an end-to-end machine learning application designed to predict the probability of customers subscribing to a term deposit. It consists of a FastAPI service that scores one customer at a time and a small React (Vite) form that calls it. The model is a Random Forest trained on a public dataset; what it can and cannot do is described below.

---

## 📊 Data, Model and Results

**Data.** `data/train.csv` is the UCI [Bank Marketing](https://archive.ics.uci.edu/dataset/222/bank+marketing) dataset (Moro, Cortez and Rita, 2014; licensed CC BY 4.0 on the UCI page): 45,211 phone calls of a Portuguese bank, 11.7% of which ended with a term deposit subscription.

**Model.** One scikit-learn pipeline (one-hot encoding and a Random Forest with 300 trees), tuned with a randomized search on PR-AUC. The form asks for exactly the nine fields the model uses: age, job, marital status, balance, housing loan, number of contacts in this campaign, and the previous-campaign block (days since last contact, number of earlier contacts, outcome). The `duration` column is not used, because the length of a call is only known after the call, so a model that uses it cannot score a customer before calling. `day`, `month` and `contact` are left out as well: the file is in time order, they describe when and how a call happened rather than who the customer is, and they did not help in a time-forward check (see the notebook, section 3).

**Results.** 60/20/20 stratified train / validation / test split, threshold 0.184 chosen on the validation part (maximum F1), test part used once:

| Metric (test part, 9,043 customers) | Value |
|---|---|
| AUC | 0.749 (95% interval 0.732-0.767) |
| PR-AUC | 0.385 (a model without skill gets 0.117) |
| Precision / recall at the threshold | 0.417 / 0.415 |
| Customers with the highest 10% of scores | 44.3% subscribe, 3.8 times the overall rate |

The probabilities are calibrated on this data: the mean prediction is 0.1175 against a true rate of 0.117. The practical use is ranking, that is, calling the customers with the highest scores first.

**Limits.**

* **Accuracy is not reported as a result.** It is 0.864 at the chosen threshold, which is below the 0.883 of always answering "no". With an 88/12 split it says nothing useful.
* **A random split is optimistic for this file.** The rows are in time order and the subscription rate climbs from about 3% at the start to 47% in the last tenth. Trained on earlier rows and tested on the following block (expanding window, 5 folds), the AUC is 0.54-0.67 (mean 0.60), against 0.74 for a random 5-fold split of the same model. Read 0.75 as the quality for customers drawn from the same mix as the training file, and 0.55-0.67 as the range to expect if the mix changes.
* **The saved model is refit on all 45,211 rows**, so the numbers above describe the model trained on 60% of the rows. The refit itself has no untouched holdout.
* **Other model families were only briefly tried.** A Logistic Regression baseline built the same way scores lower (validation AUC 0.720 against 0.747). A HistGradientBoosting model scored slightly higher in a random 5-fold check on all 15 columns (AUC 0.800 against 0.788), but that was a random split only, so the Random Forest was kept.
* It is a small student project on one old dataset, not a validated scoring system for real customers.

The full analysis, with every number above, is in `notebook/eda-and-modeling.ipynb`.

---

## 📁 Project Structure

```
Bank_Marketing/
├── backend-api/             # FastAPI Backend Service
│   ├── api.py               # Main API file (CORS, Validation, Logging)
│   ├── models/
│   │   └── bank_marketing_rf_model.pkl  # Trained Random Forest model
│   ├── config/
│   │   └── optimal_threshold.json       # Optimized prediction threshold
│   └── requirements.txt     # Python dependencies
├── frontend-app/            # React (Vite) Frontend
│   ├── index.html           # Page shell
│   ├── vite.config.js       # Dev server port (5173)
│   ├── .env.example         # API address template (VITE_API_URL)
│   ├── src/
│   │   ├── main.jsx             # Entry point
│   │   ├── PredictionScreen.jsx # Main Prediction Screen
│   │   ├── predictionForm.js    # Form validation and request building
│   │   ├── predictionForm.test.js  # Tests for the form logic
│   │   └── styles.css           # Navy and gold theme
│   └── package.json         # Node.js dependencies
├── data/                    # Training dataset
│   └── train.csv
└── notebook/                # EDA and Modeling
    └── eda-and-modeling.ipynb
```

---

## 🚀 Installation and Setup

### Prerequisites

* Python 3.11+
* Node.js 20.19+ (or 22.12+)
* Anaconda (Recommended for virtual environment management)

---

### 1. Backend API Setup

Open Anaconda Prompt:

```
cd backend-api
conda create -n bank_api python=3.11
conda activate bank_api
pip install -r requirements.txt
```

Start the API:

```
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

The API will be running at [http://localhost:8000](http://localhost:8000)  
API Documentation (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup

Open a new terminal:

```
cd frontend-app
npm install
```

Launch the Application:

```
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your web browser. The port is fixed: if it is taken, Vite stops instead of moving to another port, because the API only accepts requests from this address.

Other commands: `npm test` runs the tests of the form logic, `npm run build` creates a production build.

---

### 3. API Connection Configuration

The form sends its requests to `http://127.0.0.1:8000` by default. To use another address, copy `frontend-app/.env.example` to `frontend-app/.env` and set `VITE_API_URL`:

```
VITE_API_URL=http://127.0.0.1:8000
```

The API accepts requests from `http://localhost:5173` and `http://127.0.0.1:5173` (`ALLOWED_ORIGINS` in `backend-api/api.py`). If you change the port in `frontend-app/vite.config.js`, change it there too.

---

### 4. Re-running the Notebook (Optional)

If you want to retrain the model from scratch:

1. Open `notebook/eda-and-modeling.ipynb` in Jupyter, in the same environment as the API (the versions in `backend-api/requirements.txt` must match, otherwise the saved model cannot be loaded)
2. Run all cells top to bottom
3. The notebook saves the model to `backend-api/models/` and the threshold to `backend-api/config/`

---

## 🔧 Technical Specifications

* Model: Random Forest Classifier (Scikit-learn)
* Data Validation: Tiered validation using Pydantic (backend) + client-side checks (frontend)
* UI/UX: Corporate Navy & Gold color palette with FontAwesome icon integration
* CORS: the API only accepts requests from the local Vite dev server (`http://localhost:5173`, `http://127.0.0.1:5173`)
* Logging: Server-side request/response and prediction logging

---

## 🐛 Troubleshooting

**NumPy/Sklearn Incompatibility**

If you encounter a `ValueError: numpy.dtype size changed` error, or the API refuses to start because of a scikit-learn version mismatch, reinstall the pinned versions (do not upgrade them, the saved model was built with exactly these):

```
pip install --force-reinstall -r requirements.txt
```

**Validation Error (422)**

Ensure the Age input is between 18 and 120, and Balance is a valid number.

**The Form Cannot Reach the API (Failed to fetch / CORS)**

Check that the API is running (`/health` answers), that `VITE_API_URL` in `frontend-app/.env` points to it, and that the page is open at `http://localhost:5173` or `http://127.0.0.1:5173`.

---

This project was developed to integrate modern software development lifecycles with data science methodologies.

---
