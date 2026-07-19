'use client';

/*
 * Cartography ◫ — the living ecosystem map.
 *
 * Full-screen zoomable map of the whole platform as a generative landscape:
 * Projects are territories (organic coastlines seeded per slug, area grows
 * with mints), wallets are inhabitants (one dot per holder, sized by bag),
 * and market activity is movement — sales sail as comets between wallets,
 * mints ripple the shore and visibly grow the territory, listings beacon.
 * Spec: ClickUp task 86b9eth7w + Atlas "Dedicated Tools" page.
 *
 * Opened by long-pressing the "Price Discussion" name on the home page
 * (same gesture as the project-title long-press). Mounted globally in
 * PriceOSShell; fire useModal().open('cartography').
 *
 * Three zoom levels (continuous camera, LOD-gated detail):
 *   MACRO      — all of PD: simplified shapes + names.
 *   TERRITORY  — one Project: full coastline, inhabitants, counts.
 *   WALLET     — one wallet: its dots highlighted across EVERY territory,
 *                arcs connecting its empire, everything else dimmed (the
 *                fade carries meaning: focus — not a resting style).
 *
 * All data is the REAL ledger via /api/cartography (projects / holders /
 * events); after the seed load the map stays live over Supabase Realtime
 * (INSERTs on events, UPDATEs on projects), with a poll fallback while the
 * push channel is down — the same pattern as the home surface.
 *
 * Rendering is Canvas 2D with DPR scaling, cached Path2D coastlines, LOD
 * culling, and a force-directed layout that runs in periodic bursts (never
 * per frame, per spec); territories sharing collectors drift together into
 * continents. No new dependencies.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { getSupabaseBrowser } from '../lib/supabase';
import { projectColorway, getProject } from '../lib/project/registry';
import { useFaction } from '../lib/factions/useFaction';
import { factionByKey, WAR_GLYPHS } from '../lib/factions/factions';
import type {
    CartographyResponse,
    CartoEvent,
    CartoHolder,
    CartoProject,
} from '../app/api/cartography/route';
import type { WarResponse } from '../app/api/war/route';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ── deterministic seeds ─────────────────────────────────────────────── */

