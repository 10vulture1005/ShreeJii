"""
SKU generation utility for the Shree Ji Inventory System.
"""


def generate_sku(source_name: str, clothing_type: str, color: str) -> str:
    """
    Generate a standardized SKU key from product attributes.

    Takes the first 3 characters of each input, uppercases them,
    and joins with hyphens.

    Examples:
        ('Weaver A', 'Kanjivaram', 'Red')   -> 'WEA-KAN-RED'
        ('Supplier B', 'Cotton', 'Blue')     -> 'SUP-COT-BLU'
        ('Artisan', 'Silk', 'Maroon')        -> 'ART-SIL-MAR'
    """
    src = source_name.strip()[:3].upper()
    typ = clothing_type.strip()[:3].upper()
    col = color.strip()[:3].upper()
    return f"{src}-{typ}-{col}"
