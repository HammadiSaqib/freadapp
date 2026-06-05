-- Modify the cards.state column to allow 'USA' (3 chars)
ALTER TABLE cards
  MODIFY COLUMN state CHAR(3) NULL;