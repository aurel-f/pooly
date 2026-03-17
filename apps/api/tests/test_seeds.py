from sqlmodel import SQLModel, Session, create_engine, select
from sqlmodel.pool import StaticPool

from models import Product
from seeds import SEED_PRODUCTS, insert_seeds


def make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_insert_seeds_creates_10_products():
    session = make_session()
    insert_seeds(session)
    products = session.exec(select(Product)).all()
    session.close()
    assert len(products) == len(SEED_PRODUCTS)


def test_insert_seeds_is_idempotent():
    session = make_session()
    insert_seeds(session)
    insert_seeds(session)
    products = session.exec(select(Product)).all()
    session.close()
    assert len(products) == len(SEED_PRODUCTS)


def test_all_seeds_have_type_seed():
    session = make_session()
    insert_seeds(session)
    products = session.exec(select(Product)).all()
    session.close()
    assert all(p.type == "seed" for p in products)
