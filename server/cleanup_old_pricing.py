"""
Cleanup old tier-based pricing and keep only official models
"""
from database import SessionLocal, init_db
from models_credit import ModelPricing

def cleanup_old_pricing():
    """Deactivate models without official pricing"""
    print("🔧 Cleaning up old pricing...")
    
    init_db()
    db = SessionLocal()
    
    try:
        # Get all models
        all_models = db.query(ModelPricing).all()
        
        deactivated = []
        active_official = []
        
        for model in all_models:
            if model.tier != "official":
                # Deactivate old tier-based pricing
                model.is_active = False
                deactivated.append(model.model_name)
                print(f"  ❌ Deactivated: {model.model_name:<50} (Old tier: {model.tier})")
            else:
                active_official.append(model.model_name)
                print(f"  ✅ Active: {model.model_name:<50} (Official pricing)")
        
        db.commit()
        
        print("\n" + "=" * 100)
        print(f"✅ Cleanup completed!")
        print(f"   Active models (official pricing): {len(active_official)}")
        print(f"   Deactivated models (old tier pricing): {len(deactivated)}")
        print("=" * 100)
        
        if deactivated:
            print("\n⚠️  Deactivated models:")
            for name in deactivated:
                print(f"   - {name}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    cleanup_old_pricing()

