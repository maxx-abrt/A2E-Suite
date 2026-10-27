# Bureau: selection and bulk actions

[Documentation home](README.md) · [Bureau checklist](BUREAU_PLAN.md)

Choose **Select pages**, or Ctrl/Cmd-click a page, to select several notes.
Shift-click extends the selection across visible expanded page rows. Checkboxes,
Space, Ctrl/Cmd+A, Escape and **Done** support keyboard and pointer workflows.
**Select all** includes collapsed descendants of regular pages; the separate saved
template library is excluded. Templates can still be selected individually.

The selection panel can move pages to Bureau's root or a chosen page, change
reading width/text size, or move pages to the trash. Moving and trashing include
subpages. Appearance changes apply only to explicitly selected pages. Page moves
preserve ordering and nested structure. A parent and selected descendants are
processed as one subtree; destinations inside that subtree are unavailable.

Drag a selected page to move the selected group. Drag a page outside the selection
to move only that page and its subtree. Drop on **Trash** to soft-delete it. The
trash target highlights and stays reachable during a drag; pending rows fade and
shift gently. Reduced-motion preferences disable movement. **Undo** restores the
whole deleted group. Permanent deletion remains an explicit action in Trash.

Operations wait for the complete tree and respect native object permissions.
Repeated drops are guarded before React renders the pending state. A successful
save is required before clearing the selection. Workspace changes reset selection
and drag state.

Bulk mutations use the existing native record APIs, not a new transaction API.
Moves stop on the first failed save and retain the selection for review. Deletes
send children before parents through the existing mutation batching; a failed
batch or incomplete server response reports possible partial completion, refreshes
the tree and offers Undo. Review the tree/trash before retrying after such an error.

Source: [workspace state](../packages/twenty-front/src/modules/bureau/hooks/useBureauWorkspaceValue.ts),
[record actions](../packages/twenty-front/src/modules/bureau/hooks/useBureauPageActions.ts),
[selection controls](../packages/twenty-front/src/modules/bureau/components/BureauBulkActions.tsx)
and [trash target](../packages/twenty-front/src/modules/bureau/components/BureauTrashDropTarget.tsx).
