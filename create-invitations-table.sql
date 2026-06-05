CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('admin', 'client', 'affiliate')),
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'accepted', 'declined', 'expired')),
  sent_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(type);