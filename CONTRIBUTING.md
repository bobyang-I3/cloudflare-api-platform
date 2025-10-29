# Contributing to Cloudflare AI API Platform

Thank you for your interest in contributing to this project. This document provides guidelines and instructions for contributing.

## Code of Conduct

This project follows a Code of Conduct that all contributors are expected to uphold. Please be respectful and constructive in your interactions.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- Clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- System information (OS, Python version, Node version)
- Error messages or logs

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- Clear and descriptive title
- Detailed description of the proposed functionality
- Explanation of why this enhancement would be useful
- Possible implementation approach

### Pull Requests

1. Fork the repository and create your branch from `main`
2. Follow the existing code style and conventions
3. Write clear, descriptive commit messages
4. Update documentation as needed
5. Add tests for new functionality
6. Ensure all tests pass
7. Submit your pull request

## Development Setup

### Backend Development

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest black flake8  # Development tools
```

### Frontend Development

```bash
cd client
npm install
npm run dev
```

## Code Style

### Python

- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for functions and classes
- Run `black` for formatting
- Run `flake8` for linting

### TypeScript/React

- Use TypeScript for type safety
- Follow React best practices
- Use functional components and hooks
- Write clear component interfaces
- Run `npm run lint` before committing

## Testing

### Backend Tests

```bash
cd server
pytest
```

### Frontend Tests

```bash
cd client
npm test
```

## Commit Message Guidelines

Use clear and meaningful commit messages:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example: `feat: Add credit transfer functionality`

## Project Structure

Maintain the existing project structure:
- Keep backend code in `server/`
- Keep frontend code in `client/`
- Add new API endpoints in appropriate routers
- Add new components in `client/src/components/`
- Add new pages in `client/src/pages/`

## Documentation

- Update README.md for significant changes
- Add inline comments for complex logic
- Update API documentation for new endpoints
- Include examples where helpful

## Questions?

Feel free to open an issue for any questions about contributing.

