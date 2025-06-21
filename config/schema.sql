CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE INDEX idx_timestamp ON messages(timestamp DESC);
