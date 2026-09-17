import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type ImageFormat,
} from '@aws-sdk/client-bedrock-runtime';
import type { DocumentType } from '@smithy/types';
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import Anthropic from '@anthropic-ai/sdk';

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Provider-neutral prompt part. */
export type Part = { type: 'text'; text: string } | { type: 'image'; bytes: Uint8Array; mediaType: ImageType };

export interface ReportTool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface ReportRequest {
  system: string;
  parts: Part[];
  tool: ReportTool;
}

export class ModelUnavailableError extends Error {}

const region = process.env.AWS_REGION;
const claude = new AnthropicBedrockMantle({ awsRegion: region });
const bedrock = new BedrockRuntimeClient({ region });

/**
 * Asks each configured model in turn for the report and returns the first
 * answer. Bedrock enables models per account, so a model this account can't
 * use is skipped. Claude models go through the Messages API; Amazon Nova
 * models go through the Bedrock Converse API.
 */
export async function requestReport(
  modelIds: string[],
  request: ReportRequest,
): Promise<{ report: Record<string, unknown>; model: string }> {
  const failures: string[] = [];
  for (const model of modelIds) {
    try {
      const report = model.includes('amazon.nova')
        ? await askNova(model, request)
        : await askClaude(model, request);
      return { report, model };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Model ${model} failed, trying the next one: ${reason}`);
      failures.push(`${model}: ${reason}`);
    }
  }
  throw new ModelUnavailableError(`No configured AI model could produce a report.\n${failures.join('\n')}`);
}

async function askClaude(model: string, { system, parts, tool }: ReportRequest): Promise<Record<string, unknown>> {
  const response = await claude.messages.create({
    model,
    max_tokens: 16000,
    system,
    tools: [{ name: tool.name, description: tool.description, input_schema: tool.schema as Anthropic.Tool.InputSchema }],
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: parts.map((part): Anthropic.ContentBlockParam =>
          part.type === 'text'
            ? { type: 'text', text: part.text }
            : {
                type: 'image',
                source: { type: 'base64', media_type: part.mediaType, data: Buffer.from(part.bytes).toString('base64') },
              },
        ),
      },
    ],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to review these photos.');
  }
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === tool.name,
  );
  if (!toolUse) {
    throw new Error(`No report returned (stop reason: ${response.stop_reason}).`);
  }
  return toolUse.input as Record<string, unknown>;
}

async function askNova(model: string, { system, parts, tool }: ReportRequest): Promise<Record<string, unknown>> {
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: model,
      system: [{ text: system }],
      messages: [
        {
          role: 'user',
          content: parts.map(
            (part): ContentBlock =>
              part.type === 'text'
                ? { text: part.text }
                : { image: { format: part.mediaType.split('/')[1] as ImageFormat, source: { bytes: part.bytes } } },
          ),
        },
      ],
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name: tool.name,
              description: tool.description,
              inputSchema: { json: tool.schema as DocumentType },
            },
          },
        ],
        toolChoice: { tool: { name: tool.name } },
      },
      inferenceConfig: { maxTokens: 5000, temperature: 0 },
    }),
  );
  const toolUse = response.output?.message?.content?.find((block) => block.toolUse?.name === tool.name)?.toolUse;
  if (!toolUse?.input) {
    throw new Error(`No report returned (stop reason: ${response.stopReason}).`);
  }
  return toolUse.input as Record<string, unknown>;
}
