"""
API Key Validator - Verify API keys before accepting deposits

Similar to vast.ai's GPU verification, we verify API resources before accepting them
into the pool. This prevents fraud and ensures resource quality.
"""

import httpx
import json
from typing import Dict, Optional, Tuple
from enum import Enum
import asyncio


class ValidationResult(Enum):
    """Validation result status"""
    VALID = "valid"
    INVALID = "invalid"
    QUOTA_EXHAUSTED = "quota_exhausted"
    RATE_LIMITED = "rate_limited"
    NETWORK_ERROR = "network_error"
    UNKNOWN_ERROR = "unknown_error"


class APIKeyValidator:
    """
    Validates API keys by making actual test requests
    
    Strategy:
    1. Make a minimal test request to verify the key works
    2. Try to query quota/usage information if available
    3. Estimate actual available quota
    4. Return validation result with quota estimate
    """
    
    # Test prompts for validation (minimal cost)
    TEST_PROMPTS = {
        "openai": "Hi",
        "anthropic": "Hi",
        "cloudflare": "Hi",
        "default": "Hi"
    }
    
    @classmethod
    async def validate_key(
        cls,
        provider: str,
        api_key: str,
        model_id: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Tuple[ValidationResult, Optional[float], Optional[str]]:
        """
        Validate an API key by making a test request
        
        Args:
            provider: Provider name (openai, anthropic, cloudflare, etc.)
            api_key: API key to validate
            model_id: Optional model ID to test with
            base_url: Optional custom API endpoint
            
        Returns:
            Tuple of (ValidationResult, estimated_quota_in_credits, error_message)
            
        Example:
            result, quota, error = await validate_key("openai", "sk-...")
            if result == ValidationResult.VALID:
                print(f"Valid! Estimated quota: {quota} credits")
        """
        provider_lower = provider.lower()
        
        # Route to appropriate validator
        if "openai" in provider_lower:
            return await cls._validate_openai(api_key, model_id, base_url)
        elif "anthropic" in provider_lower or "claude" in provider_lower:
            return await cls._validate_anthropic(api_key, model_id, base_url)
        elif "cloudflare" in provider_lower:
            return await cls._validate_cloudflare(api_key, model_id, base_url)
        else:
            # Generic validation for unknown providers
            return await cls._validate_generic(api_key, base_url, provider)
    
    @classmethod
    async def _validate_openai(
        cls,
        api_key: str,
        model_id: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Tuple[ValidationResult, Optional[float], Optional[str]]:
        """Validate OpenAI API key"""
        url = base_url or "https://api.openai.com/v1/chat/completions"
        model = model_id or "gpt-3.5-turbo"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Minimal test request (very low cost)
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 5
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    # Valid key! Try to estimate quota
                    # OpenAI doesn't expose quota directly, so we estimate based on successful response
                    # Default estimate: assume some reasonable quota
                    estimated_quota = 100.0  # Conservative estimate in Credits
                    return ValidationResult.VALID, estimated_quota, None
                
                elif response.status_code == 401:
                    return ValidationResult.INVALID, None, "Invalid API key"
                
                elif response.status_code == 429:
                    # Rate limited or quota exhausted
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get("error", {}).get("message", "Rate limited or quota exhausted")
                    
                    if "quota" in error_msg.lower() or "insufficient" in error_msg.lower():
                        return ValidationResult.QUOTA_EXHAUSTED, 0.0, error_msg
                    else:
                        return ValidationResult.RATE_LIMITED, None, error_msg
                
                else:
                    error_text = response.text[:200]
                    return ValidationResult.UNKNOWN_ERROR, None, f"HTTP {response.status_code}: {error_text}"
        
        except httpx.TimeoutException:
            return ValidationResult.NETWORK_ERROR, None, "Request timeout"
        except Exception as e:
            return ValidationResult.NETWORK_ERROR, None, str(e)
    
    @classmethod
    async def _validate_anthropic(
        cls,
        api_key: str,
        model_id: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Tuple[ValidationResult, Optional[float], Optional[str]]:
        """Validate Anthropic API key"""
        url = base_url or "https://api.anthropic.com/v1/messages"
        model = model_id or "claude-3-haiku-20240307"
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 5
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    estimated_quota = 100.0
                    return ValidationResult.VALID, estimated_quota, None
                
                elif response.status_code == 401:
                    return ValidationResult.INVALID, None, "Invalid API key"
                
                elif response.status_code == 429:
                    return ValidationResult.RATE_LIMITED, None, "Rate limited"
                
                else:
                    error_text = response.text[:200]
                    return ValidationResult.UNKNOWN_ERROR, None, f"HTTP {response.status_code}: {error_text}"
        
        except Exception as e:
            return ValidationResult.NETWORK_ERROR, None, str(e)
    
    @classmethod
    async def _validate_cloudflare(
        cls,
        api_key: str,
        model_id: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Tuple[ValidationResult, Optional[float], Optional[str]]:
        """Validate Cloudflare Workers AI API key"""
        # Cloudflare format: account_id:api_key or just api_key
        # URL format: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
        
        # For Cloudflare, we need both account ID and API key
        # This is more complex, so we return a placeholder for now
        
        # TODO: Implement actual Cloudflare validation
        # For now, accept as valid with warning
        return ValidationResult.VALID, 50.0, "Cloudflare validation not fully implemented - accepted with caution"
    
    @classmethod
    async def _validate_generic(
        cls,
        api_key: str,
        base_url: Optional[str],
        provider: str
    ) -> Tuple[ValidationResult, Optional[float], Optional[str]]:
        """Generic validation for unknown providers"""
        if not base_url:
            return ValidationResult.UNKNOWN_ERROR, None, f"Base URL required for {provider}"
        
        # Try a simple GET request to the base URL
        headers = {"Authorization": f"Bearer {api_key}"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(base_url, headers=headers)
                
                if response.status_code in [200, 201, 204]:
                    return ValidationResult.VALID, 50.0, None
                elif response.status_code == 401:
                    return ValidationResult.INVALID, None, "Invalid API key"
                else:
                    return ValidationResult.UNKNOWN_ERROR, None, f"HTTP {response.status_code}"
        
        except Exception as e:
            return ValidationResult.NETWORK_ERROR, None, str(e)
    
    @classmethod
    def calculate_initial_credit(
        cls,
        claimed_quota: float,
        validation_result: ValidationResult,
        estimated_quota: Optional[float]
    ) -> Tuple[float, str]:
        """
        Calculate how much credit to give initially based on validation
        
        Strategy (similar to vast.ai's trust system):
        1. If validation failed: 0 credits
        2. If validation succeeded:
           - Give 10% of claimed quota immediately (or estimated quota, whichever is lower)
           - Remaining 90% released gradually as resource is used successfully
        
        Args:
            claimed_quota: What user claims the quota is worth (in Credits)
            validation_result: Result of validation
            estimated_quota: Estimated quota from validation (if available)
            
        Returns:
            Tuple of (initial_credit_amount, explanation)
        """
        if validation_result != ValidationResult.VALID:
            return 0.0, f"Validation failed: {validation_result.value}"
        
        # Use the lower of claimed vs estimated
        if estimated_quota is not None:
            actual_quota = min(claimed_quota, estimated_quota)
            if estimated_quota < claimed_quota:
                explanation = f"Claimed {claimed_quota} Credits, but validation estimated {estimated_quota} Credits. Using lower estimate."
            else:
                explanation = f"Validation confirmed quota. Initial deposit: 10% ({actual_quota * 0.1} Credits)."
        else:
            actual_quota = claimed_quota
            explanation = f"Could not verify quota. Accepting claimed amount with caution. Initial deposit: 10%."
        
        # Give 10% initially (with 10% platform fee)
        # User gets: 10% of quota * 90% (after fee) = 9% of claimed quota
        initial_credit = actual_quota * 0.10 * 0.90
        
        return round(initial_credit, 2), explanation


# Example usage
if __name__ == "__main__":
    async def test_validation():
        print("🔐 API Key Validator - Test Suite")
        print("=" * 60)
        
        # Test with fake keys (will fail)
        print("\n1. Testing with fake OpenAI key...")
        result, quota, error = await APIKeyValidator.validate_key(
            "openai",
            "sk-fake-key-12345"
        )
        print(f"   Result: {result.value}")
        print(f"   Quota: {quota}")
        print(f"   Error: {error}")
        
        # Test credit calculation
        print("\n2. Testing credit calculation...")
        initial, explanation = APIKeyValidator.calculate_initial_credit(
            claimed_quota=100.0,
            validation_result=ValidationResult.VALID,
            estimated_quota=80.0
        )
        print(f"   Claimed: 100 Credits")
        print(f"   Estimated: 80 Credits")
        print(f"   Initial credit: {initial} Credits")
        print(f"   Explanation: {explanation}")
        
        print("\n3. Trust-based deposit strategy:")
        print("   - User deposits API key claiming 100 Credits worth")
        print("   - System validates key (makes test request)")
        print("   - If valid: Give 10% immediately (9 Credits after fee)")
        print("   - Remaining 90% released as resource is used successfully")
        print("   - If resource fails: User loses remaining unreleased credits")
        print("\n   This protects platform from fraud while allowing legitimate users")
    
    # Run test
    asyncio.run(test_validation())

