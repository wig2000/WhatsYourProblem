# What's Your Problem — Project Agent Rules

See also: `~/.claude/CLAUDE.md` for global workflow rules.

---

## Stack

- **Server**: Next.js 15, TypeScript, Node.js — runs on port 3000
- **Mobile**: Expo / React Native — Metro bundler on port 8081, connects to server via `EXPO_PUBLIC_API_URL`
- **Image compositing**: Sharp (image ops) + resvg-js (SVG text with custom fonts)
- **Fonts**: TTF files in `public/fonts/` — loaded explicitly by resvg-js, NOT via Sharp/librsvg

## After Any Change, Run the Smoke Test

```bash
npm run smoke-test
```

This covers: font rendering, all composite paths, template images, text overflow. Fix any failures before handing back to the user.

## Server Changes

Restart and confirm ready (always free port 3000 — never accept Next's auto-fallback to 3001/3002, the mobile app's `EXPO_PUBLIC_API_URL` is hard-pinned to 3000):
```bash
kill $(lsof -ti :3000) 2>/dev/null; sleep 1; npm run dev > /tmp/wyp-dev.log 2>&1 &
sleep 5 && tail -5 /tmp/wyp-dev.log
```

## Mobile Layout Changes

After editing any `.tsx` in `mobile/`: `kill $(lsof -ti :8081) 2>/dev/null` and tell the user to re-scan the QR code. Metro caches aggressively — layout fixes are invisible until cleared.

## Font Changes

Adding/renaming fonts touches: TTF in `public/fonts/`; `FONT_FAMILY`/`FONT_SIZES`/`CHAR_WIDTH_RATIO` in `lib/compositing.ts`; `FontChoice` in `lib/types.ts` AND `mobile/lib/types.ts`; `FONT_LABELS` in `lib/constants.ts`, `mobile/lib/types.ts`, `components/CustomisationPanel.tsx`; font array in `mobile/app/customise/[id].tsx`. Then `npm run smoke-test`.

## Image generation routing (do not silently revert)

- See `memory/project_image_models.md` for current model routing per brief style.
- `parseComplaint` deliberately uses Grok (not Claude) — Anthropic 529 Overloaded errors made Claude unreliable here. See `memory/project_llm_routing.md`.
- Image model IDs that have caused issues: `fal-ai/flux2/pro` is wrong (use `fal-ai/flux-pro/v1.1`); `gpt-image-2` rejects `response_format` (don't pass it).

## Key Known Issues (do not re-introduce)

- **librsvg ignores @font-face data URIs** — always use resvg-js for SVG text rendering
- **Metro cache** — changes to React Native components require `kill $(lsof -ti :8081)`
- **Port 3000 fallback breaks mobile** — `mobile/.env` `EXPO_PUBLIC_API_URL` is pinned; always free 3000 before `npm run dev`
- **Template meme same image bug** — flagged in `app/api/generate/route.ts` (templateId logging present); still unresolved
- **Ads disabled** — `adsEnabled()` in `mobile/lib/ads.ts` returns `false`; do not enable without Android AdMob ID
