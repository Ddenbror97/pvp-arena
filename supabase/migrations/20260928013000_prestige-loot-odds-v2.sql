-- Loot box odds, ten tiers from $0.50 to $100. Weights keep the published
-- ratios exactly; chance = weight / 9,600. Average payout is $1.92 per box.
delete from public.prestige_loot_odds;
insert into public.prestige_loot_odds (amount, weight) values
  (50, 7000), (75, 700), (100, 500), (200, 400), (300, 300),
  (500, 250), (1000, 200), (2000, 150), (5000, 80), (10000, 20);
