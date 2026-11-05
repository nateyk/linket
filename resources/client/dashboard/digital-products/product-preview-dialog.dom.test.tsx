/**
 * @vitest-environment jsdom
 */
import {useState} from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test} from 'vitest';
import {Button} from '@shadcn/button/button';
import {ProductPreviewDialog} from './product-preview-dialog';

function PreviewHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Preview</Button>
      <ProductPreviewDialog open={open} onOpenChange={setOpen}>
        <p>Sample buyer-facing information</p>
      </ProductPreviewDialog>
    </>
  );
}

describe('on-demand Product preview dialog', () => {
  test('does not display buyer content until Preview opens', async () => {
    const user = userEvent.setup();
    render(<PreviewHarness />);
    expect(screen.queryByText('Sample buyer-facing information')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    expect(screen.getByRole('dialog', {name: 'Customer preview'})).not.toBeNull();
    expect(screen.getByText('Sample buyer-facing information')).not.toBeNull();
    expect(screen.getByText(/Buying and downloading are unavailable/)).not.toBeNull();
  });

  test('Escape closes the dialog and returns focus to Preview', async () => {
    const user = userEvent.setup();
    render(<PreviewHarness />);
    const openButton = screen.getByRole('button', {name: 'Preview'});
    await user.click(openButton);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', {name: 'Customer preview'})).toBeNull();
    expect(document.activeElement).toBe(openButton);
  });
});
