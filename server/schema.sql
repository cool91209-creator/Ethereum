-- ============================================================
-- Ethereum Airdrop Dashboard — PostgreSQL Schema
-- ============================================================

CREATE TYPE contract_status AS ENUM (
  'running',
  'preparing',
  'ready',
  'limited',
  'stopped'
);

CREATE TABLE contracts (
  id                 SERIAL PRIMARY KEY,
  contract_number    VARCHAR(50)     NOT NULL UNIQUE,
  activation_time    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  contract_address   VARCHAR(100)    NOT NULL,
  contract_status    contract_status NOT NULL DEFAULT 'preparing',
  delivery_strategy  VARCHAR(50)     NOT NULL DEFAULT '1+2+3',
  gas_limit          NUMERIC(18, 8)  NOT NULL DEFAULT 0.03,
  airdrop_quantity   BIGINT          NOT NULL DEFAULT 0,
  token_fee          NUMERIC(18, 8)  NOT NULL DEFAULT 0,
  gas_cost           NUMERIC(18, 8)  NOT NULL DEFAULT 0,
  total_cost         NUMERIC(18, 8)  NOT NULL DEFAULT 0,
  average_cost       NUMERIC(18, 8)  NOT NULL DEFAULT 0,
  cumulative_quantity BIGINT         NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE stats (
  id                   SERIAL PRIMARY KEY,
  eth_price            NUMERIC(18, 4) NOT NULL,
  eth_price_change     NUMERIC(8, 4)  NOT NULL,
  gas_price            NUMERIC(18, 8) NOT NULL,
  total_airdrop_amount BIGINT         NOT NULL,
  recorded_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE metrics_buckets (
  id              SERIAL PRIMARY KEY,
  hour            CHAR(2)        NOT NULL,
  primary_value   NUMERIC(10,4)  NOT NULL,
  secondary_value NUMERIC(10,4)  NOT NULL,
  primary_gas     NUMERIC(10,8)  NOT NULL,
  secondary_gas   NUMERIC(10,8)  NOT NULL,
  recorded_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO contracts (
  contract_number, activation_time, contract_address, contract_status,
  delivery_strategy, gas_limit, airdrop_quantity, token_fee,
  gas_cost, total_cost, average_cost, cumulative_quantity
) VALUES
  ('Eth_002', '2024-02-27 15:31:00+00', '0E0252', 'running',   '1+2+3', 0.03, 20000, 100, 25, 125, 0.0125, 20000),
  ('Eth_003', '2024-02-27 15:31:00+00', '0E0234', 'preparing', '1+2+3', 0.03, 15000, 100, 25, 125, 0.0125, 35000),
  ('Eth_004', '2024-02-27 15:31:00+00', '353535', 'ready',     '1+2+3', 0.03, 18000, 100, 25, 125, 0.0125, 53000),
  ('Eth_005', '2024-02-27 15:31:00+00', '53536',  'ready',     '1+2+3', 0.03, 12000, 100, 25, 125, 0.0125, 65000),
  ('Eth_006', '2024-02-27 15:31:00+00', '757532', 'ready',     '1+2+3', 0.03, 22000, 100, 25, 125, 0.0125, 87000),
  ('Eth_007', '2024-02-27 15:31:00+00', '567890', 'limited',   '1+2+3', 0.03, 9000,  100, 25, 125, 0.0125, 96000),
  ('Eth_008', '2024-02-27 15:31:00+00', '134567', 'stopped',   '1+2+3', 0.03, 5000,  100, 25, 125, 0.0125, 101000);

INSERT INTO stats (eth_price, eth_price_change, gas_price, total_airdrop_amount)
VALUES (2031.11, -1.53, 0.038, 5888000);
