
---

# 🏦 Bank Marketing - Term Deposit Prediction

This project is an end-to-end machine learning application designed to predict the probability of customers subscribing to a term deposit. It features a high-performance API architecture built with FastAPI and a modern, enterprise-grade user interface developed with React Native (Expo).

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
├── frontend-app/            # React Native (Expo) Frontend
│   ├── App.js               # Root component
│   ├── src/
│   │   └── PredictionScreen.js  # Main Prediction Screen
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
* Node.js 16+
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
npx expo start
```

Press **w** to open in your web browser.

---

### 3. API Connection Configuration

Check the `API_URL` variable in `frontend-app/src/PredictionScreen.js`:

**Web Browser / Emulator:**
```js
const API_URL = 'http://127.0.0.1:8000/predict';
```

**Physical Device Testing:** Use your computer's local IP address:
```js
const API_URL = 'http://192.168.x.x:8000/predict'; // Replace x.x with your actual local IP
```

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

**Icons Not Rendering**

If icons are missing, refresh the library using:

```
npx expo install @expo/vector-icons
```

**Physical Device Cannot Reach API**

Update `API_URL` in `PredictionScreen.js` to use your computer's local IP address instead of `127.0.0.1`.

---

This project was developed to integrate modern software development lifecycles with data science methodologies.

---
