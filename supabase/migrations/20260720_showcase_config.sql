-- Studio Showcase customization (Brendon, 2026-07-20): per-project artist
-- control of the Showcase tab — the manual set order lives in the existing
-- showcase_ids; these columns add the presentation: layout (classic /
-- masonry / mixed large-small), little titles on/off, and the Gen Curated
-- set's caption (caption present = the engine's placard shows).
alter table public.projects
  add column if not exists showcase_layout text
    check (showcase_layout in ('classic','masonry','mixed')),
  add column if not exists showcase_titles boolean not null default false,
  add column if not exists showcase_caption text;
