-- Create banks table for bank management functionality
CREATE TABLE IF NOT EXISTS banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  funding_manager_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  credit_bureaus JSON NULL,
  primary_bureau ENUM('Experian','Equifax','TransUnion') NULL,
  zip_code VARCHAR(10),
  routing_number VARCHAR(9),
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  notes TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (funding_manager_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bank_name (name)
);

-- Add index for better query performance
CREATE INDEX idx_banks_funding_manager_id ON banks(funding_manager_id);
CREATE INDEX idx_banks_status ON banks(status);
CREATE INDEX idx_banks_active ON banks(is_active);
CREATE INDEX idx_banks_created_at ON banks(created_at);
