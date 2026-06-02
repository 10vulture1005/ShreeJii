"""
SQLAlchemy ORM models for the Shree Ji Inventory System.
"""

from sqlalchemy import (
    Column, String, Integer, Numeric, Text, DateTime, ForeignKey,
    Index, CheckConstraint, func
)
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    """Product Master — defines core product attributes."""

    __tablename__ = "products"

    sku_id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    source_name = Column(String(100), nullable=False)
    clothing_type = Column(String(100), nullable=False)
    color = Column(String(50), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship to inventory (one-to-one)
    inventory = relationship("Inventory", back_populates="product", uselist=False)

    # Composite index for fast duplicate-check on incoming shipments
    __table_args__ = (
        Index("idx_products_source_type_color", "source_name", "clothing_type", "color"),
    )


class Inventory(Base):
    """Inventory Ledger — tracks live stock counts."""

    __tablename__ = "inventory"

    sku_id = Column(
        String(50),
        ForeignKey("products.sku_id", ondelete="CASCADE"),
        primary_key=True
    )
    stock_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship back to product
    product = relationship("Product", back_populates="inventory")

    __table_args__ = (
        CheckConstraint("stock_count >= 0", name="ck_inventory_stock_non_negative"),
    )
