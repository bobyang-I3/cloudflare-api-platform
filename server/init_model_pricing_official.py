"""
Initialize model pricing based on Cloudflare official pricing

NEW PRICING SYSTEM:
- Credits are platform's independent currency
- Prices include profit margins (40%-100% depending on tier)
- Platform has full pricing power
- Provider cost changes don't directly affect Credit prices
"""
from database import SessionLocal, init_db
from models_credit import ModelPricing
from pricing_engine import PricingEngine, ModelTier

# Pricing engine for intelligent credit calculation
pricing_engine = PricingEngine()

# Official Cloudflare pricing for LLM models (as of latest update)
OFFICIAL_MODEL_PRICING = [
    # ========== 1B-3B MODELS ==========
    {"id": "@cf/meta/llama-3.2-1b-instruct", "name": "Llama 3.2 1B Instruct", "provider": "Meta", 
     "input_price": 0.027, "output_price": 0.201},
    {"id": "@cf/meta/llama-3.2-3b-instruct", "name": "Llama 3.2 3B Instruct", "provider": "Meta",
     "input_price": 0.051, "output_price": 0.335},
    {"id": "@cf/ibm-granite/granite-4.0-h-micro", "name": "IBM Granite 4.0 Micro", "provider": "IBM",
     "input_price": 0.017, "output_price": 0.112},
    
    # ========== 7B-8B MODELS ==========
    {"id": "@cf/meta/llama-3.1-8b-instruct-fp8-fast", "name": "Llama 3.1 8B Instruct FP8 Fast", "provider": "Meta",
     "input_price": 0.045, "output_price": 0.384, "demand": "high"},
    {"id": "@cf/meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B Instruct", "provider": "Meta",
     "input_price": 0.282, "output_price": 0.827, "demand": "high"},
    {"id": "@cf/meta/llama-3.1-8b-instruct-fp8", "name": "Llama 3.1 8B Instruct FP8", "provider": "Meta",
     "input_price": 0.152, "output_price": 0.287},
    {"id": "@cf/meta/llama-3.1-8b-instruct-awq", "name": "Llama 3.1 8B Instruct AWQ", "provider": "Meta",
     "input_price": 0.123, "output_price": 0.266},
    {"id": "@cf/meta/llama-3-8b-instruct", "name": "Llama 3 8B Instruct", "provider": "Meta",
     "input_price": 0.282, "output_price": 0.827},
    {"id": "@cf/meta/llama-3-8b-instruct-awq", "name": "Llama 3 8B Instruct AWQ", "provider": "Meta",
     "input_price": 0.123, "output_price": 0.266},
    {"id": "@cf/meta/llama-2-7b-chat-fp16", "name": "Llama 2 7B Chat FP16", "provider": "Meta",
     "input_price": 0.556, "output_price": 6.667},
    {"id": "@cf/meta/llama-guard-3-8b", "name": "Llama Guard 3 8B", "provider": "Meta",
     "input_price": 0.484, "output_price": 0.030},
    {"id": "@cf/mistral/mistral-7b-instruct-v0.1", "name": "Mistral 7B Instruct v0.1", "provider": "Mistral",
     "input_price": 0.110, "output_price": 0.190},
    
    # ========== 11B-17B MODELS (VISION) ==========
    {"id": "@cf/meta/llama-3.2-11b-vision-instruct", "name": "Llama 3.2 11B Vision", "provider": "Meta",
     "input_price": 0.049, "output_price": 0.676, "vision": True},
    {"id": "@cf/meta/llama-4-scout-17b-16e-instruct", "name": "Llama 4 Scout 17B", "provider": "Meta",
     "input_price": 0.270, "output_price": 0.850},
    
    # ========== 20B-32B MODELS ==========
    {"id": "@cf/openai/gpt-oss-20b", "name": "GPT OSS 20B", "provider": "OpenAI",
     "input_price": 0.200, "output_price": 0.300, "demand": "high"},
    {"id": "@cf/mistralai/mistral-small-3.1-24b-instruct", "name": "Mistral Small 3.1 24B", "provider": "Mistral",
     "input_price": 0.351, "output_price": 0.555},
    {"id": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", "name": "DeepSeek R1 Distill Qwen 32B", "provider": "DeepSeek",
     "input_price": 0.497, "output_price": 4.881},
    {"id": "@cf/qwen/qwq-32b", "name": "QwQ 32B", "provider": "Qwen",
     "input_price": 0.660, "output_price": 1.000},
    {"id": "@cf/qwen/qwen2.5-coder-32b-instruct", "name": "Qwen 2.5 Coder 32B", "provider": "Qwen",
     "input_price": 0.660, "output_price": 1.000},
    {"id": "@cf/google/gemma-3-12b-it", "name": "Gemma 3 12B IT", "provider": "Google",
     "input_price": 0.345, "output_price": 0.556},
    {"id": "@cf/aisingapore/gemma-sea-lion-v4-27b-it", "name": "Gemma SEA Lion v4 27B", "provider": "AI Singapore",
     "input_price": 0.351, "output_price": 0.555},
    
    # ========== 70B+ MODELS ==========
    {"id": "@cf/meta/llama-3.1-70b-instruct-fp8-fast", "name": "Llama 3.1 70B Instruct FP8 Fast", "provider": "Meta",
     "input_price": 0.293, "output_price": 2.253, "demand": "high"},
    {"id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "name": "Llama 3.3 70B Instruct FP8 Fast", "provider": "Meta",
     "input_price": 0.293, "output_price": 2.253, "demand": "high"},
    {"id": "@cf/openai/gpt-oss-120b", "name": "GPT OSS 120B", "provider": "OpenAI",
     "input_price": 0.350, "output_price": 0.750, "demand": "high"},
    
    # ========== TEXT-TO-IMAGE MODELS ==========
    # Note: Image models are priced per 512x512 tile, not per token
    # We'll set a flat rate for image generation
    {"id": "@cf/black-forest-labs/flux-1-schnell", "name": "FLUX.1 Schnell", "provider": "Black Forest Labs",
     "input_price": 5.28, "output_price": 5.28},  # $0.0000528 per tile * 100,000 = $5.28 per M "tokens" equivalent
    
    # ========== AUDIO MODELS ==========
    # Note: Audio models are priced per audio minute
    # Approximation: 1 minute audio ≈ 150 words ≈ 200 tokens for billing purposes
    {"id": "@cf/openai/whisper-large-v3-turbo", "name": "Whisper Large V3 Turbo", "provider": "OpenAI",
     "input_price": 2.55, "output_price": 0.0, "demand": "high"},  # $0.00051 per minute * 1000 minutes = $0.51, converted to per-M-token equivalent
]


