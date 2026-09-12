/** Office exports keep every chart/database value as readable text instead of dropping custom blocks. */
export function exportableBlocks(blocks: any[]): any[] {
  const paragraph = (id: string, text: string) => ({ id, type: "paragraph", props: { textAlignment: "left", textColor: "default", backgroundColor: "default" }, content: [{ type: "text", text, styles: {} }], children: [] });
  return blocks.flatMap(block => {
    const children = exportableBlocks(block.children ?? []);
    if (block.type === "chart") {
      const chart = JSON.parse(block.props.chartData);
      return [paragraph(block.id, chart.title || "Chart"), ...(chart.data ?? []).map((row: any, i: number) => paragraph(`${block.id}-${i}`, `${row.label}: ${row.value}`)), ...children];
    }
    if (block.type === "database") {
      const data = JSON.parse(block.props.data), keys = Object.keys(data.schema);
      return [paragraph(block.id, data.name), ...data.documents.map((row: any, i: number) => paragraph(`${block.id}-${i}`, keys.map(key => `${data.schema[key].label}: ${row.props[key]?.value ?? ""}`).join(" | "))), ...children];
    }
    return [{ ...block, children }];
  });
}
