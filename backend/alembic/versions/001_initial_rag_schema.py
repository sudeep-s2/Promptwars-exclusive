"""Initial schema for documents and document_chunks with pgvector

Revision ID: 001_initial_rag
Revises: 
Create Date: 2026-09-23 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '001_initial_rag'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False, server_default='application/pdf'),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('section_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create document_chunks table
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('document_id', sa.String(length=36), nullable=False),
        sa.Column('chunk_id', sa.String(length=64), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('section_title', sa.String(length=255), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(768), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', 'chunk_id', name='uq_document_chunk_id')
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])
    op.create_index('ix_document_chunks_chunk_id', 'document_chunks', ['chunk_id'])


def downgrade() -> None:
    op.drop_index('ix_document_chunks_chunk_id', table_name='document_chunks')
    op.drop_index('ix_document_chunks_document_id', table_name='document_chunks')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.execute("DROP EXTENSION IF EXISTS vector;")
