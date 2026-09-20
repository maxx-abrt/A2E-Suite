// Direct execution of a context tool: the button hands the assistant a
// concrete read-only invocation (tool name + arguments) instead of a prompt.
// Only app-declared LOGIC_FUNCTION tools are ever offered as context buttons,
// so a direct invocation is read-only by construction; the explicit refusal
// below is the fail-closed guard for any caller that reaches this layer with a
// mutating button (C6: no AI auto-posting).
export type DirectToolInvocation = {
  toolName: string;
  arguments: Record<string, unknown>;
};

export type DirectToolRefusalReason =
  | 'MUTATING_TOOL_NOT_DIRECTLY_EXECUTABLE'
  | 'NO_BROWSING_CONTEXT'
  | 'MISSING_REQUIRED_INPUT';

export type DirectToolDispatchResult =
  | { success: true; result?: unknown }
  | { success: false; error: string };

export type DirectToolDispatch = (
  invocation: DirectToolInvocation,
) => Promise<DirectToolDispatchResult>;

export type DirectToolExecutionOutcome =
  | { status: 'executed'; result: unknown }
  | { status: 'refused'; reason: DirectToolRefusalReason; message: string }
  | { status: 'failed'; message: string };
