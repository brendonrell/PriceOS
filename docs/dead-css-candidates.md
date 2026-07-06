# Dead-CSS candidates — 2026-07-06 tech-debt audit

Classes appearing in a stylesheet selector but NOWHERE in app/components/lib
source (exact-literal check, template-composed prefixes excluded). 100 of 1,813
total classes.

⚠ DO NOT bulk-delete: some rules are PARKED BY DESIGN (the former
modal-build4.css header says sim-spec rules were ported even where React
markup doesn't trigger them yet — "sim is the spec"). Each candidate needs a
per-feature judgment: dead feature -> delete; parked spec -> keep. Also
re-verify against public/ assets and any HTML-string builders before removing.

- .aff-check
- .artwork-more-pills
- .artwork-more-stats
- .attr-label
- .attr-row
- .bc-bl
- .bc-tr
- .by-follower-stats
- .collected-by-label
- .fam-d3
- .fam-d4
- .fam-d5
- .feat-rotator
- .fm-box
- .fm-project-row
- .fm-project-tag
- .hero-stack
- .hero-stack-item
- .hero-stickers-tap
- .home-feed-loading
- .mf-copy
- .mf-lbl
- .mf-val
- .modal-action-buy
- .modal-action-owned
- .modal-action-price
- .modal-actions-row
- .modal-artist
- .modal-buy-row
- .modal-colorway-row
- .modal-grail-btn
- .modal-note-btn
- .modal-stat-glyph
- .modal-stats-row
- .mode-bold
- .mode-framed
- .more-attrs
- .more-genome-card
- .more-genome-meta
- .more-genome-svg
- .more-price-stats-row
- .more-replay-card
- .more-replay-meta
- .more-replay-timeline
- .more-true-name-row
- .mr-play
- .mr-range
- .mr-speed
- .mr-speed-dim
- .mr-tl-bar
- .mr-tl-ev
- .mr-tl-events
- .mr-tl-playhead
- .name-sprite
- .nav-arrow
- .note-divider
- .note-icon-glyph
- .note-id
- .note-item
- .note-text
- .notes-box
- .notes-filter-btn
- .notes-header
- .notes-header-row
- .notes-list
- .open-modal-text
- .owner-self-check
- .p3d-no
- .panel-back-arrow
- .panel-back-label
- .panel-back-row
- .panel-placeholder
- .panel-placeholder-body
- .panel-placeholder-note
- .panel-placeholder-title
- .pcel-name
- .pill-dotted
- .pings-count-badge
- .pings-count-badge--inline
- .pings-filter-toggle
- .placeholder-dot
- .placeholder-shell
- .route-loading
- .shuffle-by
- .shuffle-title
- .smgr-chip
- .smgr-chips
- .smgr-close
- .smgr-grid-wrap
- .smgr-head
- .smgr-label
- .smgr-row
- .spite-line--ghost
- .starred-list-controls
- .starred-list-search
- .starred-row-fate
- .starred-social-pills
- .tape-on
- .todo-item
- .wishlist-row-price--stack
