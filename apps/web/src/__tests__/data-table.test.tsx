import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataTable } from '@mizpah-pulse/ui';
import type { DataTableColumn } from '@mizpah-pulse/ui';

/**
 * Component tests for the responsive DataTable (issue #22):
 *  - accessible table markup (caption, th scope) with sortable headers
 *  - mobile stacked-card markup is present and reflects the same rows
 */

interface Row {
  id: string;
  name: string;
  invocations: number;
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha', invocations: 10 },
  { id: 'b', name: 'Beta', invocations: 30 },
  { id: 'c', name: 'Gamma', invocations: 20 },
];

const columns: DataTableColumn<Row>[] = [
  { header: 'Name', cell: (r) => r.name },
  {
    header: 'Invocations',
    sortValue: (r) => r.invocations,
    className: 'text-right',
    cell: (r) => r.invocations,
  },
];

function renderTable() {
  return render(
    <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} caption="Test data" />,
  );
}

describe('DataTable', () => {
  it('renders accessible table markup with caption and column headers', () => {
    renderTable();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Test data')).toBeInTheDocument();

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    expect(nameHeader).toHaveAttribute('scope', 'col');

    // Rows from the fixture are present.
    expect(screen.getByRole('row', { name: /Alpha/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Gamma/ })).toBeInTheDocument();
    // The caption is visually hidden but present.
    expect(table.querySelector('caption')).not.toBeNull();
  });

  it('includes the mobile stacked-card list alongside the table', () => {
    const { container } = renderTable();

    // Mobile cards render each row as a definition list with the headers.
    const list = container.querySelector('ul[aria-label="Test data"]');
    expect(list).not.toBeNull();
    expect(within(list as HTMLElement).getAllByText('Invocations').length).toBeGreaterThan(0);
    expect(within(list as HTMLElement).getByText('Alpha')).toBeInTheDocument();
    expect(within(list as HTMLElement).getByText('Beta')).toBeInTheDocument();
  });

  it('sorts by a column when its header is clicked and exposes aria-sort', () => {
    renderTable();

    const header = screen.getByRole('columnheader', { name: /Invocations/ });
    const sortButton = within(header).getByRole('button', { name: /Invocations/ });

    // Default row order follows the fixture.
    const firstRowNames = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);

    expect(firstRowNames()).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(header).not.toHaveAttribute('aria-sort');

    // First click: ascending sort → Alpha (10), Gamma (20), Beta (30).
    fireEvent.click(sortButton);
    expect(firstRowNames()).toEqual(['Alpha', 'Gamma', 'Beta']);
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    // Second click: descending sort.
    fireEvent.click(sortButton);
    expect(firstRowNames()).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('renders plain (non-sortable) headers without a button', () => {
    renderTable();

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    expect(within(nameHeader).queryByRole('button')).not.toBeInTheDocument();
  });
});
