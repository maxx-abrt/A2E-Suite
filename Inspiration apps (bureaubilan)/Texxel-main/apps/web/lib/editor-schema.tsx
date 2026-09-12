"use client";
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { createReactMathBlockSpec, createReactInlineMathSpec } from "@blocknote/math-block";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import { ChartBlock } from "@/components/app/chart-block";
import { DatabaseBlock } from "@/components/app/database-block";
import { FontFamilyStyle } from "@/components/app/font-style";
import { reviewStyles } from "./editor-review";
const Mention = createReactInlineContentSpec({ type: "mention", propSchema: { id: { default: "" }, label: { default: "" }, kind: { default: "user" } }, content: "none" }, {
  render: ({ inlineContent }) => <span className="mention-chip rounded-md bg-accent px-1.5 font-semibold text-accent-foreground" data-mention-kind={inlineContent.props.kind} data-mention-id={inlineContent.props.id}>{inlineContent.props.kind === "task" ? "#" : "@"}{inlineContent.props.label}</span>,
});
export const fluxEditorSchema = withMultiColumn(BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, chart: ChartBlock(), database: DatabaseBlock(), mathBlock: createReactMathBlockSpec(), diagram: createReactDiagramBlockSpec() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, mention: Mention, math: createReactInlineMathSpec() },
  styleSpecs: { ...defaultStyleSpecs, font: FontFamilyStyle, ...reviewStyles },
}));
