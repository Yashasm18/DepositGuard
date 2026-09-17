import { createHash } from 'node:crypto';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/compare-room';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const data = generateClient<Schema>();
const s3 = new S3Client();
const claude = new AnthropicBedrockMantle({ awsRegion: process.env.AWS_REGION });

// Tried in order; Bedrock enables models per account, so fall back to the
// first one this account is allowed to use.
const MODEL_IDS = (process.env.BEDROCK_MODEL_IDS ?? 'anthropic.claude-opus-5')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const MAX_PHOTOS_PER_PHASE = 6;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

type Photo = Schema['Photo']['type'];

const SYSTEM_PROMPT = `You are an impartial evidence reviewer for rental security-deposit disputes in India.
You receive photos of one room taken when the tenant moved in and photos of the same room taken when they moved out.
Compare them and report each visible difference in the condition of the room: walls, paint, floor, doors, windows, fittings, fixtures and furniture.

Classify every finding as one of:
- NEW_DAMAGE: damage visible at move-out that is clearly absent in the move-in photos of the same area.
- PRE_EXISTING: the issue is already visible in the move-in photos, so the tenant should not be charged for it.
- WEAR_AND_TEAR: normal ageing from ordinary use (light scuffs, faded paint, small pin marks), which is usually not deductible.
- NO_CHANGE: an area you checked closely that looks the same in both sets.
- UNCLEAR: the photos do not show the same area clearly enough (different angle, lighting, blur) to decide.

Be fair to both tenant and owner. Only call something NEW_DAMAGE when the move-in photos of the same area show it was not there.
When in doubt, use UNCLEAR and say what photo would settle it. Refer to photos by their labels, for example "Move-in 2".
This is evidence support, not legal advice. Report your findings by calling the report_findings tool.`;

const REPORT_TOOL: Anthropic.Tool = {
  name: 'report_findings',
  description: 'Submit the before/after condition report for this room.',
  input_schema: {
    type: 'object',
    properties: {
      overall: {
        type: 'string',
        enum: ['NO_NEW_DAMAGE', 'WEAR_AND_TEAR_ONLY', 'NEW_DAMAGE_FOUND', 'INSUFFICIENT_EVIDENCE'],
      },
      summary: {
        type: 'string',
        description: 'Two or three plain-English sentences a tenant and an owner can both understand.',
      },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string', description: 'What is affected, e.g. "Wall paint" or "Wardrobe door".' },
            location: { type: 'string', description: 'Where in the room, e.g. "left wall near the window".' },
            status: {
              type: 'string',
              enum: ['NEW_DAMAGE', 'PRE_EXISTING', 'WEAR_AND_TEAR', 'NO_CHANGE', 'UNCLEAR'],
            },
            severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
            description: { type: 'string' },
            moveInPhotos: { type: 'array', items: { type: 'integer' }, description: 'Move-in photo numbers used.' },
            moveOutPhotos: { type: 'array', items: { type: 'integer' }, description: 'Move-out photo numbers used.' },
            confidence: { type: 'number', description: 'From 0 to 1.' },
          },
          required: ['item', 'location', 'status', 'severity', 'description', 'moveInPhotos', 'moveOutPhotos', 'confidence'],
        },
      },
      photoQualityNotes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Problems with the photos and what to retake, if any.',
      },
    },
    required: ['overall', 'summary', 'findings', 'photoQualityNotes'],
  },
};

interface EvidenceCheck {
  photoId: string;
  phase: 'MOVE_IN' | 'MOVE_OUT';
  label: string;
  capturedAt: string;
  sha256: string;
  verified: boolean;
}

