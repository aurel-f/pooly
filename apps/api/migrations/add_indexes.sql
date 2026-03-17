-- Migration manuelle — à exécuter une seule fois en prod si create_all ne crée pas les index
-- (SQLModel crée les index via create_all au démarrage — ce fichier est un filet de sécurité)
CREATE INDEX IF NOT EXISTS ix_action_user_id ON action(user_id);
CREATE INDEX IF NOT EXISTS ix_action_product_id ON action(product_id);
