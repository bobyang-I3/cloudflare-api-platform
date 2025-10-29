# Cloudflare API Billing Platform - Backend

FastAPI backend for managing Cloudflare Workers AI API usage with user authentication and tracking.

## Features

- 🔐 User registration and JWT authentication
- 🔑 API key management for each user
- 🤖 Proxy to Cloudflare Workers AI (multiple models)
- 📊 Usage tracking (token consumption per user)
- 📈 Usage statistics and logs

## Setup

### 1. Create virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Key configuration:
- `CLOUDFLARE_API_KEY`: Your Cloudflare API key
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `JWT_SECRET_KEY`: Secret key for JWT token signing
- `DATABASE_URL`: Database connection string

### 4. Run the server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info (requires JWT)
- `POST /api/auth/refresh-api-key` - Generate new API key (requires JWT)

### AI/Chat

- `GET /api/ai/models` - List available Cloudflare AI models
- `POST /api/ai/chat` - Send chat request (requires X-API-Key header)
- `POST /api/ai/chat/stream` - Stream chat response (requires X-API-Key header)

### Usage Tracking

- `GET /api/usage/stats` - Get usage statistics (requires JWT)
- `GET /api/usage/logs` - Get usage logs (requires JWT)

## Authentication Methods

### 1. JWT Token (for web app)

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "password"}'

# Use token
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. API Key (for API access)

```bash
# Use API key in header
curl -X POST http://localhost:8000/api/ai/chat \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "@cf/meta/llama-3.1-8b-instruct"
  }'
```

## Available Models

- `@cf/meta/llama-3.1-8b-instruct` - Llama 3.1 8B (default)
- `@cf/meta/llama-3-8b-instruct` - Llama 3 8B
- `@cf/mistral/mistral-7b-instruct-v0.1` - Mistral 7B v0.1
- `@cf/mistral/mistral-7b-instruct-v0.2` - Mistral 7B v0.2
- `@cf/qwen/qwen1.5-7b-chat-awq` - Qwen 1.5 7B

## Database

The application uses SQLAlchemy ORM with support for:
- SQLite (default, for development)
- PostgreSQL (recommended for production)

### Database Schema

**users** table:
- id (UUID, primary key)
- username (unique)
- email (unique)
- password_hash
- api_key (unique)
- is_active
- created_at
- updated_at

**usage_logs** table:
- id (UUID, primary key)
- user_id (foreign key to users)
- timestamp
- model_name
- input_tokens
- output_tokens
- total_tokens
- response_time_ms
- request_data (JSON)

## Development

### Project Structure

```
server/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration management
├── database.py            # Database setup and session management
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── auth.py                # Authentication utilities
├── cloudflare_client.py   # Cloudflare API client
├── routers/
│   ├── auth_router.py     # Authentication routes
│   ├── ai_router.py       # AI/chat routes
│   └── usage_router.py    # Usage tracking routes
├── requirements.txt       # Python dependencies
└── .env                   # Environment variables
```

## Deployment

See the main project README for deployment instructions to Google Cloud.

