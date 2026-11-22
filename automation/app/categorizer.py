from __future__ import annotations

import re

CATEGORIES = ("Food", "Travel", "Shopping", "Bills", "Other")

# Rule-based keyword matching keeps categorization explainable and requires no
# external AI service. More specific categories are checked before "Other".
RULES: dict[str, tuple[str, ...]] = {
    "Food": (
        "restaurant",
        "cafe",
        "coffee",
        "lunch",
        "dinner",
        "breakfast",
        "pizza",
        "burger",
        "swiggy",
        "zomato",
        "doordash",
        "ubereats",
        "uber eats",
        "grocery",
        "groceries",
        "supermarket",
        "bakery",
        "food",
        "starbucks",
        "dominos",
        "kfc",
        "mcdonald",
    ),
    "Travel": (
        "uber",
        "lyft",
        "ola",
        "taxi",
        "cab",
        "train",
        "rail",
        "irctc",
        "flight",
        "airline",
        "airport",
        "hotel",
        "booking",
        "makemytrip",
        "fuel",
        "petrol",
        "diesel",
        "parking",
        "toll",
        "metro",
        "bus",
    ),
    "Shopping": (
        "amazon",
        "flipkart",
        "myntra",
        "ajio",
        "mall",
        "store",
        "shop",
        "clothing",
        "shoes",
        "electronics",
        "headphones",
        "laptop",
        "mobile",
        "furniture",
        "ikea",
        "decathlon",
    ),
    "Bills": (
        "electricity",
        "power bill",
        "water bill",
        "gas bill",
        "internet",
        "broadband",
        "wifi",
        "mobile bill",
        "phone bill",
        "recharge",
        "rent",
        "insurance",
        "subscription",
        "netflix",
        "spotify",
        "youtube premium",
        "google one",
        "icloud",
        "maintenance",
        "utility",
    ),
    "Other": (
        "pharmacy",
        "medical",
        "doctor",
        "hospital",
        "gym",
        "education",
        "course",
        "book",
        "donation",
        "bank fee",
        "atm",
        "tax",
    ),
}


def normalize_description(description: str) -> str:
    return re.sub(r"\s+", " ", str(description or "")).strip().lower()


def categorize(description: str, explicit_category: str | None = None) -> str:
    """Return a category, honouring an explicit valid category first.

    An explicit category is useful when a bank export already includes one.
    Otherwise the description is matched against ordered keyword rules.
    """

    if explicit_category:
        normalized = str(explicit_category).strip().title()
        if normalized in CATEGORIES:
            return normalized

    text = normalize_description(description)

    for category, keywords in RULES.items():
        if any(keyword in text for keyword in keywords):
            return category

    return "Other"