function fnv(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
/** Mulberry32 — tiny seeded PRNG for stable per-slug geography. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ── world model ─────────────────────────────────────────────────────── */

interface Inhabitant {
    addr: string;
    handle: string | null;
    n: number;
    /** Polar seat inside the territory (fractions of r — scale with growth). */
    ang: number;
    dist: number;
    phase: number;
    isArtist: boolean;
}

interface Territory {
    slug: string;
    title: string;
    color: string;
    minted: number;
    supply: number;
    volume: number;
    /* force-sim position + render position (eased toward sim). */
    sx: number;
    sy: number;
    x: number;
    y: number;
    /* radius: r eases toward targetR (mints grow the land). */
    r: number;
    targetR: number;
    /** Radial harmonics [amp, phase] pairs — the coastline's fingerprint. */
    harmonics: [number, number][];
    path: Path2D | null;
    pathR: number;
    inhabitants: Inhabitant[];
    byAddr: Map<string, Inhabitant>;
}

interface Ripple { x: number; y: number; t0: number; hue: string; big: boolean }
interface Beacon { x: number; y: number; t0: number; hue: string }
interface Comet {
    x0: number; y0: number; x1: number; y1: number;
    cx: number; cy: number; t0: number; dur: number;
    hue: string; price: number;
}
interface Flash { x: number; y: number; t0: number; text: string; hue: string }

type Level = 'MACRO' | 'TERRITORY' | 'WALLET';

/** The place card's data (the Maps-style bottom sheet for a territory). */
export interface PlaceSelection {
    slug: string;
    title: string;
    color: string;
    minted: number;
    supply: number;
    volume: number;
    ppl: number;
    war: { status: string; leader: string; leaderHex: string; siege: string | null } | null;
}

interface WarTerritory {
    leader: string;
    hex: string;
    status: string;
    siege: string | null;
}

interface EngineCallbacks {
    onStatus: (s: 'loading' | 'live' | 'poll' | 'error') => void;
    onLevel: (level: Level, name: string) => void;
    onWallet: (info: { label: string; pieces: number; lands: number } | null) => void;
    onSelect: (sel: PlaceSelection | null) => void;
}

function territoryRadius(minted: number): number {
    return 30 * Math.sqrt(minted + 3) + 12;
}

function shortAddr(a: string): string {
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function factionHexFor(key: string): string {
    return factionByKey(key)?.hex ?? '#E9EDF4';
}

function fmtEth(v: number): string {
    return v >= 10 ? String(Math.round(v)) : String(Number(v.toFixed(3)));
}

const TAU = Math.PI * 2;
const COAST_STEPS = 72;

/* ── the engine ──────────────────────────────────────────────────────── */

class CartoEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private cb: EngineCallbacks;
    private terrs: Territory[] = [];
    private bySlug = new Map<string, Territory>();
    private ripples: Ripple[] = [];
    private beacons: Beacon[] = [];
    private comets: Comet[] = [];
    private flashes: Flash[] = [];
    private echoQueue: { ev: CartoEvent; at: number }[] = [];
    /** Shared-collector affinity per pair "a|b" (a<b) — continents form here. */
    private affinity = new Map<string, number>();

    private cam = { x: 0, y: 0, z: 1 };
    private camTarget: { x: number; y: number; z: number } | null = null;
    private camFrom = { x: 0, y: 0, z: 1 };
    private camT0 = 0;
    private camDur = 0;

    private raf = 0;
    private dead = false;
    private simTimer = 0;
    private pollTimer = 0;
    private channel: RealtimeChannel | null = null;
    private realtimeOk = false;
    private reduceMotion = false;

    private focusSlug: string | null = null;
    private walletAddr: string | null = null;
    private lastLevel = '';

    /* input */
    private pointers = new Map<number, { x: number; y: number }>();
    private dragStart: { x: number; y: number; cx: number; cy: number } | null = null;
    private dragging = false;
    private pinchD0 = 0;
    private pinchZ0 = 1;
    private lastTap = 0;

    /* Ink — the map OWNS its palette. The sea is always near-black, so the
       ink is always light: labels must read at a glance on ANY page theme
       (the old theme-inherited ink went dark-on-dark — Rule #2 failure,
       Brendon's screens 2026-07-13). Never derive map text from the page. */
    private colText = '#E9EDF4';
    private colAccent = '#FFE600';
    private sea = '#07090d';

    /* The war layer (FACTIONS spec v3.1: toggle · default OFF · enlisted-
       only). Territory rings in the holding faction's colour; a live siege
       pulses. Data arrives from /api/war via setWar(). */
    private warOn = false;
    private war = new Map<string, WarTerritory>();
    private myMarks = new Set<string>();
    private myFactionHex: string | null = null;
    private myAddr: string | null = null;

    /* Sybil Net ∾ (Spell Book, 2026-07-17). Wallet clusters linked by real
       unpriced wallet→wallet transfers (computed server-side in
       /api/cartography from the full event fetch). While the spell is on,
       dotted lines connect clustered wallets wherever their dots co-occur
       on the map. netOf: addr → cluster index, for O(1) membership. */
    private sybilOn = false;
    private nets: string[][] = [];
    private netOf = new Map<string, number>();

    constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context');
        this.ctx = ctx;
        this.cb = cb;
        try {
            this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch { /* default false */ }
    }

    /* ── war layer plumbing (React owns the toggle + faction context) ────── */

    setWarLayer(on: boolean): void {
        this.warOn = on;
    }
    setWarData(data: WarResponse | null, myFactionHex: string | null, markedProjects: string[], myAddr: string | null): void {
        this.war.clear();
        if (data) {
            for (const c of data.collections) {
                if (!c.leader) continue;
                const hex = factionHexFor(c.leader);
                this.war.set(c.slug, { leader: c.leader, hex, status: c.status, siege: c.siege });
            }
        }
        this.myMarks = new Set(markedProjects);
        this.myFactionHex = myFactionHex;
        this.myAddr = myAddr ? myAddr.toLowerCase() : null;
    }
    warFor(slug: string): WarTerritory | null {
        return this.war.get(slug) ?? null;
    }

    /* ── Sybil Net plumbing (React owns the spell flag) ─────────────────── */

    setSybilNet(on: boolean): void {
        this.sybilOn = on;
    }

    /** The live territory list (minted land only) — the search box's index. */
    searchIndex(): { slug: string; title: string }[] {
        return this.terrs.map((t) => ({ slug: t.slug, title: t.title }));
    }

    async start(): Promise<void> {
        this.resize();
        window.addEventListener('resize', this.resize);
        const c = this.canvas;
        c.addEventListener('pointerdown', this.onDown);
        c.addEventListener('pointermove', this.onMove);
        c.addEventListener('pointerup', this.onUp);
        c.addEventListener('pointercancel', this.onUp);
        c.addEventListener('wheel', this.onWheel, { passive: false });
        this.raf = requestAnimationFrame(this.frame);

        try {
            const res = await fetch('/api/cartography');
            if (!res.ok) throw new Error(String(res.status));
            const data = (await res.json()) as CartographyResponse;
            if (this.dead) return;
            this.buildWorld(data);
            this.cb.onStatus(this.realtimeOk ? 'live' : 'poll');
        } catch {
            if (!this.dead) this.cb.onStatus('error');
            return;
        }

        /* Live layer — push first, poll only while the channel is down. */
        try {
            this.channel = getSupabaseBrowser()
                .channel('cartography-live')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'events' },
                    (payload) => this.onLiveEvent(payload.new as Record<string, unknown>),
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'projects' },
                    (payload) => this.onProjectUpdate(payload.new as Record<string, unknown>),
                )
                .subscribe((status) => {
                    this.realtimeOk = status === 'SUBSCRIBED';
                    if (!this.dead) this.cb.onStatus(this.realtimeOk ? 'live' : 'poll');
                });
        } catch { /* anon env missing — poll covers it */ }
        this.pollTimer = window.setInterval(() => {
            if (!this.realtimeOk && !document.hidden) void this.refetch();
        }, 60_000);

        /* Layout refresh in periodic bursts — never per frame (spec). */
        this.simTimer = window.setInterval(() => {
            if (!document.hidden) this.simulate(24);
        }, 4000);
    }

    destroy(): void {
        this.dead = true;
        cancelAnimationFrame(this.raf);
        window.clearInterval(this.simTimer);
        window.clearInterval(this.pollTimer);
        window.removeEventListener('resize', this.resize);
        const c = this.canvas;
        c.removeEventListener('pointerdown', this.onDown);
        c.removeEventListener('pointermove', this.onMove);
        c.removeEventListener('pointerup', this.onUp);
        c.removeEventListener('pointercancel', this.onUp);
        c.removeEventListener('wheel', this.onWheel);
        if (this.channel) {
            try { void getSupabaseBrowser().removeChannel(this.channel); } catch { /* gone */ }
            this.channel = null;
        }
    }

    /* ── world building ──────────────────────────────────────────────── */

    private buildWorld(data: CartographyResponse): void {
        const keepPos = new Map<string, { sx: number; sy: number; x: number; y: number }>();
        for (const t of this.terrs) keepPos.set(t.slug, { sx: t.sx, sy: t.sy, x: t.x, y: t.y });

        /* Unminted projects stay beneath the sea until their first mint (the
           route already filters; this guards the realtime path too). */
        const rows = [...data.projects].filter((p) => p.minted > 0).sort((a, b) => b.minted - a.minted);
        this.terrs = [];
        this.bySlug.clear();
        for (const p of rows) this.addTerritory(p, keepPos.get(p.slug));

        for (const h of data.holders) this.seatInhabitant(h);
        for (const t of this.terrs) this.sortInhabitants(t);

        /* Sybil Net — index the server-computed transfer clusters. */
        this.nets = data.nets ?? [];
        this.netOf.clear();
        this.nets.forEach((net, k) => {
            for (const a of net) this.netOf.set(a, k);
        });

        this.buildAffinity();

        if (keepPos.size === 0) {
            /* First build: golden-spiral seed, then settle hard so the map
               opens already-formed. */
            this.terrs.forEach((t, i) => {
                const a = i * 2.399963;
                const d = 46 * Math.sqrt(i + 1) + t.r;
                t.sx = t.x = Math.cos(a) * d * 2.2;
                t.sy = t.y = Math.sin(a) * d * 2.2;
            });
            this.simulate(300);
            for (const t of this.terrs) { t.x = t.sx; t.y = t.sy; t.r = t.targetR; }
            this.fitAll(false);
        }

        /* Echo layer — replay the recent ledger as staggered pings so the
           map is alive from the first second. Skipped under reduced motion. */
        if (!this.reduceMotion) {
            const now = performance.now();
            this.echoQueue = data.events
                .slice(0, 120)
                .map((ev, i) => ({ ev, at: now + 600 + i * 90 }));
        }
    }

    private addTerritory(p: CartoProject, pos?: { sx: number; sy: number; x: number; y: number }): void {
        const def = getProject(p.slug);
        const color = projectColorway(p.slug) ?? def?.colorway ?? '#8aa0b8';
        const rnd = rng(fnv(`carto:${p.slug}`));
        const harmonics: [number, number][] = [];
        for (let k = 0; k < 4; k++) harmonics.push([0.05 + rnd() * 0.11, rnd() * TAU]);
        const t: Territory = {
            slug: p.slug,
            title: (def?.displayName ?? p.title ?? p.slug).toUpperCase(),
            color,
            minted: p.minted,
            supply: p.supply || def?.outputs || 0,
            volume: p.volume_eth,
            sx: pos?.sx ?? 0,
            sy: pos?.sy ?? 0,
            x: pos?.x ?? 0,
            y: pos?.y ?? 0,
            r: territoryRadius(p.minted),
            targetR: territoryRadius(p.minted),
            harmonics,
            path: null,
            pathR: -1,
            inhabitants: [],
            byAddr: new Map(),
        };
        this.terrs.push(t);
        this.bySlug.set(t.slug, t);
        if (p.artist_address) {
            /* The artist lives at the capital — the founding inhabitant. */
            const art: Inhabitant = {
                addr: p.artist_address,
                handle: def?.artistHandle ?? null,
                n: 0,
                ang: 0,
                dist: 0,
                phase: 0,
                isArtist: true,
            };
            t.inhabitants.push(art);
            t.byAddr.set(p.artist_address, art);
        }
    }

    private seatInhabitant(h: CartoHolder): void {
        const t = this.bySlug.get(h.p);
        if (!t) return;
        const existing = t.byAddr.get(h.a);
        if (existing) {
            existing.n = h.n;
            if (h.h) existing.handle = h.h;
            return;
        }
        const rnd = rng(fnv(`seat:${h.p}:${h.a}`));
        const inh: Inhabitant = {
            addr: h.a,
            handle: h.h,
            n: h.n,
            ang: rnd() * TAU,
            dist: 0.22 + Math.sqrt(rnd()) * 0.58,
            phase: rnd() * TAU,
            isArtist: false,
        };
        t.inhabitants.push(inh);
        t.byAddr.set(h.a, inh);
    }

    private sortInhabitants(t: Territory): void {
        /* Big bags render first (underneath), artist last (on top). */
        t.inhabitants.sort((a, b) => (a.isArtist ? 1 : 0) - (b.isArtist ? 1 : 0) || b.n - a.n);
    }

    private buildAffinity(): void {
        this.affinity.clear();
        const lands = new Map<string, string[]>();
        for (const t of this.terrs) {
            for (const i of t.inhabitants) {
                if (i.isArtist && i.n === 0) continue;
                const arr = lands.get(i.addr);
                if (arr) arr.push(t.slug);
                else lands.set(i.addr, [t.slug]);
            }
        }
        for (const slugs of lands.values()) {
            if (slugs.length < 2) continue;
            for (let a = 0; a < slugs.length; a++) {
                for (let b = a + 1; b < slugs.length; b++) {
                    const key = slugs[a] < slugs[b] ? `${slugs[a]}|${slugs[b]}` : `${slugs[b]}|${slugs[a]}`;
                    this.affinity.set(key, (this.affinity.get(key) ?? 0) + 1);
                }
            }
        }
    }

    private async refetch(): Promise<void> {
        try {
            const res = await fetch('/api/cartography');
            if (!res.ok) return;
            const data = (await res.json()) as CartographyResponse;
            if (this.dead) return;
            const noEcho = this.terrs.length > 0;
            const savedEcho = this.echoQueue;
            this.buildWorld(data);
            if (noEcho) this.echoQueue = savedEcho; /* echoes only on first build */
        } catch { /* next poll retries */ }
    }

    /* ── force layout — periodic, eased into view ────────────────────── */

    private simulate(ticks: number): void {
        const n = this.terrs.length;
        if (n < 2) return;
        for (let step = 0; step < ticks; step++) {
            for (let i = 0; i < n; i++) {
                const a = this.terrs[i];
                for (let j = i + 1; j < n; j++) {
                    const b = this.terrs[j];
                    let dx = b.sx - a.sx;
                    let dy = b.sy - a.sy;
                    let d = Math.hypot(dx, dy);
                    if (d < 0.01) { d = 0.01; dx = 0.01; dy = 0; }
                    const key = a.slug < b.slug ? `${a.slug}|${b.slug}` : `${b.slug}|${a.slug}`;
                    const aff = this.affinity.get(key) ?? 0;
                    /* Shared collectors pull coasts together; strangers keep
                       a wider strait. */
                    const gap = aff > 0 ? Math.max(26, 90 - aff * 16) : 120;
                    const min = a.targetR + b.targetR + gap;
                    if (d < min) {
                        const push = ((min - d) / d) * 0.22;
                        a.sx -= dx * push; a.sy -= dy * push;
                        b.sx += dx * push; b.sy += dy * push;
                    } else if (aff > 0 && d > min) {
                        const k = Math.min(0.004 * aff, 0.02);
                        const pull = ((d - min) / d) * k;
                        a.sx += dx * pull; a.sy += dy * pull;
                        b.sx -= dx * pull; b.sy -= dy * pull;
                    }
                }
                /* soft gravity keeps the archipelago one map */
                a.sx *= 0.9992;
                a.sy *= 0.9992;
            }
        }
    }

    /* ── camera ──────────────────────────────────────────────────────── */

    private view(): { w: number; h: number } {
        return { w: this.canvas.clientWidth, h: this.canvas.clientHeight };
    }
    private toScreen(wx: number, wy: number): { x: number; y: number } {
        const { w, h } = this.view();
        return { x: (wx - this.cam.x) * this.cam.z + w / 2, y: (wy - this.cam.y) * this.cam.z + h / 2 };
    }
    private toWorld(px: number, py: number): { x: number; y: number } {
        const { w, h } = this.view();
        return { x: (px - w / 2) / this.cam.z + this.cam.x, y: (py - h / 2) / this.cam.z + this.cam.y };
    }
    private flyTo(x: number, y: number, z: number, dur = 700): void {
        this.camFrom = { ...this.cam };
        this.camTarget = { x, y, z };
        this.camT0 = performance.now();
        this.camDur = this.reduceMotion ? 0 : dur;
    }
    private fitAll(animate = true): void {
        if (this.terrs.length === 0) return;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const t of this.terrs) {
            x0 = Math.min(x0, t.sx - t.targetR);
            y0 = Math.min(y0, t.sy - t.targetR);
            x1 = Math.max(x1, t.sx + t.targetR);
            y1 = Math.max(y1, t.sy + t.targetR);
        }
        const { w, h } = this.view();
        const z = Math.min(w / (x1 - x0 + 160), h / (y1 - y0 + 200));
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        if (animate) this.flyTo(cx, cy, z);
        else { this.cam = { x: cx, y: cy, z }; this.camTarget = null; }
    }
    private tickCamera(now: number): void {
        if (!this.camTarget) return;
        const p = this.camDur === 0 ? 1 : Math.min(1, (now - this.camT0) / this.camDur);
        const e = 1 - Math.pow(1 - p, 3);
        this.cam.x = this.camFrom.x + (this.camTarget.x - this.camFrom.x) * e;
        this.cam.y = this.camFrom.y + (this.camTarget.y - this.camFrom.y) * e;
        this.cam.z = this.camFrom.z + (this.camTarget.z - this.camFrom.z) * e;
        if (p >= 1) this.camTarget = null;
    }

    /* ── navigation (public: the header breadcrumb calls up()) ─────────── */

    up(): void {
        if (this.walletAddr) {
            this.walletAddr = null;
            this.cb.onWallet(null);
            if (this.focusSlug) {
                const t = this.bySlug.get(this.focusSlug);
                if (t) this.focusTerritory(t);
                return;
            }
            this.fitAll();
            return;
        }
        if (this.focusSlug) {
            this.focusSlug = null;
            this.cb.onSelect(null);
            this.fitAll();
        }
    }

    private focusTerritory(t: Territory): void {
        this.focusSlug = t.slug;
        this.walletAddr = null;
        this.cb.onWallet(null);
        const { w, h } = this.view();
        const z = Math.min(w, h) / (t.targetR * 2.7);
        this.flyTo(t.sx, t.sy, z);
        /* The place card — the Maps-style read on the territory you tapped. */
        const war = this.war.get(t.slug);
        this.cb.onSelect({
            slug: t.slug,
            title: t.title,
            color: t.color,
            minted: t.minted,
            supply: t.supply,
            volume: t.volume,
            ppl: t.inhabitants.filter((i) => i.n > 0).length,
            war: war ? { status: war.status, leader: war.leader, leaderHex: war.hex, siege: war.siege } : null,
        });
    }

    /** Jump to a territory by slug (the search box + place-card reopen). */
    focusBySlug(slug: string): void {
        const t = this.bySlug.get(slug);
        if (t) this.focusTerritory(t);
    }

    /** Fly home to a wallet's whole empire (the Maps locate-me, PD-style). */
    locateMe(addr: string): void {
        this.focusWallet(addr.toLowerCase());
    }

    /** Public fit-all — the recenter control. */
    fit(): void {
        this.focusSlug = null;
        this.cb.onSelect(null);
        this.fitAll();
    }

    /** Zoom one step around the map centre (the ± controls). Eases via
     *  flyTo so it moves like every other camera change. */
    zoomStep(dir: number): void {
        const f = dir > 0 ? 1.6 : 1 / 1.6;
        const z = Math.min(6, Math.max(0.04, this.cam.z * f));
        this.flyTo(this.cam.x, this.cam.y, z, 260);
    }

    private focusWallet(addr: string): void {
        this.walletAddr = addr;
        let pieces = 0;
        let lands = 0;
        let label: string | null = null;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, seen = false;
        for (const t of this.terrs) {
            const i = t.byAddr.get(addr);
            if (!i || (i.n === 0 && !i.isArtist)) continue;
            lands += 1;
            pieces += i.n;
            if (i.handle) label = `@${i.handle}`;
            const p = this.inhabitantWorld(t, i, performance.now());
            x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
            x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
            seen = true;
        }
        this.cb.onWallet({ label: label ?? shortAddr(addr), pieces, lands });
        if (!seen) return;
        const { w, h } = this.view();
        const spanX = Math.max(x1 - x0, 120);
        const spanY = Math.max(y1 - y0, 120);
        const z = Math.min(w / (spanX + 320), h / (spanY + 360), 2.4);
        this.flyTo((x0 + x1) / 2, (y0 + y1) / 2, z);
    }

    /* ── live events ─────────────────────────────────────────────────── */

    private onProjectUpdate(row: Record<string, unknown>): void {
        const slug = String(row.id ?? '');
        const t = this.bySlug.get(slug);
        if (!t) { void this.refetch(); return; }
        const minted = Number(row.minted_count ?? t.minted);
        if (minted !== t.minted) {
            t.minted = minted;
            t.targetR = territoryRadius(minted);
        }
    }

    private onLiveEvent(row: Record<string, unknown>): void {
        const ev: CartoEvent = {
            t: String(row.type ?? ''),
            p: String(row.project_id ?? ''),
            id: row.token_id != null ? Number(row.token_id) : null,
            f: row.from_address ? String(row.from_address).toLowerCase() : null,
            to: row.to_address ? String(row.to_address).toLowerCase() : null,
            e: Number(row.price_eth ?? 0) || 0,
            ts: Number(row.timestamp) || 0,
        };
        this.playEvent(ev, true);
    }

    private inhabitantWorld(t: Territory, i: Inhabitant, now: number): { x: number; y: number } {
        if (i.isArtist && i.dist === 0) return { x: t.x, y: t.y };
        const wob = this.reduceMotion ? 0 : Math.sin(now / 2400 + i.phase) * 0.03;
        const d = (i.dist + wob) * t.r * 0.86;
        return { x: t.x + Math.cos(i.ang) * d, y: t.y + Math.sin(i.ang) * d };
    }

    private shorePoint(t: Territory, seedStr: string): { x: number; y: number } {
        const rnd = rng(fnv(seedStr));
        const a = rnd() * TAU;
        const rr = t.r * this.coast(t, a) * (0.7 + rnd() * 0.28);
        return { x: t.x + Math.cos(a) * rr, y: t.y + Math.sin(a) * rr };
    }

    /** Play one ledger event on the map. `live` = full ceremony; echoes are
     *  faint pings only. */
    private playEvent(ev: CartoEvent, live: boolean): void {
        const t = this.bySlug.get(ev.p);
        if (!t) return;
        const now = performance.now();
        const seed = `${ev.p}:${ev.id ?? 0}:${ev.ts}`;

        if (!live) {
            const p = this.shorePoint(t, seed);
            this.ripples.push({ x: p.x, y: p.y, t0: now, hue: t.color, big: false });
            return;
        }

        if (ev.t === 'MINT') {
            /* New land: grow the territory, seat the collector, ripple gold. */
            t.minted += 1;
            t.targetR = territoryRadius(t.minted);
            if (ev.to) {
                this.seatInhabitant({ p: ev.p, a: ev.to, n: (t.byAddr.get(ev.to)?.n ?? 0) + 1, h: t.byAddr.get(ev.to)?.handle ?? null });
                this.sortInhabitants(t);
            }
            const p = ev.to && t.byAddr.get(ev.to)
                ? this.inhabitantWorld(t, t.byAddr.get(ev.to)!, now)
                : this.shorePoint(t, seed);
            this.ripples.push({ x: p.x, y: p.y, t0: now, hue: this.colAccent, big: true });
            if (ev.e > 0) this.flashes.push({ x: p.x, y: p.y, t0: now, text: `✶ Ξ${fmtEth(ev.e)}`, hue: this.colAccent });
        } else if ((ev.t === 'XFER' || ev.t === 'SALE') && ev.e > 0) {
            /* A sale sails: comet from seller's seat to the buyer's. */
            if (ev.to) {
                this.seatInhabitant({ p: ev.p, a: ev.to, n: (t.byAddr.get(ev.to)?.n ?? 0) + 1, h: t.byAddr.get(ev.to)?.handle ?? null });
                this.sortInhabitants(t);
            }
            const fromI = ev.f ? t.byAddr.get(ev.f) : undefined;
            const toI = ev.to ? t.byAddr.get(ev.to) : undefined;
            if (fromI) fromI.n = Math.max(0, fromI.n - 1);
            const a = fromI ? this.inhabitantWorld(t, fromI, now) : this.shorePoint(t, `${seed}:f`);
            const b = toI ? this.inhabitantWorld(t, toI, now) : this.shorePoint(t, `${seed}:t`);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const dx = b.x - a.x, dy = b.y - a.y;
            const lift = Math.max(40, Math.hypot(dx, dy) * 0.35);
            this.comets.push({
                x0: a.x, y0: a.y, x1: b.x, y1: b.y,
                cx: mx - dy / Math.hypot(dx, dy || 1) * lift,
                cy: my + dx / Math.hypot(dx, dy || 1) * lift,
                t0: now, dur: this.reduceMotion ? 1 : 1400,
                hue: t.color, price: ev.e,
            });
        } else if (ev.t === 'LIST') {
            const p = this.shorePoint(t, seed);
            this.beacons.push({ x: p.x, y: p.y, t0: now, hue: t.color });
        } else if (ev.t === 'XFER') {
            /* unpriced transfer — quiet ripple */
            const p = this.shorePoint(t, seed);
            this.ripples.push({ x: p.x, y: p.y, t0: now, hue: t.color, big: false });
        }
    }

    /* ── input ───────────────────────────────────────────────────────── */

    private onDown = (e: PointerEvent): void => {
        this.canvas.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        if (this.pointers.size === 1) {
            this.dragStart = { x: e.offsetX, y: e.offsetY, cx: this.cam.x, cy: this.cam.y };
            this.dragging = false;
        } else if (this.pointers.size === 2) {
            const [p1, p2] = Array.from(this.pointers.values());
            this.pinchD0 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            this.pinchZ0 = this.cam.z;
            this.dragStart = null;
        }
    };

    private onMove = (e: PointerEvent): void => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        if (this.pointers.size === 2 && this.pinchD0 > 0) {
            const [p1, p2] = Array.from(this.pointers.values());
            const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const mid = this.toWorld((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            this.camTarget = null;
            this.cam.z = Math.min(6, Math.max(0.04, this.pinchZ0 * (d / this.pinchD0)));
            const after = this.toWorld((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            this.cam.x += mid.x - after.x;
            this.cam.y += mid.y - after.y;
            return;
        }
        if (this.dragStart) {
            const dx = e.offsetX - this.dragStart.x;
            const dy = e.offsetY - this.dragStart.y;
            if (!this.dragging && dx * dx + dy * dy > 64) this.dragging = true;
            if (this.dragging) {
                this.camTarget = null;
                this.cam.x = this.dragStart.cx - dx / this.cam.z;
                this.cam.y = this.dragStart.cy - dy / this.cam.z;
            }
        }
    };

    private onUp = (e: PointerEvent): void => {
        const wasDrag = this.dragging;
        this.pointers.delete(e.pointerId);
        if (this.pointers.size === 0) {
            const ds = this.dragStart;
            this.dragStart = null;
            this.dragging = false;
            this.pinchD0 = 0;
            if (!wasDrag && ds) this.onTap(e.offsetX, e.offsetY);
        }
    };

    private onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        const before = this.toWorld(e.offsetX, e.offsetY);
        this.camTarget = null;
        const f = Math.exp(-e.deltaY * 0.0016);
        this.cam.z = Math.min(6, Math.max(0.04, this.cam.z * f));
        const after = this.toWorld(e.offsetX, e.offsetY);
        this.cam.x += before.x - after.x;
        this.cam.y += before.y - after.y;
    };

    private onTap(px: number, py: number): void {
        const now = performance.now();
        const dbl = now - this.lastTap < 320;
        this.lastTap = now;
        const w = this.toWorld(px, py);

        /* Inhabitants first — only when they're visibly individuals. */
        for (const t of this.terrs) {
            const rpx = t.r * this.cam.z;
            if (rpx < 70) continue;
            if (Math.hypot(w.x - t.x, w.y - t.y) > t.r * 1.25) continue;
            let best: Inhabitant | null = null;
            let bestD = 14 / this.cam.z;
            for (const i of t.inhabitants) {
                if (i.n === 0 && !i.isArtist) continue;
                const p = this.inhabitantWorld(t, i, now);
                const d = Math.hypot(w.x - p.x, w.y - p.y);
                if (d < bestD) { bestD = d; best = i; }
            }
            if (best) { this.focusWallet(best.addr); return; }
        }

        /* Then territories. */
        for (const t of this.terrs) {
            const d = Math.hypot(w.x - t.x, w.y - t.y);
            if (d <= t.r * this.coast(t, Math.atan2(w.y - t.y, w.x - t.x))) {
                if (this.walletAddr) { this.walletAddr = null; this.cb.onWallet(null); }
                this.focusTerritory(t);
                return;
            }
        }

        /* Open sea: double-tap zooms in, single tap steps out of wallet mode. */
        if (this.walletAddr) { this.up(); return; }
        if (dbl) {
            this.flyTo(w.x, w.y, Math.min(6, this.cam.z * 1.9), 420);
        }
    }

    /* ── rendering ───────────────────────────────────────────────────── */

    private resize = (): void => {
        const c = this.canvas;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = c.clientWidth, h = c.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
            c.width = Math.round(w * dpr);
            c.height = Math.round(h * dpr);
        }
    };

    private coast(t: Territory, ang: number): number {
        let f = 1;
        for (let k = 0; k < t.harmonics.length; k++) {
            const [amp, ph] = t.harmonics[k];
            f += amp * Math.sin((k + 2) * ang + ph);
        }
        return f;
    }

    private coastPath(t: Territory): Path2D {
        if (t.path && Math.abs(t.pathR - t.r) < 0.6) return t.path;
        const p = new Path2D();
        for (let s = 0; s <= COAST_STEPS; s++) {
            const a = (s / COAST_STEPS) * TAU;
            const rr = t.r * this.coast(t, a);
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            if (s === 0) p.moveTo(x, y);
            else p.lineTo(x, y);
        }
        p.closePath();
        t.path = p;
        t.pathR = t.r;
        return p;
    }

    private frame = (now: number): void => {
        if (this.dead) return;
        this.raf = requestAnimationFrame(this.frame);
        if (document.hidden) return;
        this.resize();
        this.tickCamera(now);

        /* ease render state toward sim state */
        for (const t of this.terrs) {
            t.x += (t.sx - t.x) * 0.06;
            t.y += (t.sy - t.y) * 0.06;
            t.r += (t.targetR - t.r) * 0.05;
        }

        /* fire due echoes */
        while (this.echoQueue.length > 0 && this.echoQueue[0].at <= now) {
            const { ev } = this.echoQueue.shift()!;
            this.playEvent(ev, false);
        }

        const ctx = this.ctx;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const { w, h } = this.view();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        /* the sea */
        ctx.fillStyle = this.sea;
        ctx.fillRect(0, 0, w, h);
        this.drawSeaGrid(ctx, w, h, now);

        const wallet = this.walletAddr;

        /* territory bodies */
        for (const t of this.terrs) {
            const s = this.toScreen(t.x, t.y);
            const rpx = t.r * this.cam.z;
            if (s.x + rpx * 1.3 < 0 || s.x - rpx * 1.3 > w || s.y + rpx * 1.3 < 0 || s.y - rpx * 1.3 > h) continue;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(this.cam.z, this.cam.z);
            const path = this.coastPath(t);

            if (rpx < 7) {
                /* far-out LOD: a lit point of land */
                ctx.restore();
                ctx.fillStyle = t.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, Math.max(2, rpx * 0.5), 0, TAU);
                ctx.fill();
                continue;
            }

            /* landmass — dimmed in wallet mode unless this wallet lives here
               (the fade IS the meaning: focus). */
            const dimmed = wallet != null && !t.byAddr.has(wallet);
            ctx.globalAlpha = dimmed ? 0.16 : 1;
            const fill = ctx.createRadialGradient(0, 0, t.r * 0.1, 0, 0, t.r * 1.15);
            fill.addColorStop(0, this.mix(t.color, this.sea, 0.52));
            fill.addColorStop(1, this.mix(t.color, this.sea, 0.24));
            ctx.fillStyle = fill;
            ctx.fill(path);
            /* coastline — always full-strength */
            ctx.lineWidth = Math.max(1.25 / this.cam.z, 1.25);
            ctx.strokeStyle = t.color;
            ctx.stroke(path);
            /* shore water-line at territory zoom */
            if (rpx >= 90 && !dimmed) {
                ctx.lineWidth = 0.75 / this.cam.z;
                ctx.strokeStyle = this.mix(t.color, this.sea, 0.55);
                ctx.save();
                ctx.scale(1.045, 1.045);
                ctx.stroke(path);
                ctx.restore();
            }
            /* THE WAR LAYER — a held territory wears a thin coastline ring in
               the holding faction's colour; a live siege PULSES it. Enlisted-
               only, toggle, default off. The map stays a landscape. */
            const war = this.warOn && !dimmed ? this.war.get(t.slug) : null;
            if (war) {
                const pulse = war.siege && !this.reduceMotion
                    ? 0.55 + 0.45 * Math.sin(performance.now() / 300)
                    : 1;
                ctx.globalAlpha = pulse;
                ctx.lineWidth = Math.max(1.75 / this.cam.z, 1.75);
                ctx.strokeStyle = war.hex;
                ctx.save();
                ctx.scale(1.09, 1.09);
                ctx.stroke(path);
                ctx.restore();
                ctx.globalAlpha = 1;
                /* territories carrying YOUR mark glow faintly — your ink is
                   in their margins (Spread). */
                if (this.myMarks.has(t.slug) && this.myFactionHex) {
                    ctx.lineWidth = Math.max(0.9 / this.cam.z, 0.9);
                    ctx.strokeStyle = this.myFactionHex;
                    ctx.setLineDash([3 / this.cam.z, 5 / this.cam.z]);
                    ctx.save();
                    ctx.scale(1.14, 1.14);
                    ctx.stroke(path);
                    ctx.restore();
                    ctx.setLineDash([]);
                }
            }
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        /* Sybil Net ∾ — dotted lines between clustered wallets, under dots
           (and under the focus arcs, which stay the louder read). */
        if (this.sybilOn) this.drawSybilNets(ctx, now, wallet);

        /* wallet arcs under dots */
        if (wallet) this.drawWalletArcs(ctx, wallet, now);

        /* inhabitants */
        for (const t of this.terrs) {
            const s = this.toScreen(t.x, t.y);
            const rpx = t.r * this.cam.z;
            if (s.x + rpx * 1.4 < 0 || s.x - rpx * 1.4 > w || s.y + rpx * 1.4 < 0 || s.y - rpx * 1.4 > h) continue;
            const dimmed = wallet != null && !t.byAddr.has(wallet);
            if (rpx >= 46 && !dimmed) this.drawInhabitants(ctx, t, now, wallet);
        }

        /* labels — Google-Maps discipline: fixed screen-size type (never
           proportional to the landmass), zoom-tier fade-in, and greedy
           declutter in importance order (terrs are sorted by minted, so the
           biggest territories claim their names first and neighbours yield
           until you zoom). Every label is light ink + dark halo — glanceable
           at every level, on every territory colour. */
        this.drawLabels(ctx, w, h, wallet);

        this.drawFx(ctx, now);

        this.reportLevel();
    };

    private drawSeaGrid(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
        /* decorative depth-soundings dot grid, drifting almost imperceptibly */
        const step = 64 * this.cam.z;
        if (step < 14) return;
        const drift = this.reduceMotion ? 0 : Math.sin(now / 9000) * 2;
        const ox = ((-this.cam.x * this.cam.z + w / 2) % step + step) % step;
        const oy = ((-this.cam.y * this.cam.z + h / 2 + drift) % step + step) % step;
        ctx.fillStyle = this.mix(this.colText, this.sea, 0.1);
        for (let x = ox; x < w; x += step) {
            for (let y = oy; y < h; y += step) {
                ctx.fillRect(x, y, 1.4, 1.4);
            }
        }
    }

    private drawInhabitants(ctx: CanvasRenderingContext2D, t: Territory, now: number, wallet: string | null): void {
        const rpx = t.r * this.cam.z;
        const showLabels = rpx >= 300 || wallet != null;
        for (const i of t.inhabitants) {
            if (i.n === 0 && !i.isArtist) continue;
            const p = this.inhabitantWorld(t, i, now);
            const s = this.toScreen(p.x, p.y);
            const isFocus = wallet != null && i.addr === wallet;
            const rr = Math.min(9, 2 + Math.sqrt(i.n) * 1.4) * Math.min(1, this.cam.z * 0.9 + 0.35);
            if (wallet != null && !isFocus) {
                ctx.globalAlpha = 0.22;
            }
            if (i.isArtist) {
                /* the artist wears the artist glyph at the capital */
                ctx.fillStyle = this.colAccent;
                ctx.font = `${Math.max(10, Math.min(20, rpx * 0.09))}px 'Courier New', Courier, monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✺︎', s.x, s.y);
            } else {
                ctx.fillStyle = isFocus ? this.colAccent : this.colText;
                ctx.beginPath();
                ctx.arc(s.x, s.y, isFocus ? Math.max(rr, 4.5) : rr, 0, TAU);
                ctx.fill();
                if (isFocus) {
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = this.colAccent;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, Math.max(rr, 4.5) + 3.5, 0, TAU);
                    ctx.stroke();
                }
            }
            if (showLabels && (isFocus || rpx >= 300) && (i.handle || isFocus)) {
                const label = i.handle ? `@${i.handle}` : shortAddr(i.addr);
                ctx.font = `11px 'Courier New', Courier, monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                this.haloText(ctx, `${label}${i.n > 0 ? ` · ${i.n}` : ''}`, s.x, s.y + rr + 4, isFocus ? this.colAccent : this.colText);
            }
            ctx.globalAlpha = 1;
        }
    }

    private drawLabels(ctx: CanvasRenderingContext2D, w: number, h: number, wallet: string | null): void {
        const rects: { x0: number; y0: number; x1: number; y1: number }[] = [];
        const claim = (cx: number, cy: number, tw: number, th: number): boolean => {
            const pad = 5;
            const r = { x0: cx - tw / 2 - pad, y0: cy - th / 2 - pad, x1: cx + tw / 2 + pad, y1: cy + th / 2 + pad };
            for (const o of rects) {
                if (r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0) return false;
            }
            rects.push(r);
            return true;
        };
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const t of this.terrs) {
            const s = this.toScreen(t.x, t.y);
            const rpx = t.r * this.cam.z;
            if (s.x + rpx * 1.4 < 0 || s.x - rpx * 1.4 > w || s.y + rpx * 1.4 < 0 || s.y - rpx * 1.4 > h) continue;
            if (wallet != null && !t.byAddr.has(wallet)) continue;
            /* fade the name in as the territory earns the room for it */
            const alpha = Math.min(1, (rpx - 13) / 9);
            if (alpha <= 0) continue;
            const detailed = rpx >= 90;
            const size = detailed ? 13 : 12;
            ctx.font = `700 ${size}px 'Courier New', Courier, monospace`;
            const tw = ctx.measureText(t.title).width;
            /* centred on the landmass while small (an area label); lifted
               above the coast once zoomed in so the inhabitants stay clear */
            const ly = detailed ? s.y - rpx * 1.02 - size : s.y;
            if (!claim(s.x, ly, tw, size)) continue;
            ctx.globalAlpha = alpha;
            this.haloText(ctx, t.title, s.x, ly, this.colText);
            if (detailed) {
                ctx.font = `700 10px 'Courier New', Courier, monospace`;
                const line = `${t.minted}/${t.supply || '?'} · ${t.inhabitants.filter((i) => i.n > 0).length} PPL${t.volume > 0 ? ` · Ξ${t.volume < 10 ? t.volume.toFixed(2) : Math.round(t.volume)}` : ''}`;
                const lw = ctx.measureText(line).width;
                if (claim(s.x, ly + size + 2, lw, 10)) {
                    this.haloText(ctx, line, s.x, ly + size + 2, this.colText);
                }
            }
            ctx.globalAlpha = 1;
        }
    }

    private haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = this.sea;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    /* Sybil Net ∾ — for each transfer-linked wallet cluster, chain dotted
       lines through every seat its members hold on currently-visible land.
       Seats only count where their dots actually render (territory zoomed
       to individuals + not dimmed), so a line never points at empty coast.
       Dotted [2,4] — deliberately distinct from the focus arcs' [5,5] dash;
       same drifting offset so the net reads alive. In wallet mode only the
       focused wallet's net draws (the fade carries meaning: focus). */
    private drawSybilNets(ctx: CanvasRenderingContext2D, now: number, wallet: string | null): void {
        if (this.nets.length === 0) return;
        const focusNet = wallet != null ? this.netOf.get(wallet) : undefined;
        if (wallet != null && focusNet === undefined) return;
        /* Which territories are showing their inhabitants this frame. */
        const visible: Territory[] = [];
        for (const t of this.terrs) {
            const rpx = t.r * this.cam.z;
            if (rpx < 46) continue;
            if (wallet != null && !t.byAddr.has(wallet)) continue;
            visible.push(t);
        }
        if (visible.length === 0) return;
        const pts = new Map<number, { x: number; y: number }[]>();
        for (const t of visible) {
            for (const i of t.inhabitants) {
                if (i.n === 0 && !i.isArtist) continue;
                const k = this.netOf.get(i.addr);
                if (k === undefined) continue;
                if (focusNet !== undefined && k !== focusNet) continue;
                const p = this.inhabitantWorld(t, i, now);
                const s = this.toScreen(p.x, p.y);
                const arr = pts.get(k);
                if (arr) arr.push(s);
                else pts.set(k, [s]);
            }
        }
        ctx.strokeStyle = this.colText;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.lineDashOffset = this.reduceMotion ? 0 : -(now / 90) % 6;
        for (const arr of pts.values()) {
            if (arr.length < 2) continue;
            for (let i = 0; i < arr.length - 1; i++) {
                const a = arr[i], b = arr[i + 1];
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - Math.min(60, Math.hypot(b.x - a.x, b.y - a.y) * 0.15);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.quadraticCurveTo(mx, my, b.x, b.y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
    }

    private drawWalletArcs(ctx: CanvasRenderingContext2D, wallet: string, now: number): void {
        const pts: { x: number; y: number }[] = [];
        for (const t of this.terrs) {
            const i = t.byAddr.get(wallet);
            if (!i || (i.n === 0 && !i.isArtist)) continue;
            const p = this.inhabitantWorld(t, i, now);
            pts.push(this.toScreen(p.x, p.y));
        }
        if (pts.length < 2) return;
        /* Enlisted + war layer on + looking at your OWN empire: the arcs fly
           your faction's colour (spec §6, wallet zoom). */
        const ownWar = this.warOn && this.myFactionHex && wallet === this.myAddr;
        ctx.strokeStyle = ownWar ? this.myFactionHex! : this.colAccent;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = this.reduceMotion ? 0 : -(now / 60) % 10;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.min(90, Math.hypot(b.x - a.x, b.y - a.y) * 0.2);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(mx, my, b.x, b.y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    private drawFx(ctx: CanvasRenderingContext2D, now: number): void {
        /* ripples */
        this.ripples = this.ripples.filter((r) => now - r.t0 < 1600);
        for (const r of this.ripples) {
            const p = (now - r.t0) / 1600;
            const s = this.toScreen(r.x, r.y);
            const rad = (r.big ? 8 : 4) + p * (r.big ? 60 : 26) * Math.max(0.4, this.cam.z);
            ctx.globalAlpha = (1 - p) * (r.big ? 0.95 : 0.6);
            ctx.strokeStyle = r.hue;
            ctx.lineWidth = r.big ? 2 : 1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, rad, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        /* listing beacons — three staggered rings */
        this.beacons = this.beacons.filter((b) => now - b.t0 < 2600);
        for (const b of this.beacons) {
            const s = this.toScreen(b.x, b.y);
            for (let k = 0; k < 3; k++) {
                const p = ((now - b.t0) / 2600 + k * 0.22) % 1;
                ctx.globalAlpha = (1 - p) * 0.85;
                ctx.strokeStyle = b.hue;
                ctx.lineWidth = 1.25;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 3 + p * 34 * Math.max(0.4, this.cam.z), 0, TAU);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        /* sale comets */
        const done: Comet[] = [];
        for (const c of this.comets) {
            const p = Math.min(1, (now - c.t0) / c.dur);
            const pts: { x: number; y: number }[] = [];
            for (let k = 0; k <= 8; k++) {
                const q = Math.max(0, p - k * 0.035);
                const u = 1 - q;
                pts.push({
                    x: u * u * c.x0 + 2 * u * q * c.cx + q * q * c.x1,
                    y: u * u * c.y0 + 2 * u * q * c.cy + q * q * c.y1,
                });
            }
            const head = this.toScreen(pts[0].x, pts[0].y);
            for (let k = 1; k < pts.length; k++) {
                const a = this.toScreen(pts[k - 1].x, pts[k - 1].y);
                const b = this.toScreen(pts[k].x, pts[k].y);
                ctx.globalAlpha = Math.max(0, 1 - k / 8);
                ctx.strokeStyle = c.hue;
                ctx.lineWidth = Math.max(1, 3 - k * 0.3);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.colText;
            ctx.beginPath();
            ctx.arc(head.x, head.y, 3, 0, TAU);
            ctx.fill();
            if (p >= 1) {
                done.push(c);
                this.ripples.push({ x: c.x1, y: c.y1, t0: now, hue: c.hue, big: true });
                this.flashes.push({ x: c.x1, y: c.y1, t0: now, text: `✶ Ξ${fmtEth(c.price)}`, hue: this.colAccent });
            }
        }
        this.comets = this.comets.filter((c) => !done.includes(c));
        /* price flashes float up */
        this.flashes = this.flashes.filter((f) => now - f.t0 < 1800);
        for (const f of this.flashes) {
            const p = (now - f.t0) / 1800;
            const s = this.toScreen(f.x, f.y);
            ctx.globalAlpha = 1 - p;
            ctx.font = `700 13px 'Courier New', Courier, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            this.haloText(ctx, f.text, s.x, s.y - 10 - p * 34, f.hue);
            ctx.globalAlpha = 1;
        }
    }

    private mix(a: string, b: string, t: number): string {
        const pa = this.hex(a), pb = this.hex(b);
        if (!pa || !pb) return a;
        const m = (i: number) => Math.round(pb[i] + (pa[i] - pb[i]) * t);
        return `rgb(${m(0)},${m(1)},${m(2)})`;
    }
    private hexCache = new Map<string, [number, number, number] | null>();
    private hex(c: string): [number, number, number] | null {
        const hit = this.hexCache.get(c);
        if (hit !== undefined) return hit;
        let out: [number, number, number] | null = null;
        const m6 = /^#([0-9a-f]{6})$/i.exec(c.trim());
        const m3 = /^#([0-9a-f]{3})$/i.exec(c.trim());
        const mr = /^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/i.exec(c.trim());
        if (m6) out = [parseInt(m6[1].slice(0, 2), 16), parseInt(m6[1].slice(2, 4), 16), parseInt(m6[1].slice(4, 6), 16)];
        else if (m3) out = [parseInt(m3[1][0] + m3[1][0], 16), parseInt(m3[1][1] + m3[1][1], 16), parseInt(m3[1][2] + m3[1][2], 16)];
        else if (mr) out = [Number(mr[1]), Number(mr[2]), Number(mr[3])];
        this.hexCache.set(c, out);
        return out;
    }

    private reportLevel(): void {
        let level: Level = 'MACRO';
        let name = 'MACRO';
        if (this.walletAddr) {
            level = 'WALLET';
            name = 'WALLET';
        } else if (this.focusSlug && this.cam.z > 0.5) {
            const t = this.bySlug.get(this.focusSlug);
            level = 'TERRITORY';
            name = t ? t.title : 'TERRITORY';
        } else if (this.cam.z <= 0.5 && this.focusSlug) {
            this.focusSlug = null;
            this.cb.onSelect(null);
        }
        const key = `${level}:${name}`;
        if (key !== this.lastLevel) {
            this.lastLevel = key;
            this.cb.onLevel(level, name);
        }
    }
}

/* ── the modal ───────────────────────────────────────────────────────── */

export default function CartographyModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'cartography';
    const { siweAddress } = useAuth();
    const faction = useFaction();
    const { notifs } = usePdNotifs();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<CartoEngine | null>(null);
    const [status, setStatus] = useState<'loading' | 'live' | 'poll' | 'error'>('loading');
    const [level, setLevel] = useState<{ level: Level; name: string }>({ level: 'MACRO', name: 'MACRO' });
    const [wallet, setWallet] = useState<{ label: string; pieces: number; lands: number } | null>(null);
    const [place, setPlace] = useState<PlaceSelection | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    /* The war layer — toggle · DEFAULT OFF · enlisted-only (spec settled #5).
       The preference is per-device, like a Maps layer. */
    const [warOn, setWarOn] = useState(false);
    const [warData, setWarData] = useState<WarResponse | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        try {
            setWarOn(localStorage.getItem('pd_carto_war') === '1');
        } catch { /* default off */ }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        let eng: CartoEngine | null = null;
        try {
            eng = new CartoEngine(canvas, {
                onStatus: setStatus,
                onLevel: (lv, name) => setLevel({ level: lv, name }),
                onWallet: setWallet,
                onSelect: setPlace,
            });
            engineRef.current = eng;
            void eng.start();
        } catch {
            setStatus('error');
        }
        return () => {
            eng?.destroy();
            engineRef.current = null;
            setStatus('loading');
            setLevel({ level: 'MACRO', name: 'MACRO' });
            setWallet(null);
            setPlace(null);
            setSearchOpen(false);
            setQuery('');
        };
    }, [isOpen]);

    /* War data rides in only for the enlisted — civilians' maps never even
       fetch the war. Refreshes each open; the sweep recomputes server-side. */
    useEffect(() => {
        if (!isOpen || !faction) return;
        const me = siweAddress ? `?me=${siweAddress.toLowerCase()}` : '';
        void fetch(`/api/war${me}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d) setWarData(d as WarResponse); })
            .catch(() => { /* the layer just stays bare */ });
    }, [isOpen, faction, siweAddress]);

    /* Feed the engine the layer state + data whenever either moves. */
    useEffect(() => {
        const eng = engineRef.current;
        if (!eng) return;
        eng.setWarLayer(Boolean(warOn && faction));
        eng.setWarData(warData, faction?.hex ?? null, warData?.me?.markedProjects ?? [], siweAddress ?? null);
    }, [warOn, warData, faction, siweAddress, isOpen]);

    /* Sybil Net ∾ — the Spell Book flag drives the dotted-line layer. */
    useEffect(() => {
        engineRef.current?.setSybilNet(!!notifs.spell_sybilnet);
    }, [notifs.spell_sybilnet, isOpen]);

    const toggleWar = () => {
        const next = !warOn;
        setWarOn(next);
        try { localStorage.setItem('pd_carto_war', next ? '1' : '0'); } catch { /* ignore */ }
    };

    /* Search — type-ahead over the LIVE territories (minted land only). */
    const index = useMemo(() => {
        if (!isOpen) return [] as { slug: string; title: string }[];
        void status; // re-index once the world is built
        return engineRef.current?.searchIndex() ?? [];
    }, [isOpen, status]);
    const hits = useMemo(() => {
        const q = query.trim().toUpperCase();
        if (!q) return [] as { slug: string; title: string }[];
        return index.filter((i) => i.title.includes(q) || i.slug.toUpperCase().includes(q)).slice(0, 6);
    }, [query, index]);

    return (
        <div
            id="cartographyModal"
            className={`platform-modal carto-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Cartography"
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        close();
                    }
                }}
                title="Close"
            >
                {'×'}
                {'︎'}
            </div>
            {isOpen && (
                <div className="carto-stage">
                    <canvas ref={canvasRef} className="carto-canvas" />
                    <div className="carto-head">
                        <span className="carto-title">CARTOGRAPHY {'◫︎'}</span>
                        <span className={`carto-live${status === 'live' ? ' is-live' : ''}`}>
                            {status === 'loading' ? 'CHARTING…' : status === 'error' ? 'NO SIGNAL' : status === 'live' ? '● LIVE' : '○ SYNC'}
                        </span>
                    </div>
                    {(level.level !== 'MACRO' || wallet) && (
                        <div
                            className="carto-crumb"
                            role="button"
                            tabIndex={0}
                            onClick={() => engineRef.current?.up()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    engineRef.current?.up();
                                }
                            }}
                            title="Back out"
                        >
                            {'‹︎'} {wallet ? wallet.label : level.name}
                        </div>
                    )}

                    {/* Search — jump straight to a territory (Maps-inspired). */}
                    <div className={`carto-search${searchOpen ? ' is-open' : ''}`}>
                        <span
                            className="carto-search-btn"
                            role="button"
                            tabIndex={0}
                            title="Search territories"
                            onClick={() => { setSearchOpen((v) => !v); setQuery(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSearchOpen((v) => !v); setQuery(''); } }}
                        >
                            {'⌕︎'}
                        </span>
                        {searchOpen && (
                            <input
                                className="carto-search-input"
                                type="text"
                                placeholder="Find a territory"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                spellCheck={false}
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoFocus
                                aria-label="Search territories"
                            />
                        )}
                        {searchOpen && (
                            <span
                                className="carto-search-close"
                                role="button"
                                tabIndex={0}
                                title="Close search"
                                onClick={() => { setSearchOpen(false); setQuery(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSearchOpen(false); setQuery(''); } }}
                            >
                                {'×︎'}
                            </span>
                        )}
                        {searchOpen && hits.length > 0 && (
                            <div className="carto-search-hits">
                                {hits.map((hit) => (
                                    <div
                                        key={hit.slug}
                                        className="carto-search-hit"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => { engineRef.current?.focusBySlug(hit.slug); setSearchOpen(false); setQuery(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { engineRef.current?.focusBySlug(hit.slug); setSearchOpen(false); setQuery(''); } }}
                                    >
                                        {hit.title}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Zoom — ± around the map centre, matched to the search
                        button and sitting directly above it (Brendon, 2026-07-19). */}
                    <div className="carto-zoom">
                        <span
                            className="carto-zoom-btn"
                            role="button"
                            tabIndex={0}
                            title="Zoom in"
                            onClick={() => engineRef.current?.zoomStep(1)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); engineRef.current?.zoomStep(1); } }}
                        >
                            +
                        </span>
                        <span
                            className="carto-zoom-btn"
                            role="button"
                            tabIndex={0}
                            title="Zoom out"
                            onClick={() => engineRef.current?.zoomStep(-1)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); engineRef.current?.zoomStep(-1); } }}
                        >
                            {'−'}
                        </span>
                    </div>

                    {/* Control stack (Maps-inspired): fit the whole map, fly to
                        your own empire, and — enlisted only — the war layer. */}
                    <div className="carto-controls">
                        {faction && (
                            <span
                                className={`carto-ctl carto-ctl-war${warOn ? ' is-on' : ''}`}
                                role="button"
                                tabIndex={0}
                                title="War layer"
                                style={warOn ? { borderColor: faction.hex, color: faction.hex } : undefined}
                                onClick={toggleWar}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWar(); } }}
                            >
                                {WAR_GLYPHS.banner} WAR
                            </span>
                        )}
                        {siweAddress && (
                            <span
                                className="carto-ctl"
                                role="button"
                                tabIndex={0}
                                title="Fly to your empire"
                                onClick={() => engineRef.current?.locateMe(siweAddress)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); engineRef.current?.locateMe(siweAddress); } }}
                            >
                                ME
                            </span>
                        )}
                        <span
                            className="carto-ctl"
                            role="button"
                            tabIndex={0}
                            title="Fit the whole map"
                            onClick={() => engineRef.current?.fit()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); engineRef.current?.fit(); } }}
                        >
                            FIT
                        </span>
                    </div>

                    {/* Place card — the Maps-style bottom sheet for the tapped
                        territory. War line only for the enlisted w/ layer on. */}
                    {place && !wallet && (
                        <div className="carto-place" style={{ ['--cp-color' as string]: place.color }}>
                            <div className="carto-place-head">
                                <span className="cp-name">{place.title}</span>
                                <span
                                    className="cp-close"
                                    role="button"
                                    tabIndex={0}
                                    title="Close"
                                    onClick={() => { setPlace(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlace(null); } }}
                                >
                                    {'×︎'}
                                </span>
                            </div>
                            <div className="cp-stats">
                                {place.minted}/{place.supply || '?'} MINTED · {place.ppl} PPL
                                {place.volume > 0 ? ` · Ξ${place.volume < 10 ? place.volume.toFixed(2) : Math.round(place.volume)}` : ''}
                            </div>
                            {faction && warOn && place.war && (
                                <div className="cp-war" style={{ color: place.war.leaderHex }}>
                                    {place.war.siege
                                        ? `${WAR_GLYPHS.siege} SIEGE · ${place.war.siege} vs ${place.war.leader}`
                                        : `${place.war.status} · ${place.war.leader}`}
                                </div>
                            )}
                            <a className="cp-open" href={`/art/${place.slug}`}>OPEN {'⟙︎'}</a>
                        </div>
                    )}

                    {wallet && (
                        <div className="carto-wallet">
                            <span className="cw-name">{wallet.label}</span>
                            <span className="cw-stats">
                                <span className="cw-stat">{wallet.pieces} PIECES</span>
                                <span className="cw-dot"> · </span>
                                <span className="cw-stat">{wallet.lands} {wallet.lands === 1 ? 'TERRITORY' : 'TERRITORIES'}</span>
                            </span>
                        </div>
                    )}
                    <div className="carto-legend" aria-hidden="true">
                        <span>{'✶︎'} COLLECTED</span>
                        <span>{'✹︎'} LISTED</span>
                        <span>{'✸︎'} XFER</span>
                    </div>
                    <div className="carto-hint" aria-hidden="true">
                        DRAG TO SAIL · PINCH OR SCROLL TO ZOOM · TAP A TERRITORY
                    </div>
                </div>
            )}
        </div>
    );
}
