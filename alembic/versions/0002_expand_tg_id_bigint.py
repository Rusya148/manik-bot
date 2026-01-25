"""expand telegram ids to bigint

Revision ID: 0002_expand_tg_id_bigint
Revises: 0001_create_public_tables
Create Date: 2026-01-26 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_expand_tg_id_bigint"
down_revision = "0001_create_public_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "tg_id", existing_type=sa.Integer(), type_=sa.BigInteger())
    op.alter_column(
        "user_access",
        "granted_by",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
    )
    op.alter_column(
        "admin_users",
        "granted_by",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column("admin_users", "granted_by", existing_type=sa.BigInteger(), type_=sa.Integer())
    op.alter_column("user_access", "granted_by", existing_type=sa.BigInteger(), type_=sa.Integer())
    op.alter_column("users", "tg_id", existing_type=sa.BigInteger(), type_=sa.Integer())
