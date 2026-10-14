-- ============================================================
-- SEED DATA — Flash Flood Prediction System
-- ============================================================
-- IMPORTANT: All data below is SYNTHETIC / DEMO data created
-- for the SIH 2026 prototype. Names, coordinates, population
-- figures, and historical event records are illustrative only
-- and DO NOT represent verified government, IMD, NDMA, or
-- Survey of India records. Coordinates are approximate points
-- placed within real hilly districts for demo realism only.
-- ============================================================

USE flood_prediction;

-- ------------------------------------------------------------
-- LOCATIONS (20 demo villages/wards across hilly Indian states)
-- ------------------------------------------------------------
INSERT INTO locations (name, district, state, latitude, longitude, elevation, slope, population, historical_risk, is_demo_data) VALUES
('Demo Village A - Munnar Hills',        'Idukki',            'Kerala',            10.088900, 77.059500, 1650.00, 32.50, 2400, 0.720, TRUE),
('Demo Village B - Wayanad Ridge',       'Wayanad',           'Kerala',            11.685900, 76.132000, 900.00,  27.00, 3100, 0.680, TRUE),
('Demo Village C - Nilgiri Slope',       'Nilgiris',          'Tamil Nadu',        11.406600, 76.695400, 1800.00, 35.20, 1950, 0.810, TRUE),
('Demo Village D - Rishikesh Foothill',  'Dehradun',          'Uttarakhand',       30.086900, 78.267100, 700.00,  24.00, 4200, 0.650, TRUE),
('Demo Village E - Kedar Valley',        'Rudraprayag',       'Uttarakhand',       30.523500, 78.981000, 1980.00, 40.10, 1200, 0.900, TRUE),
('Demo Village F - Mandi Ridge',         'Mandi',             'Himachal Pradesh',  31.708900, 76.932600, 1100.00, 29.60, 2800, 0.700, TRUE),
('Demo Village G - Kullu Riverside',     'Kullu',             'Himachal Pradesh',  31.957700, 77.109400, 1280.00, 33.00, 2600, 0.760, TRUE),
('Demo Village H - Darjeeling Slope',    'Darjeeling',        'West Bengal',       27.036100, 88.262600, 2050.00, 38.40, 1750, 0.850, TRUE),
('Demo Village I - Gangtok Terrace',     'East Sikkim',       'Sikkim',            27.332900, 88.612600, 1650.00, 31.00, 2100, 0.730, TRUE),
('Demo Village J - Shillong Plateau',    'East Khasi Hills',  'Meghalaya',         25.578100, 91.893900, 1500.00, 26.50, 2950, 0.640, TRUE),
('Demo Village K - Aizawl Hillside',     'Aizawl',            'Mizoram',           23.727400, 92.717400, 1130.00, 34.80, 1850, 0.700, TRUE),
('Demo Village L - Itanagar Foothill',   'Papum Pare',        'Arunachal Pradesh', 27.083500, 93.605900, 800.00,  30.20, 1600, 0.620, TRUE),
('Demo Village M - Coorg Estate',        'Kodagu',            'Karnataka',         12.421900, 75.740300, 1050.00, 28.00, 2200, 0.660, TRUE),
('Demo Village N - Almora Ridge',        'Almora',            'Uttarakhand',       29.596500, 79.656400, 1650.00, 27.80, 1400, 0.680, TRUE),
('Demo Village O - Shimla Slope',        'Shimla',            'Himachal Pradesh',  31.104100, 77.173400, 2150.00, 36.60, 3200, 0.780, TRUE),
('Demo Village P - Nainital Basin',      'Nainital',          'Uttarakhand',       29.380000, 79.463000, 1940.00, 33.90, 2750, 0.750, TRUE),
('Demo Village Q - Palakkad Gap',        'Palakkad',          'Kerala',            10.775300, 76.653900, 450.00,  18.50, 3400, 0.500, TRUE),
('Demo Village R - Kalimpong Terrace',   'Kalimpong',         'West Bengal',       27.070000, 88.472500, 1250.00, 32.10, 1550, 0.710, TRUE),
('Demo Village S - Manali Valley',       'Kullu',             'Himachal Pradesh',  32.239800, 77.188700, 2050.00, 39.00, 1300, 0.870, TRUE),
('Demo Village T - Chikmagalur Hills',   'Chikmagalur',       'Karnataka',         13.315300, 75.775400, 1100.00, 25.70, 2450, 0.590, TRUE);

-- ------------------------------------------------------------
-- SAFE ZONES (at least one shelter per few locations)
-- ------------------------------------------------------------
INSERT INTO safe_zones (name, latitude, longitude, capacity, location_id) VALUES
('Demo Community Shelter - Munnar',        10.090000, 77.061000, 500, 1),
('Demo Government School Shelter - Wayanad', 11.688000, 76.134500, 350, 2),
('Demo Panchayat Hall - Nilgiris',          11.409000, 76.698000, 400, 3),
('Demo Relief Camp - Rishikesh',            30.089000, 78.270000, 600, 4),
('Demo Community Shelter - Kedar Valley',   30.526000, 78.984000, 250, 5),
('Demo School Shelter - Mandi',             31.711000, 76.935000, 300, 6),
('Demo Relief Camp - Kullu',                31.960000, 77.112000, 450, 7),
('Demo Monastery Shelter - Darjeeling',     27.039000, 88.265000, 300, 8),
('Demo Community Hall - Gangtok',           27.335500, 88.615000, 380, 9),
('Demo School Shelter - Shillong',          25.580500, 91.896500, 420, 10),
('Demo Church Hall Shelter - Aizawl',       23.730000, 92.720000, 280, 11),
('Demo Panchayat Shelter - Itanagar',       27.086000, 93.608500, 320, 12),
('Demo Estate Office Shelter - Coorg',      12.424500, 75.743000, 260, 13),
('Demo Community Shelter - Almora',         29.599000, 79.659000, 300, 14),
('Demo Relief Camp - Shimla',               31.107000, 77.176000, 550, 15),
('Demo School Shelter - Nainital',          29.383000, 79.466000, 480, 16),
('Demo Panchayat Hall - Palakkad',          10.778000, 76.656500, 500, 17),
('Demo Monastery Shelter - Kalimpong',      27.073000, 88.475000, 260, 18),
('Demo Relief Camp - Manali',               32.242500, 77.191500, 300, 19),
('Demo Estate Shelter - Chikmagalur',       13.318000, 75.778000, 340, 20);

