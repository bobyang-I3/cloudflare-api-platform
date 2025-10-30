# Prism AI

<div align="center">

![Prism AI Logo](client/public/logo.svg)

**One Platform, Infinite Possibilities**

A unified AI resource platform with credit economy, resource marketplace, and intelligent routing across multiple AI providers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org/)

</div>

---

## 🌟 What is Prism AI?

**Prism AI** is a next-generation platform that aggregates AI resources from multiple providers (OpenAI, Anthropic, Cloudflare, and more) into a single unified interface with:

- **💳 Independent Credit Economy** - Platform-native currency for all AI services
- **🏪 Resource Marketplace** - P2P trading of API quotas and resources
- **🏦 Resource Pool** - Community-driven resource bank with smart routing
- **👥 Social Features** - Forum, group chat, and private messaging
- **📊 Advanced Analytics** - Comprehensive usage tracking and insights
- **🔒 Enterprise Security** - API key validation and fraud prevention

---

## ✨ Core Features

### 1. **Multi-Provider AI Access**
Access 80+ AI models from multiple providers through a single unified API:
- 🤖 **Text Generation**: GPT, Claude, Llama, Mistral
- 🎨 **Image Generation**: FLUX, Stable Diffusion
- 🎙️ **Speech Recognition**: Whisper
- 👁️ **Vision Models**: Image understanding and captioning

### 2. **Credit Economy System**
- Platform-native **Credits** as the sole currency
- Intelligent pricing engine with demand-based adjustments
- Real-time balance tracking and transaction history
- Automated billing and credit management

### 3. **Resource Marketplace**
- **P2P Trading**: Buy and sell API quotas directly
- **Escrow System**: Secure transactions with platform protection
- **Rating System**: Community-driven trust scores
- **Flexible Pricing**: Set your own rates

### 4. **Resource Pool (Bank)**
- **Deposit Resources**: Contribute API keys to earn passive income
- **Smart Routing**: Intelligent selection of optimal resources
- **Trust-Based Verification**: API key validation with gradual credit release
- **Automated Earnings**: 85% revenue share for contributors

### 5. **Social & Community**
- **Forum**: Post discussions, share insights, upload images
- **Group Chat**: Create and join topic-based channels
- **Private Messaging**: Direct user-to-user communication
- **User Profiles**: Customizable profiles with avatars

### 6. **Admin & Analytics**
- **User Management**: Admin dashboard for user operations
- **Pricing Control**: Dynamic model pricing management
- **Resource Monitoring**: Track pool resources and usage
- **Revenue Analytics**: Platform earnings and fee tracking

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 13+ (production) or SQLite (development)
- API keys from supported providers (optional for initial setup)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/prism-ai.git
cd prism-ai

# 2. Backend setup
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Initialize database
python -c "from database import init_db; init_db()"

# 5. Start backend
python main.py

# 6. Frontend setup (new terminal)
cd ../client
npm install
npm run dev
```

Visit `http://localhost:5173` to access the platform.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Prism AI Platform                    │
├─────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                           │
│  ├─ Chat Interface                                       │
│  ├─ Marketplace UI                                       │
│  ├─ Resource Pool Dashboard                              │
│  └─ Admin Panel                                          │
├─────────────────────────────────────────────────────────┤
│  Backend (FastAPI + Python)                              │
│  ├─ Credit Service                                       │
│  ├─ Smart Router                                         │
│  ├─ API Key Validator                                    │
│  ├─ Marketplace Engine                                   │
│  └─ Resource Pool Manager                                │
├─────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                   │
│  ├─ Users & Credits                                      │
│  ├─ Marketplace Listings                                 │
│  ├─ Resource Pool                                        │
│  └─ Social Data                                          │
├─────────────────────────────────────────────────────────┤
│  External AI Providers                                   │
│  ├─ OpenAI                                               │
│  ├─ Anthropic                                            │
│  ├─ Cloudflare Workers AI                                │
│  └─ Custom Endpoints                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 How It Works

### Credit System
1. **Deposit Credits**: Admin or users add credits to accounts
2. **Use AI Services**: Credits automatically deducted based on usage
3. **Track Everything**: Real-time balance updates and transaction logs

### Marketplace
1. **List Resources**: Sell API quotas or access
2. **Browse Listings**: Find resources that fit your needs
3. **Secure Trading**: Platform handles escrow and payments
4. **Rate & Review**: Build trust through community feedback

### Resource Pool
1. **Deposit API Key**: Submit key with claimed quota
2. **Validation**: Platform verifies key authenticity
3. **Initial Release**: Receive 10% credits upfront
4. **Gradual Unlock**: Remaining 90% released as key is used
5. **Earn Passive Income**: 85% revenue share on usage

---

## 🔧 Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Recharts |
| **Backend** | FastAPI, SQLAlchemy, Pydantic |
| **Database** | PostgreSQL, SQLite |
| **Auth** | JWT tokens, API keys |
| **AI SDKs** | httpx (OpenAI, Anthropic, Cloudflare) |
| **Deployment** | Systemd, Nginx, Docker (optional) |

---

## 📚 Documentation

- [Quick Start Guide](docs/QUICK_DEPLOY.md)
- [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)
- [API Documentation](http://localhost:8000/docs) (when running)
- [Credit Economy Design](CREDIT_ECONOMY_DESIGN.md)
- [Resource Pool System](RESOURCE_POOL_DESIGN.md)
- [Anti-Fraud System](ANTI_FRAUD_SYSTEM.md)

---

## 🛡️ Security Features

- ✅ **API Key Validation**: Real-time verification before accepting deposits
- ✅ **Trust-Based System**: Gradual credit release for new resources
- ✅ **Encrypted Storage**: All API keys encrypted at rest
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **JWT Authentication**: Secure user sessions
- ✅ **Transaction Logs**: Complete audit trail

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌐 Community

- **Forum**: Built-in community forum
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Share ideas and get help

---

## 🙏 Acknowledgments

Built with support from the open-source community and powered by:
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [OpenAI](https://openai.com/)
- [Anthropic](https://anthropic.com/)
- [Cloudflare Workers AI](https://ai.cloudflare.com/)

---

<div align="center">

**Prism AI** - Where AI Resources Converge

[Website](https://prism-ai.com) · [Documentation](docs/) · [API Reference](http://localhost:8000/docs)

Made with ❤️ by the Prism AI Team

</div>
