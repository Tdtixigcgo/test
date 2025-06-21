const DB_CONFIG = {
  host: 'dpg-d1aic4qdbo4c73ch78h0-a.singapore-postgres.render.com',
  port: 5432,
  database: 'benyeuem',
  user: 'benyeuem_user',
  password: 'H8UXzGS7F4iSk15Gs3fqltCAzBgNqFOu',
  ssl: {
    rejectUnauthorized: false
  }
};

const POSTGRES_URL = "postgresql://benyeuem_user:H8UXzGS7F4iSk15Gs3fqltCAzBgNqFOu@dpg-d1aic4qdbo4c73ch78h0-a.singapore-postgres.render.com/benyeuem";

module.exports = {
  config: DB_CONFIG,
  url: POSTGRES_URL,
  options: {
    ssl: true
  }
};
