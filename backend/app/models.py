from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

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