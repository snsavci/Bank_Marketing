
---

# 🏦 Bank Marketing - Term Deposit Prediction

This project is an end-to-end machine learning application designed to predict the probability of customers subscribing to a term deposit. It features a high-performance API architecture built with FastAPI and a modern, enterprise-grade user interface developed with React (Vite).

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
* Security: Configured CORS for cross-platform communication
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
