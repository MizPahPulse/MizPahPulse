/**
 * Component tests for the dashboard stat-card tooltips (issue #10).
 *
 * Renders the real DashboardPage with a stubbed /api/v1/stats response and
 * verifies each stat card exposes an explanation tooltip on hover/focus.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

const ONBOARDING_STEPS_KEY = 'mp-onboarding-steps';
const ONBOARDING_DISMISSED_KEY = 'mp-onboarding-dismissed';

const fetchMock = vi.fn();

const STATS_RESPONSE = {
  success: true,
  data: {
    totalEvents: 12345,
    eventsLast24h: 234,
    uniqueAccounts: 56,
    trackedContracts: 7,
    topAccounts: [
      { accountId: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 128 },
      { accountId: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 96 },
      { accountId: 'GHIJ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 74 },
      { accountId: 'GKLM1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 51 },
      { accountId: 'GNOP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 29 },
    ],
    recentActivity: [],
  },
};

describe('DashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders an explanation control on every stat card', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => STATS_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardPage />);

    // Wait for the stats request to resolve and the cards to render.
    expect(await screen.findByText('Events (24h)')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'About Events (24h)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About Total Events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About Tracked Contracts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About Unique Accounts' })).toBeInTheDocument();
  });

  it('reveals a tooltip with the metric definition on focus', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => STATS_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardPage />);

    const infoButton = await screen.findByRole('button', { name: 'About Events (24h)' });

    // Tooltip appears on keyboard focus (hover uses the same trigger).
    fireEvent.focus(infoButton);

    const tooltip = await screen.findByRole(
      'tooltip',
      { name: /ingested and indexed in the last 24 hours/i },
      { timeout: 2000 },
    );
    expect(tooltip).toBeInTheDocument();
  });

  it('defines a tooltip for each computed metric', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => STATS_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardPage />);

    await screen.findByRole('button', { name: 'About Total Events' });

    fireEvent.focus(screen.getByRole('button', { name: 'About Total Events' }));
    expect(
      await screen.findByRole('tooltip', {
        name: /indexed by MizpahPulse since the indexer went live/i,
      }),
    ).toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: 'About Tracked Contracts' }));
    expect(
      await screen.findByRole('tooltip', { name: /referenced by at least one indexed event/i }),
    ).toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: 'About Unique Accounts' }));
    expect(
      await screen.findByRole('tooltip', { name: /distinct Stellar accounts observed/i }),
    ).toBeInTheDocument();
  });

  it('lists the top five accounts with their event counts (issue #13)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => STATS_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardPage />);

    expect(await screen.findByText('Top Accounts')).toBeInTheDocument();
    expect(screen.getByText('GABC12...WXYZ')).toBeInTheDocument();

    // All five accounts from the API are present, ranked 1-5.
    expect(screen.getByText('128 events')).toBeInTheDocument();
    expect(screen.getByText('96 events')).toBeInTheDocument();
    expect(screen.getByText('74 events')).toBeInTheDocument();
    expect(screen.getByText('51 events')).toBeInTheDocument();
    expect(screen.getByText('29 events')).toBeInTheDocument();
    // Exactly the five account rows render (onboarding steps use the same
    // list-item role, so scope to rows that carry event counts).
    const accountRows = screen
      .getAllByRole('listitem')
      .filter((li) => within(li).queryByText(/\d+ events/));
    expect(accountRows).toHaveLength(5);
  });

  it('copies a full account address from the top-accounts list', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => STATS_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<DashboardPage />);

    const copyButton = await screen.findByRole('button', { name: 'Copy GABC12...WXYZ' });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    });
  });

  it('shows a graceful empty state when there is no account activity', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...STATS_RESPONSE.data, topAccounts: [] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    // A returning user who dismissed onboarding: the checklist stays hidden so
    // the widget is the only list on the page.
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');

    render(<DashboardPage />);

    expect(await screen.findByText(/No account activity recorded yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('DashboardPage onboarding checklist (#19)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockResolvedValue({ ok: true, json: async () => STATS_RESPONSE });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders the checklist with steps linking to the right pages', async () => {
    render(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText('0 of 4 steps complete')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Connect your Freighter wallet' })).toHaveAttribute(
      'href',
      '/dashboard/wallets',
    );
    expect(screen.getByRole('link', { name: 'Watch a wallet' })).toHaveAttribute(
      'href',
      '/dashboard/wallets',
    );
    expect(screen.getByRole('link', { name: 'Create a webhook' })).toHaveAttribute(
      'href',
      '/dashboard/webhooks',
    );
    expect(screen.getByRole('link', { name: 'Invoke the Pulse contract' })).toHaveAttribute(
      'href',
      '/dashboard/contracts',
    );
  });

  it('completing a step updates the progress and persists to localStorage', async () => {
    render(<DashboardPage />);

    const stepButton = await screen.findByRole('button', {
      name: 'Mark Connect your Freighter wallet complete',
    });
    fireEvent.click(stepButton);

    expect(await screen.findByText('1 of 4 steps complete')).toBeInTheDocument();
    expect(stepButton).toHaveAttribute('aria-pressed', 'true');

    // Toggling back off reverts the count.
    fireEvent.click(stepButton);
    expect(await screen.findByText('0 of 4 steps complete')).toBeInTheDocument();

    // Completion is persisted for the next visit.
    fireEvent.click(screen.getByRole('button', { name: 'Mark Create a webhook complete' }));
    await waitFor(() => {
      const saved = JSON.parse(
        window.localStorage.getItem(ONBOARDING_STEPS_KEY) ?? '[]',
      ) as string[];
      expect(saved).toEqual(['create-webhook']);
    });
  });

  it('shows a completion state once every step is done', async () => {
    render(<DashboardPage />);

    const labels = [
      'Connect your Freighter wallet',
      'Watch a wallet',
      'Create a webhook',
      'Invoke the Pulse contract',
    ];
    for (const label of labels) {
      fireEvent.click(await screen.findByRole('button', { name: `Mark ${label} complete` }));
    }

    expect(await screen.findByText(/You\u2019ve completed every step/i)).toBeInTheDocument();
    expect(screen.getByText(/You\u2019re all set/i)).toBeInTheDocument();
  });

  it('dismiss hides the checklist permanently across visits', async () => {
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss getting started' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Getting started' })).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe('true');

    // A fresh visit with the dismissed flag saved stays hidden.
    render(<DashboardPage />);
    expect(
      await waitFor(() => screen.queryByRole('heading', { name: 'Getting started' })),
    ).not.toBeInTheDocument();
  });
});
