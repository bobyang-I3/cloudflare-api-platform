"""
Credit Pricing Engine - Platform Independent Currency System

Credits are the platform's independent currency, not directly tied to USD.
The platform has full pricing power and can adjust based on:
- Supply cost (from providers)
- Market demand (model popularity)
- Platform profit margin
- Competitive positioning
"""

from typing import Dict, Optional
from enum import Enum

class ModelTier(Enum):
    """Model tier classification based on capabilities and cost"""
    MICRO = "micro"        # 1B-3B models
    SMALL = "small"        # 7B-8B models
    MEDIUM = "medium"      # 11B-32B models
    LARGE = "large"        # 70B+ models
    VISION = "vision"      # Vision models
    AUDIO = "audio"        # Audio models (Whisper, etc.)
    IMAGE = "image"        # Image generation models
    EMBEDDING = "embedding"  # Embedding models

class PricingEngine:
    """
    Intelligent pricing engine that converts provider costs to platform Credits
    
    Philosophy:
    - Credits are independent from USD
    - Platform sets prices based on value, not just cost
    - Allows for flexible profit margins
    - Can adjust pricing based on market conditions
    """
    
    # Base profit multipliers by model tier (how much we mark up from cost)
    BASE_PROFIT_MULTIPLIERS = {
        ModelTier.MICRO: 1.8,      # 80% profit margin (smaller models, higher margin)
        ModelTier.SMALL: 1.6,      # 60% profit margin
        ModelTier.MEDIUM: 1.5,     # 50% profit margin
        ModelTier.LARGE: 1.4,      # 40% profit margin (larger models, lower margin but higher volume)
        ModelTier.VISION: 1.7,     # 70% profit margin (specialized)
        ModelTier.AUDIO: 1.6,      # 60% profit margin
        ModelTier.IMAGE: 2.0,      # 100% profit margin (high value, low frequency)
        ModelTier.EMBEDDING: 1.5,  # 50% profit margin
    }
    
    # Additional multipliers based on demand/popularity
    DEMAND_MULTIPLIERS = {
        "high": 1.2,      # Popular models, charge 20% more
        "medium": 1.0,    # Standard models
        "low": 0.9,       # Less popular, discount 10% to encourage usage
    }
    
    # Minimum credit charge (prevents near-zero pricing)
    MIN_CREDIT_CHARGE = 0.1
    
    @classmethod
    def calculate_credit_price(
        cls,
        provider_cost_per_1k: float,
        tier: ModelTier,
        demand: str = "medium",
        custom_multiplier: Optional[float] = None
    ) -> float:
        """
        Calculate credit price for a model
        
        Args:
            provider_cost_per_1k: Provider's cost in USD per 1K tokens
            tier: Model tier classification
            demand: Demand level ("high", "medium", "low")
            custom_multiplier: Optional custom multiplier (overrides tier multiplier)
        
        Returns:
            Price in Credits per 1K tokens
        
        Example:
            Provider cost: $0.00282 per 1K tokens (Llama 3.1 8B)
            Tier: SMALL (1.6x multiplier)
            Demand: medium (1.0x)
            
            Cost in "Credit units": 0.00282 / 0.01 = 0.282
            With multiplier: 0.282 * 1.6 * 1.0 = 0.45 Credits
        """
        # Convert USD cost to "credit units" (assume 1 credit ≈ $0.01 as base unit)
        # This is just for calculation, not for display to users
        cost_in_credit_units = provider_cost_per_1k / 0.01
        
        # Apply profit multiplier
        if custom_multiplier is not None:
            profit_multiplier = custom_multiplier
        else:
            profit_multiplier = cls.BASE_PROFIT_MULTIPLIERS.get(tier, 1.5)
        
        # Apply demand multiplier
        demand_multiplier = cls.DEMAND_MULTIPLIERS.get(demand, 1.0)
        
        # Calculate final price
        credit_price = cost_in_credit_units * profit_multiplier * demand_multiplier
        
        # Apply minimum charge
        credit_price = max(credit_price, cls.MIN_CREDIT_CHARGE)
        
        # Round to 2 decimal places for display
        return round(credit_price, 2)
    
    @classmethod
    def calculate_split_price(
        cls,
        input_cost_per_1k: float,
        output_cost_per_1k: float,
        tier: ModelTier,
        demand: str = "medium",
        custom_multiplier: Optional[float] = None
    ) -> Dict[str, float]:
        """
        Calculate separate input/output credit prices
        
        Returns:
            {"input": <credits per 1K>, "output": <credits per 1K>}
        """
        return {
            "input": cls.calculate_credit_price(input_cost_per_1k, tier, demand, custom_multiplier),
            "output": cls.calculate_credit_price(output_cost_per_1k, tier, demand, custom_multiplier)
        }
    
    @classmethod
    def estimate_profit_margin(cls, credit_price: float, provider_cost_per_1k: float) -> float:
        """
        Calculate profit margin percentage
        
        Returns:
            Profit margin as percentage (e.g., 60.0 for 60%)
        """
        cost_in_credit_units = provider_cost_per_1k / 0.01
        if cost_in_credit_units == 0:
            return 0.0
        
        profit = credit_price - cost_in_credit_units
        margin = (profit / cost_in_credit_units) * 100
        return round(margin, 1)
    
    @classmethod
    def get_tier_for_model(cls, model_id: str, has_vision: bool = False) -> ModelTier:
        """
        Auto-detect model tier based on model ID
        """
        model_lower = model_id.lower()
        
        # Vision models
        if has_vision or "vision" in model_lower or "llava" in model_lower:
            return ModelTier.VISION
        
        # Audio models
        if "whisper" in model_lower or "audio" in model_lower:
            return ModelTier.AUDIO
        
        # Image models
        if "flux" in model_lower or "stable-diffusion" in model_lower or "sdxl" in model_lower:
            return ModelTier.IMAGE
        
        # Embedding models
        if "embed" in model_lower or "bge" in model_lower:
            return ModelTier.EMBEDDING
        
        # Size-based detection for text models
        if "1b" in model_lower or "3b" in model_lower or "micro" in model_lower:
            return ModelTier.MICRO
        elif "7b" in model_lower or "8b" in model_lower:
            return ModelTier.SMALL
        elif "11b" in model_lower or "12b" in model_lower or "17b" in model_lower or \
             "20b" in model_lower or "24b" in model_lower or "27b" in model_lower or "32b" in model_lower:
            return ModelTier.MEDIUM
        elif "70b" in model_lower or "120b" in model_lower or "72b" in model_lower:
            return ModelTier.LARGE
        
        # Default to SMALL
        return ModelTier.SMALL


