"""Initial schema with Shows, Seasons, Episodes, Artworks, PublishRuns, and Users

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-02 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='editor'),
        sa.Column('hashed_password', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Artworks table
    op.create_table(
        'artworks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('artwork_type', sa.String(length=30), nullable=False),
        sa.Column('storage_path', sa.String(length=500), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('aspect_ratio', sa.Float(), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_artworks_artwork_type'), 'artworks', ['artwork_type'], unique=False)

    # Shows table
    op.create_table(
        'shows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('synopsis', sa.Text(), nullable=False, server_default=''),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='General'),
        sa.Column('section', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='draft'),
        sa.Column('poster_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('artworks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('banner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('artworks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_shows_title'), 'shows', ['title'], unique=False)
    op.create_index(op.f('ix_shows_slug'), 'shows', ['slug'], unique=True)
    op.create_index(op.f('ix_shows_category'), 'shows', ['category'], unique=False)
    op.create_index(op.f('ix_shows_section'), 'shows', ['section'], unique=False)
    op.create_index(op.f('ix_shows_status'), 'shows', ['status'], unique=False)

    # Seasons table
    op.create_table(
        'seasons',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('show_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('shows.id', ondelete='CASCADE'), nullable=False),
        sa.Column('season_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('title', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('synopsis', sa.Text(), nullable=False, server_default=''),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('show_id', 'season_number', name='uq_show_season_number'),
    )
    op.create_index(op.f('ix_seasons_show_id'), 'seasons', ['show_id'], unique=False)

    # Episodes table
    op.create_table(
        'episodes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('season_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('seasons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('episode_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('content_group_id', sa.String(length=100), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('synopsis', sa.Text(), nullable=False, server_default=''),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('thumbnail_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('artworks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('stream_url', sa.String(length=500), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('content_group_id', 'language', name='uq_content_group_language'),
    )
    op.create_index(op.f('ix_episodes_season_id'), 'episodes', ['season_id'], unique=False)
    op.create_index(op.f('ix_episodes_content_group_id'), 'episodes', ['content_group_id'], unique=False)
    op.create_index(op.f('ix_episodes_language'), 'episodes', ['language'], unique=False)

    # Publish Runs table
    op.create_table(
        'publish_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('published_by', sa.String(length=255), nullable=False, server_default='admin'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('show_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('episode_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('file_hash', sa.String(length=128), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('target_path', sa.String(length=255), nullable=True),
    )

def downgrade() -> None:
    op.drop_table('publish_runs')
    op.drop_table('episodes')
    op.drop_table('seasons')
    op.drop_table('shows')
    op.drop_table('artworks')
    op.drop_table('users')
