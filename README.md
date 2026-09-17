# DepositGuard

**Get your full rental deposit back, with proof.**

Tenants in Indian cities regularly lose part of their security deposit to "damage" disputes at move-out, and neither side has reliable evidence of what the room looked like on day one. DepositGuard lets a tenant photograph every room at move-in and again at move-out, fingerprints each photo so it can't be quietly swapped, and uses Claude on Amazon Bedrock to produce a before/after report that separates **new damage** from damage that was **already there** and **normal wear and tear**.

Built for **First Commit** (Bharat Builds Tour by WeMakeDevs × AWS), Sept 17–20, 2026.

## How it works

1. **Add a home** and its rooms.
2. **Move-in photos.** Each photo is resized in the browser, fingerprinted (SHA-256), uploaded to a private S3 folder and recorded with its capture time.
3. **Move-out photos** of the same spots.
4. **Compare.** A Lambda function re-hashes every stored photo to prove it is unchanged, then sends the move-in and move-out sets to Claude on Amazon Bedrock. The report classifies each finding as *New damage*, *Already there at move-in*, *Normal wear and tear*, *No change* or *Unclear*, with the photos it relied on.

## Architecture

```
React (Vite) on AWS Amplify Hosting
   │  sign-in                → Amazon Cognito
   │  photos                 → Amazon S3 (private per user, versioning on)
   │  homes / rooms / photos → AWS AppSync + Amazon DynamoDB
   │  compareRoom mutation   → AWS Lambda (async)
   │                              ├─ reads photos from S3, verifies SHA-256
   │                              ├─ Claude on Amazon Bedrock (vision)
   │                              └─ writes the report back to DynamoDB
   └─ app polls the room until the report is ready
```

All infrastructure is defined in TypeScript with AWS Amplify Gen 2 (`amplify/`).

| Path | What it is |
|---|---|
| `amplify/auth` | Cognito email sign-in |
| `amplify/data` | Data models (Property, Room, Photo) and the `compareRoom` mutation |
| `amplify/storage` | Private evidence bucket |
| `amplify/functions/compare-room` | Fingerprint check + Bedrock comparison |
| `src/` | React app |

## Run it locally

Requirements: Node.js 20+, an AWS account with Amazon Bedrock access, and local AWS credentials.

```bash
npm install
npx ampx sandbox      # deploys a personal backend and writes amplify_outputs.json
npm run dev           # in a second terminal
```

The Bedrock models are listed in `amplify/functions/compare-room/resource.ts` (`BEDROCK_MODEL_IDS`) and tried in order: Claude first, then Amazon Nova.

### Local AI fallback (optional)

If your AWS account can't use Bedrock yet, the comparison can run on your own machine with [Strands Agents](https://strandsagents.com) (AWS open source) and a local vision model in [Ollama](https://ollama.com). When a Bedrock comparison fails, the app shows a **Try local AI** button.

```bash
ollama pull qwen2.5vl:3b
cd local-ai && python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python server.py                    # http://localhost:8787
echo "VITE_LOCAL_AI_URL=http://localhost:8787" > ../.env.local
```

The small local model is much less accurate than the Bedrock models; use it for development only.

## AI tools used

- **Claude (Anthropic), via Claude Code:** code assistance, planning and debugging.
- **Claude on Amazon Bedrock:** the photo comparison inside the app.

## License

MIT
