import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { SelectionProvider } from './context/SelectionContext';
import { placeholderWords } from './data/placeholderWords';

describe('App scaffolding', () => {
  const renderWithProvider = (initialWordId: string | null = placeholderWords[0]?.id ?? null) =>
    render(
      <SelectionProvider initialWordId={initialWordId}>
        <App />
      </SelectionProvider>,
    );

  it('displays the primary layout sections', () => {
    renderWithProvider();

    expect(screen.getByRole('heading', { name: /EtymoSphere/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Search/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tree view/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tools/i })).toBeInTheDocument();
  });

  it('selects the top match when submitting the search form', async () => {
    const user = userEvent.setup();
    renderWithProvider(null);

    const input = screen.getByRole('searchbox', { name: /Search for a word/i });
    await user.type(input, 'italic');

    const submitButton = screen.getByRole('button', { name: /Select top match/i });
    await user.click(submitButton);

    const selectionAnnouncement = screen.getByText('Selected word:', { exact: false });
    expect(selectionAnnouncement).toHaveTextContent(/lumen/i);
    expect(screen.getAllByText(/Classical Latin noun/i)[0]).toBeInTheDocument();
  });

  it('allows selecting a suggestion to update the preview panes', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    const input = screen.getByRole('searchbox', { name: /Search for a word/i });
    await user.clear(input);
    await user.type(input, 'echo');

    const suggestion = await screen.findByRole('option', { name: /ēkhō/i });
    await user.click(suggestion);

    expect(
      screen.getAllByText(/Onomatopoetic Proto-Indo-European base connected with sound/i)[0],
    ).toBeInTheDocument();
  });
});
