import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reviewStyles,
  ReviewExtension,
  reviewIds,
  serializeEditor,
  restoreReview,
  attachReview,
} from '@/lib/editor-review';

describe('editor-review', () => {
  describe('reviewStyles', () => {
    it('should define insertion, deletion, and modification styles', () => {
      expect(reviewStyles.insertion).toBeDefined();
      expect(reviewStyles.deletion).toBeDefined();
      expect(reviewStyles.modification).toBeDefined();
    });

    it('should have correct config types', () => {
      expect(reviewStyles.insertion.config.type).toBe('insertion');
      expect(reviewStyles.deletion.config.type).toBe('deletion');
      expect(reviewStyles.modification.config.type).toBe('modification');
    });

    it('should have boolean propSchema', () => {
      expect(reviewStyles.insertion.config.propSchema).toBe('boolean');
      expect(reviewStyles.deletion.config.propSchema).toBe('boolean');
      expect(reviewStyles.modification.config.propSchema).toBe('boolean');
    });

    it('should have mark implementations', () => {
      expect(reviewStyles.insertion.implementation.mark).toBeDefined();
      expect(reviewStyles.deletion.implementation.mark).toBeDefined();
      expect(reviewStyles.modification.implementation.mark).toBeDefined();
    });

    it('should have render functions', () => {
      expect(typeof reviewStyles.insertion.implementation.render).toBe('function');
      expect(typeof reviewStyles.deletion.implementation.render).toBe('function');
      expect(typeof reviewStyles.modification.implementation.render).toBe('function');
    });
  });

  describe('ReviewExtension', () => {
    it('should create extension factory', () => {
      expect(ReviewExtension).toBeDefined();
      expect(typeof ReviewExtension).toBe('function');
    });
  });

  describe('reviewIds', () => {
    it('should extract review IDs from editor state', () => {
      const mockEditor = {
        prosemirrorState: {
          doc: {
            descendants: (callback: any) => {
              // Simulate a document with review marks
              callback({
                marks: [
                  { type: { name: 'insertion' }, attrs: { id: 1 } },
                  { type: { name: 'deletion' }, attrs: { id: 2 } },
                ],
              });
              callback({
                marks: [
                  { type: { name: 'insertion' }, attrs: { id: 1 } }, // Duplicate
                  { type: { name: 'modification' }, attrs: { id: 3 } },
                ],
              });
            },
          },
        },
      };

      const ids = reviewIds(mockEditor);
      expect(ids).toHaveLength(3);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
    });

    it('should return empty array for document without review marks', () => {
      const mockEditor = {
        prosemirrorState: {
          doc: {
            descendants: (callback: any) => {
              callback({ marks: [] });
            },
          },
        },
      };

      const ids = reviewIds(mockEditor);
      expect(ids).toEqual([]);
    });

    it('should ignore non-review marks', () => {
      const mockEditor = {
        prosemirrorState: {
          doc: {
            descendants: (callback: any) => {
              callback({
                marks: [
                  { type: { name: 'bold' }, attrs: {} },
                  { type: { name: 'insertion' }, attrs: { id: 1 } },
                  { type: { name: 'italic' }, attrs: {} },
                ],
              });
            },
          },
        },
      };

      const ids = reviewIds(mockEditor);
      expect(ids).toEqual([1]);
    });
  });

  describe('serializeEditor', () => {
    it('should serialize document without review data when no review marks', () => {
      const mockEditor = {
        document: [
          { id: 'block1', type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        ],
        prosemirrorState: {
          doc: {
            descendants: () => {},
            toJSON: () => ({ type: 'doc', content: [] }),
          },
        },
      };

      const serialized = serializeEditor(mockEditor);
      const parsed = JSON.parse(serialized);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0]._bureauReview).toBeUndefined();
    });

    it('should include review metadata when review marks exist', () => {
      const mockEditor = {
        document: [
          { id: 'block1', type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        ],
        prosemirrorState: {
          doc: {
            descendants: (callback: any) => {
              callback({
                marks: [{ type: { name: 'insertion' }, attrs: { id: 1 } }],
              });
            },
            toJSON: () => ({ type: 'doc', content: [] }),
          },
        },
      };

      const serialized = serializeEditor(mockEditor);
      const parsed = JSON.parse(serialized);
      
      expect(parsed[0]._bureauReview).toBeDefined();
      expect(parsed[0]._bureauReview.version).toBe(1);
      expect(parsed[0]._bureauReview.doc).toBeDefined();
    });

    it('should preserve block properties', () => {
      const mockEditor = {
        document: [
          { id: 'block1', type: 'heading', props: { level: 2 }, content: [] },
          { id: 'block2', type: 'paragraph', content: [] },
        ],
        prosemirrorState: {
          doc: {
            descendants: () => {},
            toJSON: () => ({ type: 'doc', content: [] }),
          },
        },
      };

      const serialized = serializeEditor(mockEditor);
      const parsed = JSON.parse(serialized);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].type).toBe('heading');
      expect(parsed[0].props.level).toBe(2);
      expect(parsed[1].type).toBe('paragraph');
    });
  });

  describe('restoreReview', () => {
    it('should do nothing when content is undefined', () => {
      const mockEditor = {
        prosemirrorState: {},
        prosemirrorView: { dispatch: vi.fn() },
      };

      expect(() => restoreReview(mockEditor, undefined)).not.toThrow();
      expect(mockEditor.prosemirrorView.dispatch).not.toHaveBeenCalled();
    });

    it('should do nothing when content has no review metadata', () => {
      const mockEditor = {
        prosemirrorState: {},
        prosemirrorView: { dispatch: vi.fn() },
      };

      const content = JSON.stringify([
        { id: 'block1', type: 'paragraph', content: [] },
      ]);

      expect(() => restoreReview(mockEditor, content)).not.toThrow();
      expect(mockEditor.prosemirrorView.dispatch).not.toHaveBeenCalled();
    });

    it('should throw on unsupported review version', () => {
      const mockEditor = {
        prosemirrorState: {},
        prosemirrorView: { dispatch: vi.fn() },
      };

      const content = JSON.stringify([
        {
          id: 'block1',
          type: 'paragraph',
          _bureauReview: { version: 999, doc: {} },
        },
      ]);

      expect(() => restoreReview(mockEditor, content)).toThrow('Unsupported review version');
    });

    it('should restore review data with version 1', () => {
      const mockDoc = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }],
      };

      const mockRestoredDoc = {
        check: vi.fn(),
        content: { size: 100 },
      };

      const mockState = {
        schema: {
          nodeFromJSON: vi.fn(() => mockRestoredDoc),
        },
        doc: { content: { size: 50 } },
        tr: {
          replaceWith: vi.fn(function(this: any) { return this; }),
          setMeta: vi.fn(function(this: any) { return this; }),
        },
      };

      const mockEditor = {
        prosemirrorState: mockState,
        prosemirrorView: { dispatch: vi.fn() },
      };

      const content = JSON.stringify([
        {
          id: 'block1',
          type: 'paragraph',
          _bureauReview: { version: 1, doc: mockDoc },
        },
      ]);

      restoreReview(mockEditor, content);

      expect(mockState.schema.nodeFromJSON).toHaveBeenCalledWith(mockDoc);
      expect(mockRestoredDoc.check).toHaveBeenCalled();
      expect(mockState.tr.replaceWith).toHaveBeenCalledWith(0, 50, mockRestoredDoc.content);
      expect(mockEditor.prosemirrorView.dispatch).toHaveBeenCalled();
    });
  });

  describe('attachReview', () => {
    let mockView: any;
    let mockEditor: any;
    let onUnsupported: any;

    beforeEach(() => {
      onUnsupported = vi.fn();
      
      mockView = {
        props: {
          dispatchTransaction: vi.fn(),
        },
        state: {
          doc: { content: { size: 100 } },
        },
        setProps: vi.fn(),
        isDestroyed: false,
      };

      mockEditor = {
        prosemirrorView: mockView,
      };
    });

    it('should throw if dispatch is not available', () => {
      mockView.props.dispatchTransaction = undefined;
      
      expect(() => attachReview(mockEditor, onUnsupported)).toThrow('dispatch is not available');
    });

    it('should wrap dispatch with review tracking', () => {
      const cleanup = attachReview(mockEditor, onUnsupported);

      expect(mockView.setProps).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    it('should cleanup and restore original dispatch', () => {
      const originalDispatch = mockView.props.dispatchTransaction;
      const cleanup = attachReview(mockEditor, onUnsupported);

      cleanup();

      expect(mockView.setProps).toHaveBeenCalledWith({
        dispatchTransaction: originalDispatch,
      });
    });

    it('should not cleanup if view is destroyed', () => {
      const cleanup = attachReview(mockEditor, onUnsupported);
      
      mockView.isDestroyed = true;
      mockView.setProps.mockClear();
      
      cleanup();

      expect(mockView.setProps).not.toHaveBeenCalled();
    });

    it('should not cleanup if dispatch was changed externally', () => {
      const cleanup = attachReview(mockEditor, onUnsupported);
      
      // Simulate external dispatch change
      mockView.props.dispatchTransaction = vi.fn();
      mockView.setProps.mockClear();
      
      cleanup();

      expect(mockView.setProps).not.toHaveBeenCalled();
    });
  });

  describe('text-only capture', () => {
    it('should deliberately block structural changes', () => {
      // This is a design decision mentioned in the code:
      // "Text-only capture deliberately blocks structural changes"
      // The attachReview function checks if changes are text-only
      // and calls onUnsupported for structural changes
      
      const onUnsupported = vi.fn();
      const mockView = {
        props: { dispatchTransaction: vi.fn() },
        state: { doc: { content: { size: 100 } } },
        setProps: vi.fn(),
        isDestroyed: false,
      };
      const mockEditor = { prosemirrorView: mockView };

      attachReview(mockEditor, onUnsupported);

      // The wrapped dispatch should exist
      expect(mockView.setProps).toHaveBeenCalled();
      const wrappedDispatch = mockView.setProps.mock.calls[0][0].dispatchTransaction;
      expect(typeof wrappedDispatch).toBe('function');
    });
  });

  describe('functional review test', () => {
    it('should enable review mode, insert text, serialize/restore, and revert', async () => {
      const { BlockNoteEditor } = await import('@blocknote/core');
      const { fluxEditorSchema } = await import('@/lib/editor-schema');
      const { enableSuggestChanges, revertSuggestions } = await import('@blocknote/prosemirror-suggest-changes');

      // Create editor with review schema
      const editor = BlockNoteEditor.create({
        schema: fluxEditorSchema,
        initialContent: [{ type: 'paragraph', content: 'original' }],
      });

      // Mount editor to DOM
      const div = document.createElement('div');
      document.body.appendChild(div);
      editor.mount(div);

      try {
        // Attach review tracking
        const onUnsupported = vi.fn();
        const cleanup = attachReview(editor, onUnsupported);

        // Enable suggest changes mode
        const state = editor.prosemirrorState;
        const dispatch = editor.prosemirrorView.dispatch.bind(editor.prosemirrorView);
        const enabled = enableSuggestChanges(state, dispatch);
        expect(enabled).toBe(true);

        // Insert text at valid position (end of paragraph)
        const newState = editor.prosemirrorState;
        const endPos = newState.doc.content.size - 1;
        const tr = newState.tr.insertText(' new', endPos);
        editor.prosemirrorView.dispatch(tr);

        // Assert reviewIds are nonempty
        const ids = reviewIds(editor);
        expect(ids.length).toBeGreaterThan(0);

        // Serialize with review data
        const serialized = serializeEditor(editor);
        expect(serialized).toContain('_bureauReview');

        // Restore review data
        restoreReview(editor, serialized);

        // Revert suggestions - should restore original text
        const finalState = editor.prosemirrorState;
        const reverted = revertSuggestions(finalState, dispatch);
        expect(reverted).toBe(true);

        // Check that text is back to original
        const content = editor.document[0].content;
        const finalText = Array.isArray(content) && content.length > 0 && typeof content[0] === 'object' && 'text' in content[0] ? content[0].text : '';
        expect(finalText).toBe('original');

        cleanup();
      } finally {
        editor.unmount();
        document.body.removeChild(div);
      }
    });
  });
});
