import { fireEvent, render, screen } from '@testing-library/react';

import { useSidePanelTabOpenIntentHandlers } from '@/side-panel/tabs/hooks/useSidePanelTabOpenIntentHandlers';

// `fireEvent.auxClick` is not exposed by this testing-library version, so the
// native event is dispatched the way a browser would.
const fireAuxClick = (element: HTMLElement, button: number) => {
  const auxClickEvent = new MouseEvent('auxclick', {
    button,
    bubbles: true,
    cancelable: true,
  });

  fireEvent(element, auxClickEvent);

  return auxClickEvent;
};

const TestSurface = ({
  onOpenInTab,
  onDefaultOpen,
  isEnabled = true,
}: {
  onOpenInTab: () => void;
  onDefaultOpen: () => void;
  isEnabled?: boolean;
}) => {
  const openInTabHandlers = useSidePanelTabOpenIntentHandlers({
    onOpenInTab,
    isEnabled,
  });

  return (
    <div
      data-testid="surface"
      onMouseDownCapture={openInTabHandlers.onMouseDownCapture}
      onAuxClickCapture={openInTabHandlers.onAuxClickCapture}
    >
      {/* Mirrors Twenty surfaces that open on mousedown of a descendant. */}
      <button type="button" data-testid="inner" onMouseDown={onDefaultOpen}>
        Airbnb
      </button>
    </div>
  );
};

describe('useSidePanelTabOpenIntentHandlers', () => {
  it('opens a tab on middle-click and suppresses the normal open', () => {
    const onOpenInTab = jest.fn();
    const onDefaultOpen = jest.fn();

    render(
      <TestSurface onOpenInTab={onOpenInTab} onDefaultOpen={onDefaultOpen} />,
    );

    const inner = screen.getByTestId('inner');

    fireEvent.mouseDown(inner, { button: 1 });
    fireAuxClick(inner, 1);

    expect(onOpenInTab).toHaveBeenCalledTimes(1);
    expect(onDefaultOpen).not.toHaveBeenCalled();
  });

  it('leaves a primary click on its historical path', () => {
    const onOpenInTab = jest.fn();
    const onDefaultOpen = jest.fn();

    render(
      <TestSurface onOpenInTab={onOpenInTab} onDefaultOpen={onDefaultOpen} />,
    );

    const inner = screen.getByTestId('inner');

    fireEvent.mouseDown(inner, { button: 0 });

    expect(onDefaultOpen).toHaveBeenCalledTimes(1);
    expect(onOpenInTab).not.toHaveBeenCalled();
  });

  it('ignores the right button', () => {
    const onOpenInTab = jest.fn();
    const onDefaultOpen = jest.fn();

    render(
      <TestSurface onOpenInTab={onOpenInTab} onDefaultOpen={onDefaultOpen} />,
    );

    fireAuxClick(screen.getByTestId('inner'), 2);

    expect(onOpenInTab).not.toHaveBeenCalled();
  });

  it('is inert when disabled', () => {
    const onOpenInTab = jest.fn();
    const onDefaultOpen = jest.fn();

    render(
      <TestSurface
        onOpenInTab={onOpenInTab}
        onDefaultOpen={onDefaultOpen}
        isEnabled={false}
      />,
    );

    const inner = screen.getByTestId('inner');

    fireEvent.mouseDown(inner, { button: 1 });
    fireAuxClick(inner, 1);

    expect(onOpenInTab).not.toHaveBeenCalled();
    expect(onDefaultOpen).toHaveBeenCalledTimes(1);
  });

  it('prevents the browser from hijacking a middle-click on a link', () => {
    const onOpenInTab = jest.fn();

    render(<TestSurface onOpenInTab={onOpenInTab} onDefaultOpen={jest.fn()} />);

    const auxClickEvent = fireAuxClick(screen.getByTestId('inner'), 1);

    expect(auxClickEvent.defaultPrevented).toBe(true);
  });
});
