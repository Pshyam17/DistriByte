# app.py


from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv

from .models import Token, ForecastRequest, ForecastResponse, ProductForecast
from .auth import authenticate_user, create_access_token, get_current_user, users_db, ACCESS_TOKEN_EXPIRE_MINUTES
from .data import DISTRIBUTION_CENTERS, PRODUCTS
from .ml.model import BiLSTMAttention

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Sales and Inventory Forecasting API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock model instance
model = BiLSTMAttention(input_dim=10, hidden_dim=64, output_dim=10)
model.eval()  # Set to evaluation mode

# Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/centers")
async def get_distribution_centers(current_user = Depends(get_current_user)):
    return {"centers": DISTRIBUTION_CENTERS}

@app.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest, current_user = Depends(get_current_user)):
    # Check if center exists
    if request.center_id not in DISTRIBUTION_CENTERS:
        raise HTTPException(status_code=404, detail="Distribution center not found")
    
    # For demonstration, we'll return mock forecasts
    forecasts = []
    
    # Generate random forecasts for top 10 products
    for i, product_id in enumerate(list(PRODUCTS.keys())[:10]):
        product = PRODUCTS[product_id]
        
        # Mock values
        current_inventory = np.random.randint(50, 500)
        daily_sales = np.random.randint(5, 50, size=request.forecast_days)
        
        forecasts.append(
            ProductForecast(
                product_id=product_id,
                product_name=product["name"],
                current_inventory=current_inventory,
                forecasted_sales=daily_sales.tolist(),
                recommended_order=int(sum(daily_sales) * 1.2) - current_inventory if current_inventory < sum(daily_sales) else 0
            )
        )
    
    return ForecastResponse(
        center_id=request.center_id,
        forecasts=forecasts,
        last_updated=datetime.now().isoformat()
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}