
---

# 🏦 Bank Marketing - Term Deposit Prediction

This project is an end-to-end machine learning application designed to predict the probability of customers subscribing to a term deposit. It features a high-performance API architecture built with FastAPI and a modern, enterprise-grade user interface developed with React Native (Expo).

---

## 📁 Project Structure

```
Bank_Marketing/
├── backend-api/             # FastAPI Backend Service
│   ├── api.py               # Main API file (CORS & Validation included)
│   ├── bank_marketing_rf_model.pkl # Trained Random Forest model
│   ├── feature_cols.json    # List of features expected by the model
│   └── requirements.txt     # Python dependencies
├── frontend-app/            # React Native (Expo) Frontend
│   ├── App.js               # Root component
│   ├── src/
│   │   └── PredictionScreen.js # Main Prediction Screen (Premium UI)
│   └── package.json         # Node.js dependencies
├── data/                    # Training and Testing datasets
└── notebook/                # Exploratory Data Analysis (EDA) and Modeling
```

---

## 🚀 Installation and Setup

### Prerequisites

* Python 3.10+
* Node.js 16+
* Anaconda (Recommended for virtual environment management)

---

### 1. Backend API Setup

Open Anaconda Prompt:

```
cd backend-api
conda create -n bank_api python=3.10
conda activate bank_api
pip install -r requirements.txt
```

Start the API:

```
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

The API will be running at
[http://localhost:8000](http://localhost:8000)

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

Check the API_URL variable in `frontend-app/src/PredictionScreen.js`:

Web Browser / Emulator:
[http://127.0.0.1:8000/predict](http://127.0.0.1:8000/predict)

Physical Device Testing: Use your computer's local IP address:

```
const API_URL = 'http://192.168.x.x:8000/predict'; // Replace x.x with your actual local IP
```

---

## 🔧 Technical Specifications

* Model: Random Forest Classifier (Scikit-learn)
* Data Validation: Tiered validation using Pydantic for age (18-95) and balance constraints
* UI/UX: Corporate Navy & Gold color palette with FontAwesome icon integration
* Security: Configured CORS (Cross-Origin Resource Sharing) for cross-platform communication

---

## 🐛 Troubleshooting

**NumPy/Sklearn Incompatibility**

If you encounter a `ValueError: numpy.dtype size changed` error, run:

```
pip install --upgrade numpy scikit-learn
```

**Validation Error (422)**

Ensure the Age input is between 18 and 95. The API enforces these logical boundaries for data integrity.

**Icons Not Rendering**

If icons are missing, refresh the library using:

```
npx expo install @expo/vector-icons
```

---

This project was developed to integrate modern software development lifecycles with data science methodologies.

---

