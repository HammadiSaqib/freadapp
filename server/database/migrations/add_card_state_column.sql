-- Add state column to cards table to track USA state
ALTER TABLE cards 
  ADD COLUMN state CHAR(2) NULL AFTER credit_bureaus;

-- Optional: index for state filtering
CREATE INDEX idx_cards_state ON cards(state);