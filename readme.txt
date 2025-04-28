# Sales and Inventory Forecasting Application

A full-stack web application for businesses to forecast sales and inventory using a bidirectional LSTM model with attention mechanism.

## Features

- User authentication system
- Interactive map interface showing distribution network
- Bidirectional LSTM with attention layer for accurate forecasting
- Dashboard visualization of forecasted sales data
- Responsive design for mobile and desktop

## Tech Stack

### Backend
- FastAPI for the API framework
- PyTorch for the BiLSTM model implementation
- JWT for authentication

### Frontend
- Next.js for React framework
- Tailwind CSS for styling
- Leaflet for the interactive map
- Recharts for data visualization

## Deployment

This application is designed to be deployed on Vercel.

### Backend Deployment

1. Deploy the backend API to a service capable of hosting Python applications (e.g., Heroku, AWS, GCP)
2. Set the environment variables in the deployment environment:
   - `SECRET_KEY`: Your JWT secret key
   - Add a proper database connection if needed

### Frontend Deployment

1. Deploy to Vercel using the Vercel CLI or GitHub integration
2. Configure the environment variables in Vercel:
   - `API_URL`: The URL of your deployed backend API

## Local Development

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app:app --reload
```

### Frontend
```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## API Endpoints

- `POST /token`: Authentication endpoint
- `GET /centers`: Get all distribution centers
- `POST /forecast`: Get forecast data for a specific distribution center
- `GET /health`: Health check endpoint

## License

MIT
