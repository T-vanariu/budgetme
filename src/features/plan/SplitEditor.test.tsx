import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SplitEditor } from './SplitEditor';
import { totalHint } from './SplitSliders';

describe('SplitEditor', () => {
  it('Apply is disabled until something changes', () => {
    render(<SplitEditor current={[50, 30, 20]} onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('enables Apply for a preset that totals 100 and applies it', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(<SplitEditor current={[50, 30, 20]} onApply={onApply} />);
    await userEvent.click(screen.getByRole('radio', { name: '60/20/20' }));
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toBeEnabled();
    await userEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith([60, 20, 20]);
  });

  it('disables Apply and says how many points to remove when over 100', async () => {
    render(<SplitEditor current={[50, 30, 20]} onApply={vi.fn()} />);
    const needs = screen.getByRole('slider', { name: 'Needs percent' });
    needs.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('Total 101%. Remove 1 point.');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('says how many points to add when under 100', async () => {
    render(<SplitEditor current={[50, 30, 20]} onApply={vi.fn()} />);
    const wants = screen.getByRole('slider', { name: 'Wants percent' });
    wants.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Total 97%. Add 3 points.');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });
});

describe('totalHint', () => {
  it('reads well at each state', () => {
    expect(totalHint(100)).toBe('Total 100%. Ready to apply.');
    expect(totalHint(99)).toBe('Total 99%. Add 1 point.');
    expect(totalHint(110)).toBe('Total 110%. Remove 10 points.');
  });
});
