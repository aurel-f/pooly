from sqlmodel import Session, select

from models import Product

SEED_PRODUCTS = [
    {"name": "Chlore", "unit_default": "g"},
    {"name": "Brome", "unit_default": "g"},
    {"name": "Sel", "unit_default": "kg"},
    {"name": "pH+", "unit_default": "g"},
    {"name": "pH-", "unit_default": "ml"},
    {"name": "Anti-algue", "unit_default": "ml"},
    {"name": "Floculant", "unit_default": "ml"},
    {"name": "Nettoyage filtre", "unit_default": ""},
    {"name": "Contre-lavage", "unit_default": ""},
    {"name": "Nettoyage cartouche", "unit_default": ""},
]


def insert_seeds(session: Session) -> None:
    existing = session.exec(select(Product)).all()
    existing_names = {p.name for p in existing}
    for data in SEED_PRODUCTS:
        if data["name"] not in existing_names:
            session.add(Product(type="seed", **data))
    session.commit()
