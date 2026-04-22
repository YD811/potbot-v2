# PotBot — Demo Checklist
**For EasyA Amsterdam · Saturday**

Run this the night before AND 30 minutes before the event.

---

## NIGHT BEFORE (Friday)

### Code
- [ ] Push all latest changes to `main` on GitHub
- [ ] Vercel preview URL working? Test: `https://potbot-v2.vercel.app/dashboard`
- [ ] Check console — no red errors on dashboard load
- [ ] `CreatePotModal` opens and all 3 steps render correctly
- [ ] POT detail page loads at `/pots/[any-pubkey]` (mock data is fine)

### Telegram Bot
- [ ] Bot is running (`npm run dev` in `apps/bot`)
- [ ] `/start` — welcome message appears
- [ ] `/pot` — shows "Connect Wallet" if no session, or POT list if wallet linked
- [ ] `/swap 10 SOL JUP` — shows swap proposal card with Jupiter link
- [ ] `/help` — shows all commands

### Laptop
- [ ] Charged to 100%
- [ ] Charger packed
- [ ] Browser tabs pre-opened (see below)
- [ ] Deck downloaded locally AND in Google Slides as backup
- [ ] Presentation mode tested (no notification popups!)
- [ ] Do Not Disturb ON

### Phone
- [ ] Telegram app open and logged in
- [ ] Bot conversation loaded
- [ ] Screen brightness max

---

## 30 MINUTES BEFORE (Saturday)

### Environment
- [ ] Connected to venue WiFi (or mobile hotspot if WiFi unreliable)
- [ ] Hotspot on phone ready as backup
- [ ] HDMI adapter in bag (bring both USB-C and Mini DisplayPort)

### Browser Tabs (open in this order, left to right)
1. **Pitch deck** — `PotBot_Pitch.pptx` in full-screen or Google Slides
2. **Dashboard** — `localhost:3000/dashboard` or Vercel URL
3. **POT Detail** — `/pots/[mock-pubkey]` with Trade tab pre-selected
4. **GitHub** — `github.com/YD811/potbot-v2` (shows the codebase is real)

### Demo Flow (what to show if they ask for live demo)

**Step 1** (Dashboard — 30s)
→ "This is the dashboard. My POTs, balances, Tamagotchi XP."
→ Click "Create POT" → modal opens → walk through 3 steps → don't submit

**Step 2** (POT Detail — 45s)
→ Click into a POT → show Trade tab
→ "I want to swap 10 SOL for JUP. I enter it here."
→ Show governance warning: "This creates a proposal — members need to vote."
→ Click Governance tab → show active proposals + vote buttons

**Step 3** (Telegram — 30s)
→ Switch to phone
→ Open bot, type `/swap 10 SOL JUP`
→ Show the response card with "Create Swap Proposal" button

**Step 4** (GitHub — 15s)
→ "The code is all open source" → show repo structure briefly

Total demo: ~2 minutes if they ask

---

## IF THINGS BREAK

| Problem | Fix |
|---------|-----|
| Localhost not working | Use Vercel URL |
| Vercel URL not loading | Use screenshots on phone |
| Bot not responding | Show screenshots of bot conversation |
| WiFi down | Use phone hotspot |
| Projector issues | Send deck to @kwok_phil on X/Telegram |
| Completely offline | Pitch from memory using the script — the story is stronger than the demo |

---

## WHAT MUST WORK (non-negotiable)
- [ ] Pitch deck displays correctly
- [ ] You know the script cold (test once out loud before bed)
- [ ] GitHub repo is public with clean README

## NICE TO HAVE (not blocking)
- [ ] Live on-chain data from devnet
- [ ] Telegram bot live and responsive
- [ ] `/pots/[pubkey]` with real wallet data

---

## AFTER THE PITCH

- [ ] Share GitHub link in the room: `github.com/YD811/potbot-v2`
- [ ] QR code ready (generate at qr.io) pointing to GitHub or Vercel
- [ ] One-pager PDF on phone to AirDrop/share to interested people
- [ ] Fill out Kickstart application BEFORE the event: `kickstart-solana.easya.io/accelerator`
- [ ] Follow @kwok_phil and @dom_kwok on X, send DM with repo link after the event

---

## KICKSTART APPLICATION — fill this out NOW
URL: `https://kickstart-solana.easya.io/accelerator`

Key fields to prepare:
- **Project name**: PotBot v2
- **One-liner**: Collective trading vaults on Solana — group DeFi with built-in governance and Tamagotchi
- **Stage**: Hackathon / MVP
- **Chain**: Solana
- **Ask**: $10,000
- **Use of funds**: Devnet deploy ($2K), UX + Tamagotchi animations ($5K), community ($3K)
- **GitHub**: github.com/YD811/potbot-v2
