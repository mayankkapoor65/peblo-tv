import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    season_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    # content_group_id: groups episodes that are language variants of the same episode
    content_group_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # language code (e.g. 'en', 'es', 'hi', 'ja', 'fr', 'de')
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en", index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    synopsis: Mapped[str] = mapped_column(Text, nullable=False, default="")
    
    # Duration in seconds (must be > 0 to publish)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Thumbnail artwork (must be non-null to publish)
    thumbnail_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("artworks.id", ondelete="SET NULL"), nullable=True
    )
    
    stream_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        # Enforce unique (content_group_id, language)
        UniqueConstraint("content_group_id", "language", name="uq_content_group_language"),
    )

    # Relationships
    season = relationship("Season", back_populates="episodes")
    thumbnail = relationship("Artwork", foreign_keys=[thumbnail_id], back_populates="thumbnail_episodes", lazy="joined")
