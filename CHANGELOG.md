# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-10-29

### Added
- Credit-based billing system with user balances
- Credit transaction tracking and history
- Credit transfer functionality between users
- Admin credit management (deposit/deduct)
- Official Cloudflare model pricing integration
- Usage analytics with charts (Recharts)
- Daily usage tracking and visualization
- Model usage distribution charts
- Rate limiting on API endpoints (10 req/min default)
- Mobile-responsive design for all panels
- Transaction type categorization (deposit, consumption, bonus, transfer)

### Changed
- Updated pricing model to match Cloudflare official rates
- Optimized mobile interface for Dashboard, Credits, and Admin panels
- Improved chat interface with better error handling
- Enhanced usage statistics display
- Refactored credit service for better scalability

### Fixed
- Chart label overlap on mobile devices
- Expenses card overflow in Account Overview
- Admin panel table display on mobile
- Streaming chat response handling
- Empty response issues in chat

## [2.0.0] - 2025-10-27

### Added
- FastAPI backend with SQLAlchemy ORM
- User authentication with JWT tokens
- 80+ Cloudflare AI model support
- Chat interface with conversation management
- Usage tracking and statistics
- API key management
- Admin panel for user management
- Streaming chat responses
- Vision model support (image + text)
- Audio transcription
- Image generation

### Changed
- Migrated from vanilla JavaScript to React + TypeScript
- Improved UI/UX with modern design
- Enhanced conversation management
- Better error handling and user feedback

## [1.0.0] - 2025-10-15

### Added
- Initial release
- Basic chat functionality
- Model selection
- Usage tracking
- User authentication

## Upcoming Features

### Planned for v3.1.0
- Real-time monitoring dashboard
- PWA support for offline capability
- Redis caching for improved performance
- PostgreSQL migration option
- Batch API operations
- Webhook notifications

### Under Consideration
- Multi-language support
- Advanced analytics
- Custom model fine-tuning integration
- API usage quotas
- Team collaboration features

