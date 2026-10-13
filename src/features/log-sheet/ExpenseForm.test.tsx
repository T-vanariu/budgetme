import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Category } from '@/types/domain';
import { ExpenseForm, validateExpense } from './ExpenseForm';

const categories: Category[] = [
  { id: 'c1', name: 'Groceries', bucket: 'need', icon: '', isDefault: true },
  { id: 'c2', name: 'Eating out', bucket: 'want', icon: '', isDefault: true },
  { id: 'c3', name: 'Savings', bucket: 'savings', icon: '', isDefault: true },
];

describe('ExpenseForm', () => {
  it('shows inline errors with role=alert and aria-invalid', async () => {
    const onSubmit = vi.fn();
    render(<ExpenseForm categories={categories} submitLabel="Save" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toContain('Enter an amount.');
    expect(alerts).toContain('Pick a category.');
    expect(screen.getByLabelText('Amount (K)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits amount, category and merchant in toea', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ExpenseForm categories={categories} submitLabel="Save" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Amount (K)'), '1,234.5');
    await userEvent.click(screen.getByRole('radio', { name: 'Groceries' }));
    await userEvent.type(screen.getByLabelText('Merchant (optional)'), 'Papindo');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 123450, categoryId: 'c1', merchant: 'Papindo', goalId: null }));
  });

  it('rejects letters, zero and amounts over the cap', async () => {
    render(<ExpenseForm categories={categories} submitLabel="Save" onSubmit={vi.fn()} />);
    const amount = screen.getByLabelText('Amount (K)');
    for (const [input, msg] of [
      ['abc', 'Use numbers only'],
      ['0', 'more than zero'],
      ['100000.01', 'for one entry'],
    ]) {
      await userEvent.clear(amount);
      await userEvent.type(amount, input);
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent(msg);
    }
  });

  it('offers "Apply to goal?" only for Savings + debt categories', async () => {
    render(<ExpenseForm categories={categories} goals={[{ id: 'g1', title: 'Laptop' }]} submitLabel="Save" onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText('Apply to goal?')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Savings' }));
    expect(screen.getByLabelText('Apply to goal?')).toBeInTheDocument();
  });
});

describe('validateExpense', () => {
  it('refuses future dates', () => {
    const r = validateExpense({ amount: '5', categoryId: 'c1', merchant: '', date: '2026-10-13' }, '2026-10-12');
    expect(r).toEqual({ ok: false, errors: { date: "Date can't be in the future." } });
  });
  it('trims merchant to null when blank', () => {
    const r = validateExpense({ amount: '5', categoryId: 'c1', merchant: '  ', date: '2026-10-12' }, '2026-10-12');
    expect(r).toEqual({ ok: true, values: { amount: 500, categoryId: 'c1', merchant: null, date: '2026-10-12' } });
  });
});
