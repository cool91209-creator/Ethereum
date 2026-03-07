-- ============================================================
-- Ethereum Airdrop Dashboard — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS ethereum_airdrop;
USE ethereum_airdrop;

CREATE TABLE IF NOT EXISTS contracts (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  contract_number     VARCHAR(50)     NOT NULL UNIQUE,
  activation_time     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contract_address    VARCHAR(100)    NOT NULL,
  contract_status     ENUM('running', 'preparing', 'ready', 'limited', 'stopped') NOT NULL DEFAULT 'preparing',
  delivery_strategy   VARCHAR(50)     NOT NULL DEFAULT '1+2+3',
  gas_limit           DECIMAL(18, 8)  NOT NULL DEFAULT 0.03,
  airdrop_quantity    BIGINT          NOT NULL DEFAULT 0,
  token_fee           DECIMAL(18, 8)  NOT NULL DEFAULT 0,
  gas_cost            DECIMAL(18, 8)  NOT NULL DEFAULT 0,
  total_cost          DECIMAL(18, 8)  NOT NULL DEFAULT 0,
  average_cost        DECIMAL(18, 8)  NOT NULL DEFAULT 0,
  cumulative_quantity BIGINT          NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  eth_price            DECIMAL(18, 4) NOT NULL,
  eth_price_change     DECIMAL(8, 4)  NOT NULL,
  gas_price            DECIMAL(18, 8) NOT NULL,
  total_airdrop_amount BIGINT         NOT NULL,
  recorded_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics_buckets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hour            CHAR(2)        NOT NULL,
  primary_value   DECIMAL(10,4)  NOT NULL,
  secondary_value DECIMAL(10,4)  NOT NULL,
  primary_gas     DECIMAL(10,8)  NOT NULL,
  secondary_gas   DECIMAL(10,8)  NOT NULL,
  recorded_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO contracts (
  contract_number, activation_time, contract_address, contract_status,
  delivery_strategy, gas_limit, airdrop_quantity, token_fee,
  gas_cost, total_cost, average_cost, cumulative_quantity
) VALUES
  ('Eth_002', '2024-02-27 15:31:00', '0E0252', 'running',   '1+2+3', 0.03, 20000, 100, 25, 125, 0.0125, 20000),
  ('Eth_003', '2024-02-27 15:31:00', '0E0234', 'preparing', '1+2+3', 0.03, 15000, 100, 25, 125, 0.0125, 35000),
  ('Eth_004', '2024-02-27 15:31:00', '353535', 'ready',     '1+2+3', 0.03, 18000, 100, 25, 125, 0.0125, 53000),
  ('Eth_005', '2024-02-27 15:31:00', '53536',  'ready',     '1+2+3', 0.03, 12000, 100, 25, 125, 0.0125, 65000),
  ('Eth_006', '2024-02-27 15:31:00', '757532', 'ready',     '1+2+3', 0.03, 22000, 100, 25, 125, 0.0125, 87000),
  ('Eth_007', '2024-02-27 15:31:00', '567890', 'limited',   '1+2+3', 0.03, 9000,  100, 25, 125, 0.0125, 96000),
  ('Eth_008', '2024-02-27 15:31:00', '134567', 'stopped',   '1+2+3', 0.03, 5000,  100, 25, 125, 0.0125, 101000);

INSERT INTO stats (eth_price, eth_price_change, gas_price, total_airdrop_amount)
VALUES (2031.11, -1.53, 0.038, 5888000);
