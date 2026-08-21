import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

products = [
    {
        "name": "Bamboo Toothbrush",
        "description": "Biodegradable bamboo handle with BPA-free bristles. Compostable packaging.",
        "category": "personal-care",
        "price": 4.99,
        "images": ["https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400"],
        "metadata": {
            "materials": "bamboo, nylon bristles",
            "origin_country": "China",
            "packaging_type": "recycled cardboard",
            "certifications": ["FSC"],
            "lifespan_years": 0.25,
            "weight_kg": 0.02
        }
    },
    {
        "name": "Organic Cotton Tote Bag",
        "description": "GOTS certified organic cotton. Replaces 500+ plastic bags over its lifetime.",
        "category": "accessories",
        "price": 12.99,
        "images": ["https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=400"],
        "metadata": {
            "materials": "100% organic cotton",
            "origin_country": "India",
            "packaging_type": "minimal paper",
            "certifications": ["GOTS", "Fair Trade"],
            "lifespan_years": 5,
            "weight_kg": 0.15
        }
    },
    {
        "name": "Reusable Beeswax Wraps",
        "description": "Natural alternative to plastic wrap. Made from organic cotton and beeswax.",
        "category": "kitchen",
        "price": 18.99,
        "images": ["https://images.unsplash.com/photo-1584208124888-6a78e8bcffd6?w=400"],
        "metadata": {
            "materials": "organic cotton, beeswax, tree resin",
            "origin_country": "USA",
            "packaging_type": "recycled paper",
            "certifications": ["USDA Organic"],
            "lifespan_years": 1,
            "weight_kg": 0.1
        }
    },
    {
        "name": "Stainless Steel Water Bottle",
        "description": "Double-walled insulated bottle. Replaces 167 plastic bottles per year.",
        "category": "kitchen",
        "price": 29.99,
        "images": ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400"],
        "metadata": {
            "materials": "18/8 stainless steel",
            "origin_country": "Germany",
            "packaging_type": "recycled cardboard",
            "certifications": ["BPA-free"],
            "lifespan_years": 10,
            "weight_kg": 0.35
        }
    },
    {
        "name": "Organic Cotton T-Shirt",
        "description": "GOTS certified organic cotton. Fair Trade certified factory in Portugal.",
        "category": "clothing",
        "price": 34.99,
        "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"],
        "metadata": {
            "materials": "100% GOTS organic cotton",
            "origin_country": "Portugal",
            "packaging_type": "recycled poly bag",
            "certifications": ["GOTS", "Fair Trade"],
            "lifespan_years": 3,
            "weight_kg": 0.2
        }
    },
    {
        "name": "Bamboo Cutting Board",
        "description": "Sustainably harvested bamboo. Naturally antimicrobial, no chemicals.",
        "category": "kitchen",
        "price": 24.99,
        "images": ["https://images.unsplash.com/photo-1591083476076-e3c5b7299f51?w=400"],
        "metadata": {
            "materials": "moso bamboo",
            "origin_country": "China",
            "packaging_type": "recycled cardboard",
            "certifications": ["FSC"],
            "lifespan_years": 5,
            "weight_kg": 0.8
        }
    },
    {
        "name": "Natural Loofah Sponge",
        "description": "100% natural plant-based loofah. Fully compostable at end of life.",
        "category": "personal-care",
        "price": 6.99,
        "images": ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400"],
        "metadata": {
            "materials": "natural loofah plant",
            "origin_country": "Egypt",
            "packaging_type": "none",
            "certifications": [],
            "lifespan_years": 0.5,
            "weight_kg": 0.05
        }
    },
    {
        "name": "Solar Phone Charger",
        "description": "Portable solar panel charger. Charges two devices simultaneously.",
        "category": "electronics",
        "price": 49.99,
        "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"],
        "metadata": {
            "materials": "monocrystalline silicon, recycled plastic",
            "origin_country": "China",
            "packaging_type": "recycled cardboard",
            "certifications": ["CE", "RoHS"],
            "lifespan_years": 5,
            "weight_kg": 0.4
        }
    },
    {
        "name": "Hemp Seed Oil Moisturiser",
        "description": "Cold-pressed hemp seed oil. Vegan, cruelty-free, glass bottle.",
        "category": "personal-care",
        "price": 22.99,
        "images": ["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400"],
        "metadata": {
            "materials": "hemp seed oil, aloe vera, vitamin E",
            "origin_country": "UK",
            "packaging_type": "glass bottle",
            "certifications": ["Vegan", "Cruelty-free"],
            "lifespan_years": 0.5,
            "weight_kg": 0.15
        }
    },
    {
        "name": "Recycled Plastic Backpack",
        "description": "Made from 30 recycled plastic bottles. Waterproof and durable.",
        "category": "accessories",
        "price": 79.99,
        "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"],
        "metadata": {
            "materials": "recycled PET plastic",
            "origin_country": "Vietnam",
            "packaging_type": "minimal recycled bag",
            "certifications": ["GRS"],
            "lifespan_years": 7,
            "weight_kg": 0.6
        }
    }
]

def seed():
    print("Seeding products...")
    result = supabase.table("products").insert(products).execute()
    print(f"Inserted {len(result.data)} products successfully!")

if __name__ == "__main__":
    seed()