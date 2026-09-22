import { act, fireEvent, render, screen } from '@testing-library/react';
import { ScrollToTopButton } from '@/components/shared/ScrollToTopButton';

const mockUsePathname = jest.fn<string, []>();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

const BUTTON_TEST_ID = 'scroll-to-top';

function setWindowScroll(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    value,
    configurable: true,
  });
  act(() => {
    fireEvent.scroll(document);
  });
}

function createScrollContainer(clientHeight: number): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
  container.scrollTo = jest.fn();
  document.body.appendChild(container);
  return container;
}

function scrollContainer(container: HTMLElement, scrollTop: number): void {
  container.scrollTop = scrollTop;
  act(() => {
    fireEvent.scroll(container);
  });
}

describe('ScrollToTopButton', () => {
  const rootScrollTo = jest.fn();

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    rootScrollTo.mockClear();
    document.documentElement.scrollTo = rootScrollTo;
    Object.defineProperty(document, 'scrollingElement', {
      value: document.documentElement,
      configurable: true,
    });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden until the page is scrolled', () => {
    render(<ScrollToTopButton />);

    expect(screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('stays hidden when scrolled less than 300px', () => {
    render(<ScrollToTopButton />);

    setWindowScroll(300);

    expect(screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('appears after scrolling past 300px and hides again at the top', () => {
    render(<ScrollToTopButton />);

    setWindowScroll(500);
    expect(screen.getByTestId(BUTTON_TEST_ID)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /scroll to top/i })
    ).toBeVisible();

    setWindowScroll(0);
    expect(screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('smoothly scrolls the window back to the top when clicked', () => {
    render(<ScrollToTopButton />);
    setWindowScroll(800);

    fireEvent.click(screen.getByTestId(BUTTON_TEST_ID));

    expect(rootScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('tracks a large inner scroll container such as the dashboard main area', () => {
    render(<ScrollToTopButton />);
    const container = createScrollContainer(window.innerHeight);

    scrollContainer(container, 600);
    fireEvent.click(screen.getByTestId(BUTTON_TEST_ID));

    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
    expect(rootScrollTo).not.toHaveBeenCalled();
  });

  it('ignores small scrollable widgets like dropdown lists', () => {
    render(<ScrollToTopButton />);
    const dropdown = createScrollContainer(100);

    scrollContainer(dropdown, 600);

    expect(screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('resets to hidden when navigating to another page', () => {
    const { rerender } = render(<ScrollToTopButton />);
    setWindowScroll(700);
    expect(screen.getByTestId(BUTTON_TEST_ID)).toBeInTheDocument();

    mockUsePathname.mockReturnValue('/articles');
    rerender(<ScrollToTopButton />);

    expect(screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('stops listening for scroll events once unmounted', () => {
    const { unmount } = render(<ScrollToTopButton />);
    unmount();

    setWindowScroll(900);

    expect(screen.queryByTestId(BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
