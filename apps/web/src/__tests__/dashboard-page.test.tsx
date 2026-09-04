/**
 * Component tests for the dashboard stat-card tooltips (issue #10).
 *
 * Renders the real DashboardPage with a stubbed /api/v1/stats response and
 * verifies each stat card exposes an explanation tooltip on hover/focus.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

const fetchMock = vi.fn();

const STATS_RESPONSE = {
  success: true,
  data: {
    totalEvents: 12345,
    eventsLast24h: 234,
    uniqueAccounts: 56,
    trackedContracts: 7,
    recentActivity: [],
  },
};

describe('DashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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
});
