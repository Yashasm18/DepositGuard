# DepositGuard roadmap

First Commit hackathon: Sept 17–20, 2026. Submission deadline is Sunday Sept 20, around 7 PM IST (confirm on the submission form).

Track: **Build It** (runs locally with AWS open source: Strands Agents + Cedar).
The new AWS account can't use Amazon Bedrock until AWS finishes verifying it, so the cloud version is parked.

## Thursday (Sept 17)
- [x] Cloud prototype with Amplify Gen 2 (blocked on Bedrock access)
- [x] Switched to Build It: local FastAPI server, SQLite, photo fingerprints
- [x] Change detection + side-by-side crops labelled by a Strands agent (Ollama, qwen2.5vl:3b)
- [x] Cedar policies for tenant / owner share links
- [x] Owner share link with Agree / Dispute
- [ ] Tenant tests the full flow in the browser with real room photos
- [ ] Submit a rough version on the hackathon form

## Friday (Sept 18): depth + UI
- [ ] Ghost overlay camera: move-in photo shown faintly while taking the move-out photo
- [ ] UI polish for the Best UI prize: landing page, guided room flow, report layout, mobile
- [ ] Friendly loading, empty and error states

## Saturday (Sept 19): Bangalore build day
- [ ] Deposit settlement: rough repair estimate in ₹ per new-damage item, refund summary
- [ ] Printable / PDF report
- [ ] Architecture and UX feedback from AWS mentors, then fix what they suggest

## If time allows
- [ ] Report in Kannada / Hindi
- [ ] Use Amazon Bedrock again if AWS enables the account (cloud version in amplify/)

## Sunday (Sept 20): freeze and submit
- [ ] No new features
- [ ] Demo video under 3 minutes, uploaded to YouTube: problem (20s), flow (90s), architecture with Strands + Cedar (30s), learnings + next
- [ ] Write-up: problem, build, where AWS fits, what we learned, AI tools used
- [ ] Optional: AWS Builder Center blog post
- [ ] Final submission well before the deadline
