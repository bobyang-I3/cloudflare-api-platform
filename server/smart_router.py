"""
Smart Router - Intelligent API Key Selection System

Selects the best API key from the resource pool based on:
1. Cost efficiency (lowest cost first)
2. Performance (success rate, latency)
3. Availability (quota remaining)
4. Load balancing (distribute load evenly)
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from dataclasses import dataclass
import random

from models_resource_pool import PoolResource, PoolResourceStatus


@dataclass
class ResourceScore:
    """Scoring result for a resource"""
    resource: PoolResource
    total_score: float
    cost_score: float
    performance_score: float
    availability_score: float
    load_score: float


class SmartRouter:
    """
    Intelligent router that selects the best API key from the pool
    
    Scoring Algorithm:
    - Cost (40%): Lower cost = higher score
    - Performance (30%): Higher success rate = higher score
    - Availability (20%): More quota remaining = higher score
    - Load Balancing (10%): Less recent usage = higher score
    """
    
    # Scoring weights
    WEIGHT_COST = 0.40
    WEIGHT_PERFORMANCE = 0.30
    WEIGHT_AVAILABILITY = 0.20
    WEIGHT_LOAD = 0.10
    
    @classmethod
    def select_best_resource(
        cls,
        db: Session,
        provider: str,
        model_family: str,
        required_quota: float = 1.0
    ) -> Optional[PoolResource]:
        """
        Select the best available resource for a request
        
        Args:
            db: Database session
            provider: Provider name (e.g., "openai", "cloudflare")
            model_family: Model family (e.g., "gpt-4", "llama-3.1")
            required_quota: Required quota amount
            
        Returns:
            Best resource or None if no suitable resource found
        """
        # Query all active resources for this provider/model
        resources = db.query(PoolResource).filter(
            and_(
                PoolResource.provider == provider,
                PoolResource.model_family == model_family,
                PoolResource.status == PoolResourceStatus.ACTIVE,
                PoolResource.current_quota >= required_quota
            )
        ).all()
        
        if not resources:
            return None
        
        # If only one resource, return it
        if len(resources) == 1:
            return resources[0]
        
        # Score all resources
        scored_resources = [cls._score_resource(r, required_quota) for r in resources]
        
        # Sort by total score (descending)
        scored_resources.sort(key=lambda x: x.total_score, reverse=True)
        
        # Add some randomness to top 3 to avoid always picking the same one
        # This helps with load balancing
        top_candidates = scored_resources[:min(3, len(scored_resources))]
        if len(top_candidates) > 1:
            # Weighted random selection from top candidates
            weights = [c.total_score for c in top_candidates]
            selected = random.choices(top_candidates, weights=weights, k=1)[0]
            return selected.resource
        
        return scored_resources[0].resource
    
    @classmethod
    def _score_resource(
        cls,
        resource: PoolResource,
        required_quota: float
    ) -> ResourceScore:
        """
        Calculate comprehensive score for a resource
        
        Returns:
            ResourceScore with individual and total scores
        """
        # Cost Score (40%)
        # Lower cost per unit = higher score
        # Normalize to 0-100 range
        # Assume cost ranges from 0 to 1000 credits
        cost_per_unit = resource.cost_per_unit if hasattr(resource, 'cost_per_unit') else 0.5
        cost_score = max(0, 100 - (cost_per_unit / 10))  # Normalized
        
        # Performance Score (30%)
        # Based on success rate (0-100%)
        success_rate = resource.success_rate or 100.0
        performance_score = success_rate
        
        # Availability Score (20%)
        # More quota remaining = higher score
        # Normalize based on original quota
        if resource.original_quota > 0:
            quota_percentage = (resource.current_quota / resource.original_quota) * 100
            availability_score = min(100, quota_percentage)
        else:
            availability_score = 50.0  # Default if original quota unknown
        
        # Load Balancing Score (10%)
        # Fewer recent requests = higher score
        # This encourages distribution of load
        total_requests = resource.total_requests or 0
        if total_requests == 0:
            load_score = 100.0  # New resource, give it priority
        else:
            # Lower request count = higher score
            # Normalize: assume max 10000 requests
            load_score = max(0, 100 - (total_requests / 100))
        
        # Calculate weighted total score
        total_score = (
            cost_score * cls.WEIGHT_COST +
            performance_score * cls.WEIGHT_PERFORMANCE +
            availability_score * cls.WEIGHT_AVAILABILITY +
            load_score * cls.WEIGHT_LOAD
        )
        
        return ResourceScore(
            resource=resource,
            total_score=total_score,
            cost_score=cost_score,
            performance_score=performance_score,
            availability_score=availability_score,
            load_score=load_score
        )
    
    @classmethod
    def get_fallback_resource(
        cls,
        db: Session,
        provider: str,
        required_quota: float = 1.0
    ) -> Optional[PoolResource]:
        """
        Get any available resource from provider (ignoring model family)
        
        Used as fallback when no exact model match is found
        """
        resources = db.query(PoolResource).filter(
            and_(
                PoolResource.provider == provider,
                PoolResource.status == PoolResourceStatus.ACTIVE,
                PoolResource.current_quota >= required_quota
            )
        ).all()
        
        if not resources:
            return None
        
        # Return highest scored resource
        scored = [cls._score_resource(r, required_quota) for r in resources]
        scored.sort(key=lambda x: x.total_score, reverse=True)
        return scored[0].resource
    
    @classmethod
    def record_usage(
        cls,
        db: Session,
        resource: PoolResource,
        quota_used: float,
        success: bool
    ):
        """
        Record usage and update resource statistics
        
        Args:
            db: Database session
            resource: The resource that was used
            quota_used: Amount of quota consumed
            success: Whether the request was successful
        """
        # Update quota
        resource.current_quota = max(0, resource.current_quota - quota_used)
        
        # Update request counters
        resource.total_requests = (resource.total_requests or 0) + 1
        if success:
            resource.successful_requests = (resource.successful_requests or 0) + 1
        
        # Recalculate success rate
        if resource.total_requests > 0:
            resource.success_rate = (resource.successful_requests / resource.total_requests) * 100
        
        # Check if depleted
        if resource.current_quota <= 0:
            resource.status = PoolResourceStatus.DEPLETED
        
        db.commit()
    
    @classmethod
    def get_routing_stats(cls, db: Session) -> Dict[str, Any]:
        """
        Get routing system statistics
        
        Returns:
            Dictionary with routing metrics
        """
        all_resources = db.query(PoolResource).all()
        active_resources = [r for r in all_resources if r.status == PoolResourceStatus.ACTIVE]
        
        total_requests = sum(r.total_requests or 0 for r in all_resources)
        total_successful = sum(r.successful_requests or 0 for r in all_resources)
        
        return {
            "total_resources": len(all_resources),
            "active_resources": len(active_resources),
            "total_requests_routed": total_requests,
            "successful_requests": total_successful,
            "overall_success_rate": (total_successful / total_requests * 100) if total_requests > 0 else 0,
            "providers": len(set(r.provider for r in all_resources)),
            "model_families": len(set(r.model_family for r in all_resources))
        }


# Example usage
if __name__ == "__main__":
    # This would typically be called from the API router
    # when a user makes a request
    
    print("Smart Router - Example Usage")
    print("=" * 60)
    print("\nRouting Algorithm:")
    print("1. Find all active resources matching provider + model")
    print("2. Score each resource based on:")
    print(f"   - Cost (40%): Lower cost = higher score")
    print(f"   - Performance (30%): Higher success rate = higher score")
    print(f"   - Availability (20%): More quota = higher score")
    print(f"   - Load Balancing (10%): Less usage = higher score")
    print("3. Select highest scoring resource (with randomness in top 3)")
    print("4. Record usage and update statistics")
    print("\nBenefits:")
    print("- Automatic cost optimization")
    print("- Performance-based selection")
    print("- Even load distribution")
    print("- Automatic failover to alternatives")