export const handler: Schema['compareRoom']['functionHandler'] = async (event) => {
  const { roomId } = event.arguments;

  try {
    const callerSub = event.identity && 'sub' in event.identity ? event.identity.sub : undefined;
    const { data: room } = await data.models.Room.get({ id: roomId });
    if (!room || !callerSub || !isOwnedBy(room.owner, callerSub)) {
      throw new Error('Room not found.');
    }

    await data.models.Room.update({ id: roomId, comparisonStatus: 'PROCESSING', comparisonError: null });

    const { data: photos } = await data.models.Photo.listPhotoByRoomId({ roomId }, { limit: 200 });
    const owned = photos.filter((p) => isOwnedBy(p.owner, callerSub));
    const moveIn = latest(owned.filter((p) => p.phase === 'MOVE_IN'));
    const moveOut = latest(owned.filter((p) => p.phase === 'MOVE_OUT'));
    if (moveIn.length === 0 || moveOut.length === 0) {
      throw new Error('Add at least one move-in photo and one move-out photo before comparing.');
    }

    const content: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: `Room: ${room.name}` },
    ];
    const evidence: EvidenceCheck[] = [];
    for (const [phase, set, title] of [
      ['MOVE_IN', moveIn, 'Move-in'],
      ['MOVE_OUT', moveOut, 'Move-out'],
    ] as const) {
      content.push({ type: 'text', text: `${title.toUpperCase()} PHOTOS` });
      for (const [i, photo] of set.entries()) {
        const label = `${title} ${i + 1}`;
        const { bytes, mediaType } = await readImage(photo.path);
        const actualHash = createHash('sha256').update(bytes).digest('hex');
        evidence.push({
          photoId: photo.id,
          phase,
          label,
          capturedAt: photo.capturedAt,
          sha256: photo.sha256,
          verified: actualHash === photo.sha256,
        });
        const note = photo.note ? ` Tenant note: ${photo.note}` : '';
        content.push({ type: 'text', text: `${label} (taken ${photo.capturedAt}).${note}` });
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: Buffer.from(bytes).toString('base64') },
        });
      }
    }
    content.push({
      type: 'text',
      text: 'Compare the move-in and move-out photos of this room and call report_findings with your report.',
    });

    const { response, model } = await createWithFallback({
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [REPORT_TOOL],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('The AI declined to review these photos. Try different photos.');
    }
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'report_findings',
    );
    if (!toolUse) {
      throw new Error(`The AI did not return a report (stop reason: ${response.stop_reason}). Please try again.`);
    }
    const report = toolUse.input as Record<string, unknown>;
    if (!Array.isArray(report.findings) || typeof report.summary !== 'string') {
      throw new Error('The AI returned an incomplete report. Please try again.');
    }

    await data.models.Room.update({
      id: roomId,
      comparisonStatus: 'DONE',
      comparedAt: new Date().toISOString(),
      comparisonError: null,
      comparison: JSON.stringify({ ...report, evidence, model }),
    });
  } catch (error) {
    console.error('compareRoom failed', error);
    const message = friendlyError(error);
    await data.models.Room.update({ id: roomId, comparisonStatus: 'FAILED', comparisonError: message }).catch(() => {});
  }
};

async function createWithFallback(
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>,
): Promise<{ response: Anthropic.Message; model: string }> {
  let lastError: unknown;
  for (const model of MODEL_IDS) {
    try {
      return { response: await claude.messages.create({ ...params, model }), model };
    } catch (error) {
      if (!(error instanceof Anthropic.PermissionDeniedError || error instanceof Anthropic.NotFoundError)) {
        throw error;
      }
      console.warn(`Model ${model} is not available, trying the next one.`, error.message);
      lastError = error;
    }
  }
  throw lastError ?? new Error('No Bedrock model configured.');
}

function friendlyError(error: unknown): string {
  if (error instanceof Anthropic.PermissionDeniedError || error instanceof Anthropic.NotFoundError) {
    return 'The AI model is not enabled for this AWS account yet. Enable Claude in Amazon Bedrock and try again.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'The AI service is busy right now. Please try again in a minute.';
  }
  if (error instanceof Anthropic.APIError) {
    return 'The AI service had a problem. Please try again.';
  }
  return error instanceof Error ? error.message : 'Comparison failed.';
}

// Amplify stores the owner as "<sub>::<username>".
function isOwnedBy(owner: string | null | undefined, sub: string): boolean {
  return !!owner && (owner === sub || owner.startsWith(`${sub}::`));
}

function latest(photos: Photo[]): Photo[] {
  return [...photos]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .slice(-MAX_PHOTOS_PER_PHASE);
}

async function readImage(path: string): Promise<{ bytes: Uint8Array; mediaType: ImageType }> {
  const object = await s3.send(new GetObjectCommand({ Bucket: process.env.EVIDENCE_BUCKET, Key: path }));
  const mediaType = (object.ContentType ?? '').split(';')[0] as ImageType;
  if (!IMAGE_TYPES.includes(mediaType)) {
    throw new Error(`Unsupported photo type for ${path}.`);
  }
  if (!object.Body) {
    throw new Error(`Photo ${path} is empty.`);
  }
  return { bytes: await object.Body.transformToByteArray(), mediaType };
}
