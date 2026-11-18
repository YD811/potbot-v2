-- The PotBot BAG: equal weights, pinned first on /bag. Stored as a normal
-- recipe so joins and buys attribute to it like any other BAG. Its creator
-- is the literal 'potbot', not a wallet: nobody earns referral points from
-- joins to the official BAG unless they brought the wallet with an invite link.
insert into public.bag_recipes (slug, name, creator, weights)
values ('potbot', 'PotBot BAG', 'potbot', '{"btc": 34, "ant": 33, "gold": 33}'::jsonb)
on conflict (slug) do nothing;
