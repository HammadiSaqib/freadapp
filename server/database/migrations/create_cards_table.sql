-- Create cards table for card management functionality
CREATE TABLE IF NOT EXISTS cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_image VARCHAR(500),
  bank_id INT NOT NULL,
  card_name VARCHAR(255) NOT NULL,
  card_link VARCHAR(500) NOT NULL,
  card_type ENUM('business', 'personal') NOT NULL,
  funding_type VARCHAR(100) NOT NULL,
  credit_bureaus JSON NOT NULL,
  state CHAR(2) NULL,
  states JSON NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_card_per_bank (bank_id, card_name)
);

-- Add index for better query performance
CREATE INDEX idx_cards_bank_id ON cards(bank_id);
CREATE INDEX idx_cards_type ON cards(card_type);
CREATE INDEX idx_cards_active ON cards(is_active);
CREATE INDEX idx_cards_created_at ON cards(created_at);