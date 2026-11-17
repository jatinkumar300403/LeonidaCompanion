-- Seed data (SPEC §11). Idempotent: `pnpm db:seed` re-runs it safely.
-- Keep tags and reserved usernames in step with src/config/tags.ts and src/config/auth.ts (a unit test checks).

-- Forum categories (SPEC §5, in order). Re-seeding never re-locks a category an admin opened.
insert into public.forum_categories (slug, name, description, sort_order, is_qa, is_locked, spoilers_allowed)
values
  ('help', 'Help & Questions', 'Stuck? Ask here, then mark the reply that solved it.', 1, true, false, false),
  ('tips', 'Tips & Discoveries', 'Share what you have found: tricks, shortcuts and hidden details.', 2, false, false, false),
  ('missions-story', 'Missions & Story', 'Story talk. Spoilers allowed: every post sits behind a spoiler warning.', 3, false, false, true),
  ('online', 'Online', 'Opens when the online mode launches.', 4, false, true, false),
  ('clips-moments', 'Clips & Moments', 'Talk about the best clips and moments.', 5, false, false, false),
  ('bugs-performance', 'Bugs, Performance & Settings', 'Crashes, frame rate, settings and fixes.', 6, false, false, false),
  ('general', 'General Discussion', 'Anything else about the game.', 7, false, false, false),
  ('site-feedback', 'Site Feedback', 'Ideas and bug reports for this site.', 8, false, false, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_qa = excluded.is_qa,
    spoilers_allowed = excluded.spoilers_allowed;

-- Tags (SPEC §4).
insert into public.tags (slug, label, sort_order)
values
  ('beginner', 'Beginner', 1),
  ('money', 'Money', 2),
  ('combat', 'Combat', 3),
  ('driving', 'Driving', 4),
  ('stealth', 'Stealth', 5),
  ('missions', 'Missions', 6),
  ('heists', 'Heists', 7),
  ('wanted-level', 'Wanted level', 8),
  ('vehicles', 'Vehicles', 9),
  ('weapons', 'Weapons', 10),
  ('characters', 'Characters', 11),
  ('map', 'Map', 12),
  ('activities', 'Activities', 13),
  ('social-media', 'Social media', 14),
  ('settings', 'Settings', 15),
  ('performance', 'Performance', 16),
  ('accessibility', 'Accessibility', 17),
  ('online', 'Online', 18),
  ('collectibles', 'Collectibles', 19),
  ('easter-eggs', 'Easter eggs', 20)
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Reserved usernames (SPEC §9).
insert into public.reserved_usernames (name)
values
  ('admin'),
  ('administrator'),
  ('mod'),
  ('moderator'),
  ('mods'),
  ('staff'),
  ('team'),
  ('support'),
  ('help'),
  ('official'),
  ('system'),
  ('root'),
  ('owner'),
  ('rockstar'),
  ('rockstargames'),
  ('rockstar_games'),
  ('rockstarsupport'),
  ('taketwo'),
  ('take_two'),
  ('taketwointeractive'),
  ('gta'),
  ('gta6'),
  ('gtavi'),
  ('gta_6'),
  ('gta_vi'),
  ('anonymous'),
  ('deleted'),
  ('deleted_user'),
  ('null'),
  ('undefined'),
  ('ai'),
  ('bot'),
  ('api'),
  ('auth'),
  ('settings'),
  ('onboarding'),
  ('signin'),
  ('sign_in'),
  ('signup'),
  ('sign_up'),
  ('login'),
  ('logout'),
  ('register'),
  ('me'),
  ('user'),
  ('users'),
  ('forum'),
  ('clips'),
  ('tips'),
  ('ask')
on conflict do nothing;

-- Site settings: feature flags all off (D-018) and an empty launch-facts skeleton (SPEC §4).
insert into public.site_settings (key, value)
values
  ('flags', '{"FEATURE_ONLINE": false, "FEATURE_ADS": false, "FEATURE_ASK_ANON": false, "MAINTENANCE_MODE": false}'),
  ('launch_facts', '{"release_at": null, "platforms": [], "editions": [], "preload": null, "download_size": null}')
on conflict (key) do nothing;

-- Promote the owner (SEED_ADMIN_EMAIL) when that account already exists. scripts/seed-admin.mjs
-- stores the address in private.seed_admins; a profile created later is promoted on insert.
update public.profiles p
set role = 'admin'
from auth.users u, private.seed_admins s
where p.id = u.id
  and lower(u.email) = lower(s.email::text)
  and p.role <> 'admin';
