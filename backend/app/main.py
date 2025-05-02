# app.py


from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from datetime import datetime, timedelta
import jwt
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

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

# Authentication setup
SECRET_KEY = os.getenv("SECRET_KEY", "yoursecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Mock user database (replace with actual database in production)
users_db = {
    "demo@example.com": {
        "email": "demo@example.com",
        "hashed_password": pwd_context.hash("password123"),
        "company": "Demo Company",
        "full_name": "Demo User",
    }
}

# Auth models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    
class User(BaseModel):
    email: str
    company: Optional[str] = None
    full_name: Optional[str] = None

class UserInDB(User):
    hashed_password: str

# Input models
class ForecastRequest(BaseModel):
    center_id: str
    lookback_days: int = 30
    forecast_days: int = 10
    
# Output models
class ProductForecast(BaseModel):
    product_id: str
    product_name: str
    current_inventory: int
    forecasted_sales: List[int]
    recommended_order: int
    
class ForecastResponse(BaseModel):
    center_id: str
    forecasts: List[ProductForecast]
    last_updated: str

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db, email: str):
    if email in db:
        user_dict = db[email]
        return UserInDB(**user_dict)

def authenticate_user(fake_db, email: str, password: str):
    user = get_user(fake_db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user(users_db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# LSTM Model Definition
class BiLSTMAttention(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, num_layers=2, dropout=0.2):
        super(BiLSTMAttention, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_dim, hidden_dim, num_layers, 
            batch_first=True, dropout=dropout, bidirectional=True
        )
        
        # Attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1)
        )
        
        # Output layer
        self.fc = nn.Linear(hidden_dim * 2, output_dim)
        
    def forward(self, x):
        # x shape: (batch_size, seq_length, input_dim)
        batch_size, seq_len, _ = x.size()
        
        # LSTM forward pass
        lstm_out, (_, _) = self.lstm(x)
        # lstm_out shape: (batch_size, seq_length, hidden_dim*2)
        
        # Attention mechanism
        attn_weights = self.attention(lstm_out)
        attn_weights = torch.softmax(attn_weights, dim=1)
        
        # Apply attention weights to LSTM output
        context = torch.bmm(attn_weights.transpose(1, 2), lstm_out)
        # context shape: (batch_size, 1, hidden_dim*2)
        
        # Final prediction
        output = self.fc(context.squeeze(1))
        return output

# Mock data for demonstration (would be replaced with actual database in production)
DISTRIBUTION_CENTERS = {
    "dc1": {"name": "New York DC", "location": [40.7128, -74.0060]},
    "dc2": {"name": "Los Angeles DC", "location": [34.0522, -118.2437]},
    "dc3": {"name": "Chicago DC", "location": [41.8781, -87.6298]},
    "dc4": {"name": "Houston DC", "location": [29.7604, -95.3698]},
    "dc5": {"name": "Phoenix DC", "location": [33.4484, -112.0740]}
}

PRODUCTS = {
    "p1": {"name": "Widget A", "category": "Electronics"},
    "p2": {"name": "Widget B", "category": "Electronics"},
    "p3": {"name": "Gadget C", "category": "Home Goods"},
    "p4": {"name": "Tool D", "category": "Hardware"},
    "p5": {"name": "Component E", "category": "Parts"},
    "p6": {"name": "Assembly F", "category": "Parts"},
    "p7": {"name": "Item G", "category": "Apparel"},
    "p8": {"name": "Product H", "category": "Food"},
    "p9": {"name": "Supplement I", "category": "Health"},
    "p10": {"name": "Material J", "category": "Construction"}
}

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

@app.get("/centers", response_model=Dict)
async def get_distribution_centers(current_user: User = Depends(get_current_user)):
    return {"centers": DISTRIBUTION_CENTERS}

@app.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest, current_user: User = Depends(get_current_user)):
    # Check if center exists
    if request.center_id not in DISTRIBUTION_CENTERS:
        raise HTTPException(status_code=404, detail="Distribution center not found")
    
    # In a real application, here we would:
    # 1. Load historical data for the specific center
    # 2. Preprocess the data
    # 3. Run it through the BiLSTM model
    # 4. Format the results
    
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

# Run the API with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
