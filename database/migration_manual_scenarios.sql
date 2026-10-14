-- ============================================================
-- MIGRATION: Manual Disaster Scenario integration
-- ------------------------------------------------------------
-- Use this file when you ALREADY have a populated `flood_prediction`
-- database and do not want to re-run schema.sql (which starts with
-- DROP DATABASE and would destroy your existing data).
--
-- This migration is purely additive — it creates two new tables and
-- touches nothing that already exists. It is safe to run more than
-- once (CREATE TABLE IF NOT EXISTS).
--
-- Run with:
--   mysql -u root -p flood_prediction < database/migration_manual_scenarios.sql
-- ============================================================

USE flood_prediction;

CREATE TABLE IF NOT EXISTS manual_disaster_scenarios (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_uid    CHAR(36) NOT NULL COMMENT 'UUID — stable id used to de-duplicate alerts',

    location_name   VARCHAR(191) NOT NULL,
    district        VARCHAR(150) DEFAULT NULL,
    state           VARCHAR(100) DEFAULT NULL,
    country         VARCHAR(100) DEFAULT NULL,
    address         VARCHAR(512) DEFAULT NULL COMMENT 'full display name returned by the geocoder',
    latitude        DECIMAL(10, 6) NOT NULL,
    longitude       DECIMAL(10, 6) NOT NULL,

    rainfall        DECIMAL(7, 2) NOT NULL COMMENT 'mm, 0-1000, manually entered',
    temperature     DECIMAL(5, 2) NOT NULL COMMENT 'celsius, -50 to 60, manually entered',
    humidity        DECIMAL(5, 2) NOT NULL COMMENT 'percent 0-100, manually entered',
    soil_moisture   DECIMAL(5, 2) NOT NULL COMMENT 'percent 0-100, manually entered',

    disaster        BOOLEAN NOT NULL DEFAULT FALSE,
    prediction      VARCHAR(64) NOT NULL COMMENT 'DISASTER LIKELY | NO DISASTER',
    probability     DECIMAL(5, 2) NOT NULL COMMENT '0-100, prototype model confidence — NOT a validated flood probability',
    risk_level      ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL,
    message         TEXT,
    model_source    VARCHAR(120) DEFAULT 'Prototype Random Forest classifier',

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_manual_scenario_uid (scenario_uid),
    INDEX idx_manual_scenario_created (created_at),
    INDEX idx_manual_scenario_risk (risk_level),
    INDEX idx_manual_scenario_location (location_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS manual_scenario_alerts (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_id         BIGINT NOT NULL,
    scenario_uid        CHAR(36) NOT NULL,

    location_name       VARCHAR(191) NOT NULL,
    latitude            DECIMAL(10, 6) NOT NULL,
    longitude           DECIMAL(10, 6) NOT NULL,

    severity            ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL,
    title               VARCHAR(191) NOT NULL COMMENT 'e.g. HIGH RISK FLOOD ALERT',
    message             TEXT NOT NULL,
    recommended_action  TEXT NOT NULL,
    probability         DECIMAL(5, 2) NOT NULL,
    status              ENUM('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_manual_alert_scenario (scenario_id),
    FOREIGN KEY (scenario_id) REFERENCES manual_disaster_scenarios(id) ON DELETE CASCADE,
    INDEX idx_manual_alert_status (status),
    INDEX idx_manual_alert_created (created_at)
) ENGINE=InnoDB;
