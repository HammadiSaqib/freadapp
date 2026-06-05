-- Add new columns to cards table for tracking metrics
ALTER TABLE cards 
ADD COLUMN amount_approved DECIMAL(15,2) DEFAULT NULL COMMENT 'Amount approved for this card',
ADD COLUMN no_of_usage INT DEFAULT 0 COMMENT 'Number of times this card has been used',
ADD COLUMN average_amount DECIMAL(15,2) DEFAULT NULL COMMENT 'Average amount per usage';

-- Add indexes for the new columns for better query performance
CREATE INDEX idx_cards_amount_approved ON cards(amount_approved);
CREATE INDEX idx_cards_no_of_usage ON cards(no_of_usage);
CREATE INDEX idx_cards_average_amount ON cards(average_amount);