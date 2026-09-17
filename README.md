# DepositGuard

**Get your full rental deposit back, with proof.**

Tenants in Indian cities regularly lose part of their security deposit to "damage" disputes at move-out, and neither side has reliable evidence of what the room looked like on day one. DepositGuard lets a tenant photograph every room at move-in and again at move-out. It fingerprints each photo so it can't be quietly swapped, finds exactly what changed, and uses a local AI model to separate **new damage** from what was **already there**. Subsequently, the tenant provides the report to the property owner, who has the option to accept or contest each individual finding.

Built for **First Commit** (Bharat Builds Tour by WeMakeDevs × AWS), Sept 17–20, 2026, on the **Build It** track: everything runs on your own machine with AWS open-source tools. No AWS account, card or bill needed.

## Built with AWS open source

| Project | What it does in DepositGuard |
|---|---|
| [**Strands Agents SDK**](https://strandsagents.com) | Runs the AI review: an agent backed by a local vision model (Qwen2.5-VL 3B in [Ollama](https://ollama.com)) labels each changed area as new damage, pre-existing, wear and tear, not damage, or unclear. See `server/agent.py`. |
| [**Cedar**](https://www.cedarpolicy.com) | Every API request is authorized by Cedar policies: tenants control their own homes; an owner's share link can only view and respond, can never change evidence, and stops working when it expires or is revoked. See `server/policies.cedar` and `server/authz.py`. |

## How it works

1. **Add a home** (optionally with the deposit amount) and its rooms.
2. **Move-in photos.** Each photo is resized in the browser, uploaded, and fingerprinted (SHA-256) by the server from the exact bytes it stores, with its capture and upload times.
3. **Move-out photos** of the same spots.
4. **Compare.** For each move-out photo the server:
   1. re-hashes every stored photo to prove it is unchanged since upload;
   2. picks the most similar move-in photo;
   3. finds the changed areas **without AI** (grid comparison with exposure normalisation, so a lamp being on isn't reported as damage), and flags pairs that show different views;
   4. crops each changed area into one **side-by-side BEFORE | AFTER** image and asks the Strands agent to label it.
5. **Report.** Findings with the changed area boxed on both photos, a plain-English summary, and photo tips.
6. **Share.** The tenant creates an expiring link; the owner opens it without an account and agrees or disputes each finding. The tenant sees the responses.

```
Browser (React + Vite)
   │  /api (same origin, session cookie + anti-CSRF header)
   ▼
server/app.py  (FastAPI)
   ├─ authz.py + policies.cedar ── Cedar decides every request
   ├─ db.py ────────────────────── SQLite + photo files in server/data/
   └─ pipeline.py
        ├─ vision.py ───────────── change detection, side-by-side crops (Pillow + NumPy)
        └─ agent.py ────────────── Strands Agents → Ollama (qwen2.5vl:3b)
```

## Run it

Requirements: Node.js 20+, Python 3.11, [Ollama](https://ollama.com). Works on an 8 GB Apple Silicon laptop.

```bash
# 1. Local AI model (about 3 GB, once)
ollama pull qwen2.5vl:3b

# 2. Backend
cd server
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --port 8787

# 3. Website (in a second terminal, from the repo root)
npm install
npm run dev          # http://localhost:5173
```

Data is stored in `server/data/` (ignored by git). A comparison takes about a minute per room on a laptop; one runs at a time to keep memory use reasonable.

## Project layout

| Path | What it is |
|---|---|
| `src/` | React app: homes, rooms, photo upload, report with change boxes, owner share page |
| `server/app.py` | API: sign-in, homes, rooms, photos, comparisons, share links |
| `server/policies.cedar`, `server/authz.py` | Cedar authorization |
| `server/pipeline.py`, `server/vision.py`, `server/agent.py` | Comparison pipeline, change detection, Strands agent |
| `amplify/` | An experimental cloud version (AWS Amplify, Lambda, Amazon Bedrock) started on day one; not used by the local app |

## Limits

- The local 3B model is small; it can misread a change. Every finding shows the photos and the changed area so people can judge for themselves, and the owner can dispute it.
- Change detection works best when move-out photos are taken from the same place and angle as move-in photos.
- This is evidence support, not legal advice.

## AI tools used

- **Claude (Anthropic), via Claude Code:** code assistance, planning and debugging.
- **Qwen2.5-VL 3B (via Ollama)** inside the app, run with Strands Agents.

## Credits and licences

- [Strands Agents](https://github.com/strands-agents/sdk-python) (Apache-2.0), [Cedar](https://github.com/cedar-policy/cedar) via [cedarpy](https://github.com/k9securityio/cedar-py) (Apache-2.0)
- [Ollama](https://github.com/ollama/ollama) (MIT), [Qwen2.5-VL 3B](https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct) model (Qwen Research License, non-commercial)
- [FastAPI](https://github.com/fastapi/fastapi) (MIT), [Uvicorn](https://github.com/encode/uvicorn) (BSD-3), [Pydantic](https://github.com/pydantic/pydantic) (MIT), [Pillow](https://github.com/python-pillow/Pillow) (MIT-CMU), [NumPy](https://github.com/numpy/numpy) (BSD-3)
- [React](https://github.com/facebook/react) (MIT), [Vite](https://github.com/vitejs/vite) (MIT)

## License

MIT
