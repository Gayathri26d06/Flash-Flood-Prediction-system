

DROP DATABASE IF EXISTS flood_prediction;
CREATE DATABASE flood_prediction CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flood_prediction;

-- ------------------------------------------------------------
-- locations : villages / wards being monitored
-- ------------------------------------------------------------
CREATE TABLE locations (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(150) NOT NULL,
    district          VARCHAR(150) NOT NULL,
    state             VARCHAR(100) NOT NULL,
    latitude          DECIMAL(10, 6) NOT NULL,
    longitude         DECIMAL(10, 6) NOT NULL,
    elevation         DECIMAL(8, 2) NOT NULL COMMENT 'meters above sea level',
    slope             DECIMAL(5, 2) NOT NULL COMMENT 'degrees',
    population        INT NOT NULL DEFAULT 0,
    historical_risk   DECIMAL(4, 3) NOT NULL DEFAULT 0.0 COMMENT '0.0 - 1.0 synthetic historical risk index',
    is_demo_data      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_locations_state (state),
    INDEX idx_locations_district (district)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- sensor_data : latest / historical IoT sensor readings
-- ------------------------------------------------------------
CREATE TABLE sensor_data (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    location_id      INT NOT NULL,
    rainfall         DECIMAL(6, 2) NOT NULL COMMENT 'mm, current interval reading',
    soil_moisture    DECIMAL(5, 2) NOT NULL COMMENT 'percent 0-100',
    river_level      DECIMAL(6, 2) NOT NULL COMMENT 'percent of danger level 0-100',
    humidity         DECIMAL(5, 2) NOT NULL COMMENT 'percent 0-100',
    temperature      DECIMAL(5, 2) NOT NULL COMMENT 'celsius',
    is_synthetic     BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_sensor_location (location_id),
    INDEX idx_sensor_timestamp (timestamp),
    INDEX idx_sensor_location_time (location_id, timestamp)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- historical_events : past disaster records (synthetic/demo)
-- ------------------------------------------------------------
CREATE TABLE historical_events (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    location_id    INT NOT NULL,
    event_type     ENUM('FLASH_FLOOD', 'LANDSLIDE', 'RIVER_FLOOD', 'DEBRIS_FLOW') NOT NULL,
    severity       ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL,
    rainfall       DECIMAL(6, 2) COMMENT 'mm recorded around event, synthetic',
    date           DATE NOT NULL,
    damage_level   ENUM('NONE', 'MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC') NOT NULL DEFAULT 'MINOR',
    is_synthetic   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_hist_location (location_id),
    INDEX idx_hist_date (date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- predictions : ML + risk-engine output history
-- ------------------------------------------------------------
CREATE TABLE predictions (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    location_id      INT NOT NULL,
    risk_score       DECIMAL(5, 2) NOT NULL COMMENT '0-100',
    risk_level       ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL,
    lead_time        INT NOT NULL DEFAULT 0 COMMENT 'minutes, prototype estimate only',
    confidence       DECIMAL(4, 3) NOT NULL DEFAULT 0.0 COMMENT '0-1',
    ml_risk_score    DECIMAL(5, 2) COMMENT 'raw ML model output before rule adjustments',
    rule_adjustment  DECIMAL(5, 2) DEFAULT 0.0 COMMENT 'points added/subtracted by rule engine',
    prediction_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_pred_location (location_id),
    INDEX idx_pred_time (prediction_time),
    INDEX idx_pred_location_time (location_id, prediction_time)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- alerts : generated warnings
-- ------------------------------------------------------------
CREATE TABLE alerts (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    location_id   INT NOT NULL,
    severity      ENUM('LOW', 'MODERATE', 'HIGH', 'CRITICAL') NOT NULL,
    message       TEXT NOT NULL,
    risk_score    DECIMAL(5, 2) NOT NULL,
    status        ENUM('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_alerts_location (location_id),
    INDEX idx_alerts_status (status),
    INDEX idx_alerts_created (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- safe_zones : evacuation shelters
-- ------------------------------------------------------------
CREATE TABLE safe_zones (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    latitude      DECIMAL(10, 6) NOT NULL,
    longitude     DECIMAL(10, 6) NOT NULL,
    capacity      INT NOT NULL DEFAULT 0,
    location_id   INT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_safezone_location (location_id)
) ENGINE=InnoDB;

-- ============================================================
-- MANUAL DISASTER SCENARIO INTEGRATION
-- ------------------------------------------------------------
-- Added for the "AI Disaster Check as central scenario source"
-- feature. These tables are additive: none of the tables above
-- are modified, so all existing functionality is preserved.
--
-- If you already have a populated `flood_prediction` database and
-- do NOT want to drop it, run database/migration_manual_scenarios.sql
-- instead of this whole file.
-- ============================================================

-- ------------------------------------------------------------
-- manual_disaster_scenarios : every manual AI Disaster Check run.
--
-- The most recent row (highest created_at / id) is the ACTIVE
-- SCENARIO consumed by the Risk Map, AI Predictions, Alerts,
-- Simulation and Evacuation modules. Older rows are retained as
-- scenario history and are never deleted by the application.
--
-- Locations here come from the global Nominatim search and are NOT
-- constrained to the seeded `locations` table, so there is no FK to
-- `locations` — an arbitrary searched place must be storable.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- manual_scenario_alerts : alerts auto-generated from a manual
-- scenario. Kept separate from `alerts` because `alerts.location_id`
-- is a FK into the seeded `locations` table, which cannot represent an
-- arbitrary geocoded location.
--
-- scenario_id is UNIQUE: exactly one alert per scenario, so a page
-- refresh can never create duplicate alerts.
-- ------------------------------------------------------------
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