-- ------------------------------------------------------------
-- SENSOR DATA (baseline NORMAL readings, one per location)
-- Synthetic values only — not live IoT hardware readings.
-- ------------------------------------------------------------
INSERT INTO sensor_data (location_id, rainfall, soil_moisture, river_level, humidity, temperature, is_synthetic) VALUES
(1,  22.5, 38.0, 28.0, 72.0, 21.5, TRUE),
(2,  18.0, 34.5, 25.0, 68.0, 23.0, TRUE),
(3,  25.0, 41.0, 30.0, 75.0, 19.5, TRUE),
(4,  15.0, 30.0, 22.0, 60.0, 26.0, TRUE),
(5,  30.0, 45.0, 35.0, 78.0, 17.0, TRUE),
(6,  20.0, 36.0, 27.0, 66.0, 22.0, TRUE),
(7,  24.0, 39.0, 29.0, 70.0, 20.5, TRUE),
(8,  28.0, 43.0, 33.0, 80.0, 18.0, TRUE),
(9,  21.0, 37.0, 26.0, 71.0, 21.0, TRUE),
(10, 17.5, 33.0, 24.0, 65.0, 24.0, TRUE),
(11, 19.0, 35.0, 25.5, 69.0, 23.5, TRUE),
(12, 16.0, 31.0, 23.0, 63.0, 25.0, TRUE),
(13, 20.5, 36.5, 26.5, 67.0, 22.5, TRUE),
(14, 18.5, 34.0, 24.5, 64.0, 22.0, TRUE),
(15, 27.0, 42.0, 31.0, 76.0, 16.5, TRUE),
(16, 23.0, 38.5, 28.5, 73.0, 19.0, TRUE),
(17, 12.0, 26.0, 18.0, 58.0, 28.0, TRUE),
(18, 26.0, 40.5, 30.5, 77.0, 18.5, TRUE),
(19, 29.0, 44.0, 34.0, 79.0, 15.5, TRUE),
(20, 19.5, 35.5, 25.0, 68.5, 23.0, TRUE);

-- ------------------------------------------------------------
-- HISTORICAL EVENTS (synthetic past disaster records, for
-- feature engineering / historical_risk context only)
-- ------------------------------------------------------------
INSERT INTO historical_events (location_id, event_type, severity, rainfall, date, damage_level, is_synthetic) VALUES
(1,  'LANDSLIDE',    'HIGH',     210.0, '2019-08-09', 'SEVERE',       TRUE),
(1,  'FLASH_FLOOD',  'MODERATE', 140.0, '2021-07-15', 'MODERATE',     TRUE),
(2,  'FLASH_FLOOD',  'HIGH',     190.0, '2018-08-14', 'SEVERE',       TRUE),
(3,  'LANDSLIDE',    'CRITICAL', 260.0, '2020-08-08', 'CATASTROPHIC', TRUE),
(4,  'RIVER_FLOOD',  'MODERATE', 130.0, '2022-07-20', 'MODERATE',     TRUE),
(5,  'FLASH_FLOOD',  'CRITICAL', 280.0, '2013-06-17', 'CATASTROPHIC', TRUE),
(5,  'DEBRIS_FLOW',  'HIGH',     200.0, '2021-02-07', 'SEVERE',       TRUE),
(6,  'LANDSLIDE',    'MODERATE', 150.0, '2020-08-19', 'MODERATE',     TRUE),
(7,  'FLASH_FLOOD',  'HIGH',     185.0, '2023-07-09', 'SEVERE',       TRUE),
(8,  'LANDSLIDE',    'HIGH',     220.0, '2021-10-05', 'SEVERE',       TRUE),
(9,  'FLASH_FLOOD',  'MODERATE', 160.0, '2016-06-13', 'MODERATE',     TRUE),
(10, 'FLASH_FLOOD',  'MODERATE', 145.0, '2022-05-30', 'MODERATE',     TRUE),
(11, 'LANDSLIDE',    'MODERATE', 155.0, '2017-06-01', 'MODERATE',     TRUE),
(13, 'LANDSLIDE',    'MODERATE', 135.0, '2018-08-08', 'MINOR',        TRUE),
(15, 'LANDSLIDE',    'HIGH',     195.0, '2023-08-14', 'SEVERE',       TRUE),
(16, 'FLASH_FLOOD',  'HIGH',     180.0, '2013-06-16', 'SEVERE',       TRUE),
(18, 'LANDSLIDE',    'MODERATE', 150.0, '2015-07-02', 'MODERATE',     TRUE),
(19, 'FLASH_FLOOD',  'CRITICAL', 250.0, '2023-07-09', 'CATASTROPHIC', TRUE);