# Example usage and testing
if __name__ == "__main__":
    engine = PricingEngine()
    
    # Test 1: Llama 3.1 8B (Small model, high demand)
    print("=" * 60)
    print("Test 1: Llama 3.1 8B Instruct")
    input_cost = 0.282 / 1000  # $0.282 per M tokens → per 1K
    output_cost = 0.827 / 1000
    
    pricing = engine.calculate_split_price(input_cost, output_cost, ModelTier.SMALL, demand="high")
    print(f"Provider cost: ${input_cost * 1000:.3f}/M input, ${output_cost * 1000:.3f}/M output")
    print(f"Platform price: {pricing['input']:.2f} Credits/1K input, {pricing['output']:.2f} Credits/1K output")
    print(f"Profit margin: {engine.estimate_profit_margin(pricing['input'], input_cost):.1f}% input, "
          f"{engine.estimate_profit_margin(pricing['output'], output_cost):.1f}% output")
    
    # Test 2: GPT OSS 120B (Large model, medium demand)
    print("\n" + "=" * 60)
    print("Test 2: GPT OSS 120B")
    input_cost = 0.350 / 1000
    output_cost = 0.750 / 1000
    
    pricing = engine.calculate_split_price(input_cost, output_cost, ModelTier.LARGE, demand="medium")
    print(f"Provider cost: ${input_cost * 1000:.3f}/M input, ${output_cost * 1000:.3f}/M output")
    print(f"Platform price: {pricing['input']:.2f} Credits/1K input, {pricing['output']:.2f} Credits/1K output")
    print(f"Profit margin: {engine.estimate_profit_margin(pricing['input'], input_cost):.1f}% input, "
          f"{engine.estimate_profit_margin(pricing['output'], output_cost):.1f}% output")
    
    # Test 3: Whisper (Audio model)
    print("\n" + "=" * 60)
    print("Test 3: Whisper Large v3 Turbo")
    cost = 0.600 / 1000  # Flat rate
    
    price = engine.calculate_credit_price(cost, ModelTier.AUDIO, demand="high")
    print(f"Provider cost: ${cost * 1000:.3f}/M tokens")
    print(f"Platform price: {price:.2f} Credits/1K tokens")
    print(f"Profit margin: {engine.estimate_profit_margin(price, cost):.1f}%")

