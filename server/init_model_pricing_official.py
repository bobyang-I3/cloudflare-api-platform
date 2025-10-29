"""
Initialize model pricing based on Cloudflare official pricing
Pricing reference: https://developers.cloudflare.com/workers-ai/platform/pricing/
Credit value: 1 Credit = $0.01 USD
"""
from database import SessionLocal, init_db
from models_credit import ModelPricing

# Convert Cloudflare pricing ($ per M tokens) to credits per 1K tokens
# Formula: credits_per_1k = (price_per_M / 1000) / 0.01
def price_to_credits(price_per_m: float) -> float:
    """Convert Cloudflare price ($ per M tokens) to credits per 1K tokens"""
    return (price_per_m / 1000) / 0.01

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
     "input_price": 0.045, "output_price": 0.384},
    {"id": "@cf/meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B Instruct", "provider": "Meta",
     "input_price": 0.282, "output_price": 0.827},
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
     "input_price": 0.200, "output_price": 0.300},
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
     "input_price": 0.293, "output_price": 2.253},
    {"id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "name": "Llama 3.3 70B Instruct FP8 Fast", "provider": "Meta",
     "input_price": 0.293, "output_price": 2.253},
    {"id": "@cf/openai/gpt-oss-120b", "name": "GPT OSS 120B", "provider": "OpenAI",
     "input_price": 0.350, "output_price": 0.750},
    
    # ========== TEXT-TO-IMAGE MODELS ==========
    # Note: Image models are priced per 512x512 tile, not per token
    # We'll set a flat rate for image generation
    {"id": "@cf/black-forest-labs/flux-1-schnell", "name": "FLUX.1 Schnell", "provider": "Black Forest Labs",
     "input_price": 5.28, "output_price": 5.28},  # $0.0000528 per tile * 100,000 = $5.28 per M "tokens" equivalent
    
    # ========== AUDIO MODELS ==========
    # Note: Audio models are priced per audio minute
    # Approximation: 1 minute audio ≈ 150 words ≈ 200 tokens for billing purposes
    {"id": "@cf/openai/whisper-large-v3-turbo", "name": "Whisper Large V3 Turbo", "provider": "OpenAI",
     "input_price": 2.55, "output_price": 0.0},  # $0.00051 per minute * 1000 minutes = $0.51, converted to per-M-token equivalent
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
            
            # Convert to credits per 1K tokens
            credits_per_1k_input = price_to_credits(input_price_usd)
            credits_per_1k_output = price_to_credits(output_price_usd)
            
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
        print("\n📊 Sample Pricing (Credits per 1K tokens):")
        print("-" * 100)
        print(f"{'Model':<50} {'Input':<15} {'Output':<15}")
        print("-" * 100)
        for config in OFFICIAL_MODEL_PRICING[:10]:  # Show first 10
            input_credits = price_to_credits(config["input_price"])
            output_credits = price_to_credits(config["output_price"])
            print(f"{config['name']:<50} {input_credits:<15.4f} {output_credits:<15.4f}")
        print("-" * 100)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    initialize_official_pricing()

