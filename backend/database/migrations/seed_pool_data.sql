-- Seed data: pooled property payments (ajo/esusu)
-- Three pools: rent, buy-home, land. Each has 3 dummy members with
-- schedules and paid contributions so funding progress renders.
--
-- Passwords for seeded users: member123

START TRANSACTION;

-- ── Dummy member accounts ──────────────────────────────────────────────
INSERT INTO users (name, email, password, role, is_active) VALUES
('Adebayo O.',   'member1@test.com', '$2y$12$U0L2ujb8emuwGT2oSjrJOOGTdZ10hkOAo/7JpIADKIxdJorGLaCzG', 'user', 1),
('Chiamaka N.',  'member2@test.com', '$2y$12$nZhqekeldqesbOXqji3QK.umgaAcUqSnp2LxqLbF.u4hV82hOlktq', 'user', 1),
('Tunde A.',     'member3@test.com', '$2y$12$.IdKNPwdum1iHpk0QOGiveymHcyX5COGMfR6iRikVGbY2SR3/jVJC', 'user', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ── Properties (rent / buy-home / land) ────────────────────────────────
INSERT INTO properties (title, slug, description, type, purpose, price, city, image, address, beds, baths, amenities, is_active) VALUES
('Lagos Island Group Rental', 'lagos-island-group-rental',
 'A premium 3-bedroom apartment in Lagos Island available for group rental. Pool members combine monthly contributions to cover the annual rent as a collective.',
 'apartment', 'rent', 36000000, 'Lagos Island',
 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop',
 'Plot 12, Adetokunbo Ademola Street, Lagos Island', 3, 3,
 '["Furnished", "24/7 Security", "Power Backup", "Parking"]', 1),
('Lekki Phase 1 Co-Own Duplex', 'lekki-phase-1-co-own-duplex',
 'A 4-bedroom duplex in Lekki Phase 1 for co-ownership. Members contribute monthly or one-time; once funded, the duplex is acquired in the group''s name.',
 'villa', 'buy', 250000000, 'Lekki',
 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop',
 'Block 4, Admiralty Way, Lekki Phase 1', 4, 4,
 '["Private Pool", "Garden", "Servant''s Quarters", "24/7 Security"]', 1),
('Epe Waterfront Land Plot', 'epe-waterfront-land-plot',
 'An approved 1,000 sqm waterfront land plot in Epe for group purchase. Pool members co-own the plot; the C of O is registered in the group''s name once funded.',
 'land', 'buy', 180000000, 'Epe',
 'https://images.unsplash.com/photo-1581093458791-9d42e3c4e117?w=800&auto=format&fit=crop',
 'Lakowe Waterfront, Epe', 0, 0,
 '["Waterfront", "Certificate of Occupancy", "Surveyed", "Road Access"]', 1)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ── Pools ──────────────────────────────────────────────────────────────
INSERT INTO investment_pools (title, slug, description, image, target_property_id, target_amount, current_raised, member_count, default_monthly, min_monthly, max_monthly, min_lump_sum, allow_monthly, allow_lump_sum, penalty_rate, grace_days, default_after_days, reminder_days_before, status, created_at) VALUES
('Group Rent — Lagos Island', 'group-rent-lagos-island',
 'Pool monthly contributions to cover the annual rent of a premium 3-bedroom apartment on Lagos Island. Once funded, the group secures a one-year lease.',
 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop',
 2, 36000000, 9000000, 3, 500000, 250000, 2000000, 250000, 1, 1, 5.00, 7, 30, '7,3,1', 'active', DATE_SUB(NOW(), INTERVAL 60 DAY)),
('Co-Buy Home — Lekki Phase 1', 'co-buy-home-lekki-phase-1',
 'Pool monthly or one-time contributions to co-own a 4-bedroom duplex in Lekki Phase 1. The duplex is acquired in the group''s name once the target is funded.',
 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop',
 3, 250000000, 18000000, 3, 1000000, 500000, 10000000, 1000000, 1, 1, 5.00, 7, 30, '7,3,1', 'active', DATE_SUB(NOW(), INTERVAL 90 DAY)),
('Land Co-Purchase — Epe Waterfront', 'land-co-purchase-epe-waterfront',
 'Group purchase of an approved waterfront land plot in Epe. Members contribute monthly or one-time; the C of O is registered in the group''s name once funded.',
 'https://images.unsplash.com/photo-1581093458791-9d42e3c4e117?w=800&auto=format&fit=crop',
 4, 180000000, 10000000, 3, 1500000, 500000, 10000000, 1000000, 1, 1, 5.00, 7, 30, '7,3,1', 'active', DATE_SUB(NOW(), INTERVAL 45 DAY));

-- ── Memberships ────────────────────────────────────────────────────────
INSERT INTO pool_memberships (pool_id, user_id, plan_type, monthly_amount, auto_debit, status, joined_at) VALUES
(1, 4, 'monthly', 500000, 1, 'active', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(1, 5, 'monthly', 1000000, 0, 'active', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(1, 6, 'lump_sum', NULL, 0, 'active', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(2, 4, 'monthly', 1000000, 1, 'active', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(2, 5, 'monthly', 2000000, 0, 'active', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(2, 6, 'lump_sum', NULL, 0, 'active', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(3, 4, 'monthly', 1500000, 1, 'active', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(3, 5, 'monthly', 2000000, 0, 'active', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(3, 6, 'lump_sum', NULL, 0, 'active', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- ── Schedules (monthly members only) ──────────────────────────────────
INSERT INTO pool_schedules (membership_id, pool_id, user_id, due_date, amount, penalty_amount, total_due, status, paid_at, payment_ref, created_at) VALUES
(1, 1, 4, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 500000, 0, 500000, 'paid', DATE_SUB(NOW(), INTERVAL 28 DAY), 'seed_s1', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(1, 1, 4, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 500000, 0, 500000, 'pending', NULL, NULL, NOW()),
(2, 1, 5, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 1000000, 0, 1000000, 'paid', DATE_SUB(NOW(), INTERVAL 50 DAY), 'seed_s2', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(2, 1, 5, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 1000000, 0, 1000000, 'paid', DATE_SUB(NOW(), INTERVAL 21 DAY), 'seed_s3', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(2, 1, 5, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 1000000, 0, 1000000, 'pending', NULL, NULL, NOW()),
(4, 2, 4, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 1000000, 0, 1000000, 'paid', DATE_SUB(NOW(), INTERVAL 55 DAY), 'seed_s4', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(4, 2, 4, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 1000000, 0, 1000000, 'paid', DATE_SUB(NOW(), INTERVAL 25 DAY), 'seed_s5', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(4, 2, 4, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 1000000, 0, 1000000, 'pending', NULL, NULL, NOW()),
(5, 2, 5, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 2000000, 0, 2000000, 'paid', DATE_SUB(NOW(), INTERVAL 55 DAY), 'seed_s6', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(5, 2, 5, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 2000000, 0, 2000000, 'paid', DATE_SUB(NOW(), INTERVAL 25 DAY), 'seed_s7', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(5, 2, 5, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 2000000, 0, 2000000, 'pending', NULL, NULL, NOW()),
(7, 3, 4, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 1500000, 0, 1500000, 'paid', DATE_SUB(NOW(), INTERVAL 10 DAY), 'seed_s8', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(7, 3, 4, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 1500000, 0, 1500000, 'pending', NULL, NULL, NOW()),
(8, 3, 5, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 2000000, 0, 2000000, 'paid', DATE_SUB(NOW(), INTERVAL 10 DAY), 'seed_s9', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(8, 3, 5, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 2000000, 0, 2000000, 'pending', NULL, NULL, NOW());

-- ── Contributions (sums match each pool's current_raised) ─────────────
INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at) VALUES
(1, 1, 4, 1, 500000, 0, 'monthly', 'manual', 'seed_c1', 'paid', DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY)),
(1, 2, 5, 3, 1000000, 0, 'monthly', 'manual', 'seed_c2', 'paid', DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 50 DAY)),
(1, 2, 5, 4, 1000000, 0, 'monthly', 'manual', 'seed_c3', 'paid', DATE_SUB(NOW(), INTERVAL 21 DAY), DATE_SUB(NOW(), INTERVAL 21 DAY)),
(1, 3, 6, NULL, 6500000, 0, 'lump_sum', 'transfer', 'seed_c4', 'paid', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY)),
(2, 4, 4, 6, 1000000, 0, 'monthly', 'manual', 'seed_c5', 'paid', DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 55 DAY)),
(2, 4, 4, 7, 1000000, 0, 'monthly', 'manual', 'seed_c6', 'paid', DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY)),
(2, 5, 5, 9, 2000000, 0, 'monthly', 'manual', 'seed_c7', 'paid', DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 55 DAY)),
(2, 5, 5, 10, 2000000, 0, 'monthly', 'manual', 'seed_c8', 'paid', DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY)),
(2, 6, 6, NULL, 12000000, 0, 'lump_sum', 'transfer', 'seed_c9', 'paid', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY)),
(3, 7, 4, 12, 1500000, 0, 'monthly', 'manual', 'seed_c10', 'paid', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3, 8, 5, 14, 2000000, 0, 'monthly', 'manual', 'seed_c11', 'paid', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3, 9, 6, NULL, 6500000, 0, 'lump_sum', 'transfer', 'seed_c12', 'paid', DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY));

COMMIT;
