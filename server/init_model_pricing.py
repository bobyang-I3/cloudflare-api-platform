"""
Initialize model pricing in database
Run this script to populate the model_pricing table with default pricing
"""
from database import SessionLocal, init_db
from models_credit import ModelPricing, ModelTier


# Pricing tiers (credits per 1000 tokens)
PRICING_TIERS = {
    ModelTier.TINY: {
        "input": 0.01,  # 0.01 credits / 1K input tokens
        "output": 0.02,
    },
    ModelTier.SMALL: {
        "input": 0.05,  # 0.05 credits / 1K input tokens
        "output": 0.10,
    },
    ModelTier.MEDIUM: {
        "input": 0.15,  # 0.15 credits / 1K input tokens
        "output": 0.30,
    },
    ModelTier.LARGE: {
        "input": 0.50,  # 0.50 credits / 1K input tokens
        "output": 1.00,
    },
}

# Model classifications by parameter count and capabilities
MODEL_CONFIGS = [
    # ========== LARGE MODELS (70B+) ==========
    {"id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "name": "Llama 3.3 70B Instruct FP8", "provider": "Meta", "tier": ModelTier.LARGE},
    {"id": "@cf/meta/llama-3.1-70b-instruct", "name": "Llama 3.1 70B Instruct", "provider": "Meta", "tier": ModelTier.LARGE},
    {"id": "@cf/openai/gpt-oss-120b", "name": "GPT OSS 120B", "provider": "OpenAI", "tier": ModelTier.LARGE},
    {"id": "@cf/qwen/qwen2.5-72b-instruct-awq", "name": "Qwen 2.5 72B Instruct", "provider": "Alibaba", "tier": ModelTier.LARGE},
    {"id": "@cf/deepseek-ai/deepseek-v3", "name": "DeepSeek V3 685B", "provider": "DeepSeek", "tier": ModelTier.LARGE},
    
    # ========== MEDIUM MODELS (13B-30B) ==========
    {"id": "@cf/meta/llama-4-scout-17b-16e-instruct", "name": "Llama 4 Scout 17B", "provider": "Meta", "tier": ModelTier.MEDIUM, "vision": 0.10},
    {"id": "@cf/openai/gpt-oss-20b", "name": "GPT OSS 20B", "provider": "OpenAI", "tier": ModelTier.MEDIUM},
    {"id": "@cf/qwen/qwen2.5-14b-instruct-awq", "name": "Qwen 2.5 14B Instruct", "provider": "Alibaba", "tier": ModelTier.MEDIUM},
    {"id": "@cf/google/gemma-2-27b-it", "name": "Gemma 2 27B IT", "provider": "Google", "tier": ModelTier.MEDIUM},
    
    # ========== SMALL MODELS (7B-8B) ==========
    {"id": "@cf/meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B Instruct", "provider": "Meta", "tier": ModelTier.SMALL},
    {"id": "@cf/meta/llama-3.1-8b-instruct-fast", "name": "Llama 3.1 8B Instruct (Fast)", "provider": "Meta", "tier": ModelTier.SMALL},
    {"id": "@cf/meta/llama-3-8b-instruct", "name": "Llama 3 8B Instruct", "provider": "Meta", "tier": ModelTier.SMALL},
    {"id": "@cf/meta/llama-3.2-11b-vision-instruct", "name": "Llama 3.2 11B Vision", "provider": "Meta", "tier": ModelTier.SMALL, "vision": 0.08},
    {"id": "@cf/qwen/qwen2.5-7b-instruct-awq", "name": "Qwen 2.5 7B Instruct", "provider": "Alibaba", "tier": ModelTier.SMALL},
    {"id": "@cf/google/gemma-2-9b-it", "name": "Gemma 2 9B IT", "provider": "Google", "tier": ModelTier.SMALL},
    {"id": "@cf/mistral/mistral-7b-instruct-v0.2-lora", "name": "Mistral 7B Instruct v0.2", "provider": "Mistral", "tier": ModelTier.SMALL},
    
    # ========== TINY MODELS (1B-3B) ==========
    {"id": "@cf/meta/llama-3.2-1b-instruct", "name": "Llama 3.2 1B Instruct", "provider": "Meta", "tier": ModelTier.TINY},
    {"id": "@cf/meta/llama-3.2-3b-instruct", "name": "Llama 3.2 3B Instruct", "provider": "Meta", "tier": ModelTier.TINY},
    {"id": "@cf/qwen/qwen2.5-1.5b-instruct", "name": "Qwen 2.5 1.5B Instruct", "provider": "Alibaba", "tier": ModelTier.TINY},
    {"id": "@cf/qwen/qwen2.5-3b-instruct", "name": "Qwen 2.5 3B Instruct", "provider": "Alibaba", "tier": ModelTier.TINY},
    {"id": "@cf/google/gemma-2-2b-it", "name": "Gemma 2 2B IT", "provider": "Google", "tier": ModelTier.TINY},
    {"id": "@cf/tinyllama/tinyllama-1.1b-chat-v1.0", "name": "TinyLlama 1.1B Chat", "provider": "TinyLlama", "tier": ModelTier.TINY},
    
    # ========== TEXT-TO-IMAGE MODELS ==========
    # Text-to-image models charged per image generation (flat rate)
    {"id": "@cf/black-forest-labs/flux-1-schnell", "name": "FLUX.1 Schnell", "provider": "Black Forest Labs", "tier": ModelTier.MEDIUM},
    {"id": "@cf/stabilityai/stable-diffusion-xl-base-1.0", "name": "Stable Diffusion XL", "provider": "Stability AI", "tier": ModelTier.MEDIUM},
    {"id": "@cf/bytedance/stable-diffusion-xl-lightning", "name": "SDXL Lightning", "provider": "ByteDance", "tier": ModelTier.SMALL},
    
    # ========== IMAGE-TO-TEXT / VISION MODELS ==========
    {"id": "@cf/unum/uform-gen2-qwen-500m", "name": "UForm-Gen2 Qwen 500M", "provider": "Unum", "tier": ModelTier.TINY, "vision": 0.05},
    
    # ========== OTHER TEXT GENERATION MODELS ==========
    {"id": "@cf/meta/llama-2-7b-chat-fp16", "name": "Llama 2 7B Chat FP16", "provider": "Meta", "tier": ModelTier.SMALL},
    {"id": "@cf/meta/llama-2-7b-chat-int8", "name": "Llama 2 7B Chat Int8", "provider": "Meta", "tier": ModelTier.SMALL},
    {"id": "@cf/mistral/mistral-7b-instruct-v0.1", "name": "Mistral 7B Instruct v0.1", "provider": "Mistral", "tier": ModelTier.SMALL},
]


def initialize_pricing():
    """Initialize model pricing in database"""
    print("🔧 Initializing model pricing...")
    
    # Initialize database
    init_db()
    
    db = SessionLocal()
    try:
        created_count = 0
        updated_count = 0
        
        for config in MODEL_CONFIGS:
            model_id = config["id"]
            tier = config["tier"]
            vision_surcharge = config.get("vision", 0.0)
            
            # Get pricing for this tier
            tier_pricing = PRICING_TIERS[tier]
            
            # Check if pricing already exists
            existing = db.query(ModelPricing).filter(ModelPricing.model_id == model_id).first()
            
            if existing:
                # Update existing pricing
                existing.model_name = config["name"]
                existing.provider = config["provider"]
                existing.tier = tier.value
                existing.credits_per_1k_input = tier_pricing["input"]
                existing.credits_per_1k_output = tier_pricing["output"]
                existing.vision_surcharge = vision_surcharge
                existing.is_active = True
                updated_count += 1
                print(f"  ✏️  Updated: {config['name']} ({tier.value})")
            else:
                # Create new pricing
                pricing = ModelPricing(
                    model_id=model_id,
                    model_name=config["name"],
                    provider=config["provider"],
                    tier=tier.value,
                    credits_per_1k_input=tier_pricing["input"],
                    credits_per_1k_output=tier_pricing["output"],
                    vision_surcharge=vision_surcharge,
                    is_active=True
                )
                db.add(pricing)
                created_count += 1
                print(f"  ✅ Created: {config['name']} ({tier.value})")
        
        db.commit()
        
        print("\n" + "=" * 60)
        print(f"✅ Model pricing initialized successfully!")
        print(f"   Created: {created_count} models")
        print(f"   Updated: {updated_count} models")
        print(f"   Total: {created_count + updated_count} models")
        print("=" * 60)
        
        # Print pricing summary
        print("\n📊 Pricing Summary:")
        print("-" * 60)
        print(f"{'Tier':<10} {'Input (per 1K)':<20} {'Output (per 1K)'}")
        print("-" * 60)
        for tier, pricing in PRICING_TIERS.items():
            print(f"{tier.value:<10} {pricing['input']:<20.4f} {pricing['output']:.4f} credits")
        print("-" * 60)
        print("Vision Surcharge: 0.08-0.10 credits per image")
        print("\n💰 Credit Value: 1 Credit = $0.01 USD")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    initialize_pricing()