def initialize_official_pricing():
    """Initialize model pricing based on Cloudflare official pricing"""
    print("🔧 Initializing Cloudflare Official Model Pricing...")
    print("💰 Credit Value: 1 Credit = $0.01 USD\n")
    
    # Initialize database
    init_db()
    
    db = SessionLocal()
    try:
        created_count = 0
        updated_count = 0
        
        for config in OFFICIAL_MODEL_PRICING:
            model_id = config["id"]
            input_price_usd = config["input_price"]
            output_price_usd = config["output_price"]
            
            # Auto-detect model tier and demand level
            tier = pricing_engine.get_tier_for_model(model_id, has_vision=config.get("vision", False))
            demand = config.get("demand", "medium")  # Default to medium demand
            
            # Convert USD per M tokens to USD per 1K tokens
            input_cost_per_1k = input_price_usd / 1000
            output_cost_per_1k = output_price_usd / 1000
            
            # Calculate Credits using new pricing engine (includes profit margins)
            pricing_result = pricing_engine.calculate_split_price(
                input_cost_per_1k, 
                output_cost_per_1k, 
                tier, 
                demand
            )
            credits_per_1k_input = pricing_result["input"]
            credits_per_1k_output = pricing_result["output"]
            
            # Check if pricing already exists
            existing = db.query(ModelPricing).filter(ModelPricing.model_id == model_id).first()
            
            if existing:
                # Update existing pricing
                existing.model_name = config["name"]
                existing.provider = config["provider"]
                existing.tier = "official"  # Mark as official pricing
                existing.credits_per_1k_input = credits_per_1k_input
                existing.credits_per_1k_output = credits_per_1k_output
                existing.vision_surcharge = 0.10 if config.get("vision") else 0.0
                existing.is_active = True
                updated_count += 1
                print(f"  ✏️  Updated: {config['name']:<50} In: ${input_price_usd:>6.3f}/M → {credits_per_1k_input:>7.4f} credits/1K")
            else:
                # Create new pricing
                pricing = ModelPricing(
                    model_id=model_id,
                    model_name=config["name"],
                    provider=config["provider"],
                    tier="official",
                    credits_per_1k_input=credits_per_1k_input,
                    credits_per_1k_output=credits_per_1k_output,
                    vision_surcharge=0.10 if config.get("vision") else 0.0,
                    is_active=True
                )
                db.add(pricing)
                created_count += 1
                print(f"  ✅ Created: {config['name']:<50} In: ${input_price_usd:>6.3f}/M → {credits_per_1k_input:>7.4f} credits/1K")
        
        db.commit()
        
        print("\n" + "=" * 100)
        print(f"✅ Official pricing initialized successfully!")
        print(f"   Created: {created_count} models")
        print(f"   Updated: {updated_count} models")
        print(f"   Total: {created_count + updated_count} models")
        print("=" * 100)
        
        # Print sample pricing
        print("\n📊 Sample Pricing (Credits per 1K tokens - with profit margins):")
        print("-" * 120)
        print(f"{'Model':<45} {'Provider Cost':<20} {'Platform Price':<20} {'Profit Margin':<15}")
        print("-" * 120)
        for config in OFFICIAL_MODEL_PRICING[:10]:  # Show first 10
            tier = pricing_engine.get_tier_for_model(config["id"], has_vision=config.get("vision", False))
            demand = config.get("demand", "medium")
            input_cost_per_1k = config["input_price"] / 1000
            output_cost_per_1k = config["output_price"] / 1000
            pricing_result = pricing_engine.calculate_split_price(input_cost_per_1k, output_cost_per_1k, tier, demand)
            input_margin = pricing_engine.estimate_profit_margin(pricing_result["input"], input_cost_per_1k)
            output_margin = pricing_engine.estimate_profit_margin(pricing_result["output"], output_cost_per_1k)
            print(f"{config['name']:<45} In:${input_cost_per_1k*1000:>5.2f}/M  Out:${output_cost_per_1k*1000:>6.2f}/M   "
                  f"In:{pricing_result['input']:>5.2f}C  Out:{pricing_result['output']:>6.2f}C   "
                  f"~{int((input_margin+output_margin)/2)}%")
        print("-" * 120)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    initialize_official_pricing()

