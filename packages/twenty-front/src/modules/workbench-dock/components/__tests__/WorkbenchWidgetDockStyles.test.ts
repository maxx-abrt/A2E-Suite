import { readFileSync } from 'fs';
import { join } from 'path';

// jsdom plus the mocked @linaria/react runtime never materialise Linaria's
// generated stylesheet, so the authored template source is the only artefact a
// unit test can inspect to guard the dock's CSS against regressing back to the
// invalid `workbenchwidgetdockwidth` property/media names.
const workbenchWidgetDockSource = readFileSync(
  join(__dirname, '..', 'WorkbenchWidgetDock.tsx'),
  'utf8',
);

describe('WorkbenchWidgetDock styles', () => {
  it('uses valid width properties, a var-based width and px media queries', () => {
    expect(workbenchWidgetDockSource).toContain('min-width:');
    expect(workbenchWidgetDockSource).toContain('transition: width ');
    expect(workbenchWidgetDockSource).toContain('width: ${({ isExpanded }) =>');
    expect(workbenchWidgetDockSource).toContain("'--a2e-widgets-width'");
    expect(workbenchWidgetDockSource).toContain(
      'var(${WORKBENCH_DOCK_WIDTH_CSS_VARIABLE}, 336px)',
    );
    expect(workbenchWidgetDockSource).toContain('@media (max-width: 1199px)');
    expect(workbenchWidgetDockSource).toContain('@media (max-width: 767px)');
    expect(workbenchWidgetDockSource).toContain('max-width: calc(');
  });

  it('does not keep the invalid custom property or media names', () => {
    expect(workbenchWidgetDockSource).not.toContain('workbenchwidgetdockwidth');
    expect(workbenchWidgetDockSource).not.toContain(
      'workbenchWidgetDockWidth:',
    );
    expect(workbenchWidgetDockSource).not.toContain(
      'max-workbenchwidgetdockwidth',
    );
  });
});
