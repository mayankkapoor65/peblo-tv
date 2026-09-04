import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Show(Base):
    __tablename__ = "shows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    synopsis: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="General", index=True)
    
    # Section: e.g., "Trending Now", "Critically Acclaimed", "New Releases"
    # Nullable in draft, but enforced before publishing
    section: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    
    # Status: 'draft' | 'published' | 'archived'
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft", index=True)
    
    poster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("artworks.id", ondelete="SET NULL"), nullable=True
    )
    banner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("artworks.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    poster = relationship("Artwork", foreign_keys=[poster_id], back_populates="poster_shows", lazy="joined")
    banner = relationship("Artwork", foreign_keys=[banner_id], back_populates="banner_shows", lazy="joined")
    seasons = relationship("Season", back_populates="show", cascade="all, delete-orphan", order_by="Season.season_number")
