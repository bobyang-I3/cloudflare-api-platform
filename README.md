# Cloudflare AI API Platform

A production-ready API platform for Cloudflare Workers AI models with comprehensive usage tracking, credit-based billing system, and modern web interface.

## Overview

This platform provides a complete solution for managing and monitoring AI model usage through Cloudflare's Workers AI service. It features user authentication, credit management, detailed analytics, and an intuitive chat interface supporting 80+ AI models across multiple categories including text generation, image synthesis, speech recognition, and embeddings.

## Key Features

- **Multi-Model Support**: Access to 80+ Cloudflare Workers AI models
- **Credit System**: Token-based billing with user balances and transaction history
- **Usage Analytics**: Comprehensive tracking with charts and detailed logs
- **Chat Interface**: Modern conversational UI with streaming responses
- **Admin Dashboard**: User management and credit operations
- **API Access**: RESTful API with authentication and rate limiting
- **Responsive Design**: Mobile-optimized interface

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **Authentication**: JWT tokens
- **Rate Limiting**: SlowAPI
- **AI Provider**: Cloudflare Workers AI API

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Data Visualization**: Recharts
- **Styling**: CSS3 with responsive design

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn
- Cloudflare API credentials

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/api-billing-platform.git
cd api-billing-platform
```

### 2. Backend Setup

```bash
cd server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Build for production
npm run build
```

### 4. Environment Configuration

Create `server/.env` with the following:

```env
# Cloudflare Credentials
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_BASE=https://api.cloudflare.com/client/v4

# Database
DATABASE_URL=sqlite:///./app.db

# JWT Configuration
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# API Configuration
API_V1_PREFIX=/api
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Server
HOST=0.0.0.0
PORT=8000
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd server
source venv/bin/activate
python main.py
```
Server runs on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
Frontend runs on `http://localhost:5173`

### Production Deployment

The platform includes systemd service configurations for production deployment on Linux servers.

**Backend Service** (`/etc/systemd/system/backend.service`):
```ini
[Unit]
Description=Cloudflare API Platform - Backend
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/api-billing-platform/server
Environment="PATH=/path/to/api-billing-platform/server/venv/bin"
ExecStart=/path/to/api-billing-platform/server/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (`/etc/systemd/system/frontend.service`):
```ini
[Unit]
Description=Cloudflare API Platform - Frontend
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/api-billing-platform/client
ExecStart=/usr/bin/npm run preview
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl enable backend frontend
sudo systemctl start backend frontend
```

## Project Structure

```
api-billing-platform/
├── server/                      # Backend application
│   ├── main.py                 # FastAPI application entry
│   ├── config.py               # Configuration management
│   ├── database.py             # Database setup
│   ├── models.py               # SQLAlchemy models
│   ├── models_credit.py        # Credit system models
│   ├── credit_service.py       # Credit business logic
│   ├── cloudflare_client.py    # Cloudflare API client
│   ├── rate_limit.py           # Rate limiting setup
│   ├── routers/                # API endpoints
│   │   ├── auth_router.py     # Authentication
│   │   ├── ai_router.py       # AI model operations
│   │   ├── usage_router.py    # Usage tracking
│   │   ├── credit_router.py   # Credit management
│   │   └── admin_router.py    # Admin operations
│   ├── requirements.txt        # Python dependencies
│   └── init_model_pricing.py  # Model pricing initialization
│
├── client/                      # Frontend application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx      # Login page
│   │   │   └── Dashboard.tsx  # Main dashboard
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx        # Chat interface
│   │   │   ├── UsagePanel.tsx       # Analytics dashboard
│   │   │   ├── CreditPanel.tsx      # Credit management
│   │   │   ├── AdminPanel.tsx       # Admin interface
│   │   │   └── AdminCreditPanel.tsx # Admin credit ops
│   │   ├── api.ts             # API client
│   │   └── App.tsx            # Root component
│   ├── package.json           # Node dependencies
│   └── vite.config.ts         # Vite configuration
│
└── README.md                   # This file
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### AI Model Endpoints

- `GET /api/ai/models` - List all available models
- `POST /api/ai/chat` - Text generation (non-streaming)
- `POST /api/ai/chat/stream` - Text generation (streaming)
- `POST /api/ai/vision-chat` - Vision model chat
- `POST /api/ai/transcribe` - Audio transcription
- `POST /api/ai/generate-image` - Image generation

### Usage Endpoints

- `GET /api/usage/stats` - Get usage statistics
- `GET /api/usage/logs` - Get usage logs
- `GET /api/usage/daily` - Get daily usage data

### Credit Endpoints

- `GET /api/credits/balance` - Get user balance
- `GET /api/credits/transactions` - Get transaction history
- `POST /api/credits/transfer` - Transfer credits to another user
- `GET /api/credits/pricing` - Get model pricing

### Admin Endpoints (Requires admin role)

- `GET /api/admin/users` - List all users
- `POST /api/admin/credits/deposit` - Deposit credits to user
- `POST /api/admin/credits/deduct` - Deduct credits from user

Interactive API documentation available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

## Credit System

The platform uses a credit-based billing system where:
- 1 Credit = $0.01 USD
- Models are priced based on token usage (input/output)
- Credits are deducted automatically on API calls
- Users can transfer credits between accounts
- Admins can deposit or deduct credits

Model pricing is based on Cloudflare's official rates and initialized via `init_model_pricing_official.py`.

## Database Schema

### Core Tables

- **users**: User accounts and authentication
- **user_limits**: API rate limits per user
- **usage_logs**: API call logs with token usage
- **conversations**: Chat conversation history
- **user_credits**: User credit balances
- **credit_transactions**: Credit transaction history
- **model_pricing**: Model pricing configuration

## Security Features

- JWT-based authentication with token refresh
- Password hashing with secure algorithms
- Rate limiting per user (10 requests/minute default)
- CORS configuration for allowed origins
- Admin-only endpoints with role validation

## Monitoring and Analytics

The platform provides comprehensive analytics including:
- Daily token usage trends
- Credit consumption tracking
- Model usage distribution
- Request response times
- Per-user usage statistics

## Development

### Running Tests

```bash
# Backend tests
cd server
pytest

# Frontend tests
cd client
npm test
```

### Code Quality

```bash
# Python linting
cd server
flake8 .
black .

# TypeScript linting
cd client
npm run lint
```

## Troubleshooting

### Database Issues

Reset database:
```bash
cd server
rm app.db
python main.py  # Auto-creates new database
```

### Port Conflicts

Kill processes on ports:
```bash
# Linux/Mac
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Dependency Issues

Reinstall dependencies:
```bash
# Backend
cd server
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd client
rm -rf node_modules package-lock.json
npm install
```

## Performance Optimization

- Database indexing on frequently queried fields
- Connection pooling for database
- Response caching for model list
- Lazy loading for frontend components
- Code splitting for reduced bundle size

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Cloudflare Workers AI for model infrastructure
- FastAPI for the excellent Python web framework
- React community for frontend libraries

## Support

For issues and questions:
- Open an issue on GitHub
- Check the API documentation at `/docs`
- Review the implementation notes in the codebase

---

**Version**: 3.0  
**Last Updated**: October 2025
