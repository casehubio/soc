import { describe, it, expect, afterEach } from 'vitest';
import './channel-member-panel.js';
import type { ChannelMember, PresenceState } from './types.js';

describe('agency-channel-member-panel', () => {
  let element: HTMLElement;

  afterEach(() => { element?.remove(); });

  it('renders member list sorted by presence', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [
      { channelId: 'c1', memberId: 'm1', displayName: 'Alice', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm2', displayName: 'Bob', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm3', displayName: 'Charlie', role: 'PARTICIPANT' },
    ] satisfies ChannelMember[];
    (element as any).presence = [
      { memberId: 'm1', status: 'OFFLINE' },
      { memberId: 'm2', status: 'ONLINE' },
      { memberId: 'm3', status: 'AWAY' },
    ] satisfies PresenceState[];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const items = element.shadowRoot!.querySelectorAll('.member-item');
    const names = Array.from(items).map(i => i.querySelector('.member-name')?.textContent?.trim());
    expect(names).toEqual(['Bob', 'Charlie', 'Alice']);
  });

  it('shows pages-status-dot with correct variants', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [
      { channelId: 'c1', memberId: 'm1', displayName: 'Online', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm2', displayName: 'Away', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm3', displayName: 'Offline', role: 'PARTICIPANT' },
    ];
    (element as any).presence = [
      { memberId: 'm1', status: 'ONLINE' },
      { memberId: 'm2', status: 'AWAY' },
      { memberId: 'm3', status: 'OFFLINE' },
    ];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const dots = element.shadowRoot!.querySelectorAll('pages-status-dot');
    expect(dots[0]!.getAttribute('variant')).toBe('success');
    expect(dots[1]!.getAttribute('variant')).toBe('warning');
    expect(dots[2]!.getAttribute('variant')).toBe('neutral');
  });

  it('shows role badges for MODERATOR and OBSERVER', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [
      { channelId: 'c1', memberId: 'm1', displayName: 'Mod', role: 'MODERATOR' },
      { channelId: 'c1', memberId: 'm2', displayName: 'Obs', role: 'OBSERVER' },
      { channelId: 'c1', memberId: 'm3', displayName: 'Part', role: 'PARTICIPANT' },
    ];
    (element as any).presence = [
      { memberId: 'm1', status: 'ONLINE' },
      { memberId: 'm2', status: 'ONLINE' },
      { memberId: 'm3', status: 'ONLINE' },
    ];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const badges = element.shadowRoot!.querySelectorAll('.role-badge');
    expect(badges[0]!.textContent).toBe('🛡️');
    expect(badges[1]!.textContent).toBe('👁️');
    expect(badges[2]!.textContent).toBe('');
  });

  it('groups under section headers', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [
      { channelId: 'c1', memberId: 'm1', displayName: 'A', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm2', displayName: 'B', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm3', displayName: 'C', role: 'PARTICIPANT' },
    ];
    (element as any).presence = [
      { memberId: 'm1', status: 'ONLINE' },
      { memberId: 'm2', status: 'AWAY' },
      { memberId: 'm3', status: 'OFFLINE' },
    ];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const headers = element.shadowRoot!.querySelectorAll('.section-header');
    expect(headers.length).toBe(3);
    expect(headers[0]!.textContent?.trim()).toBe('Online');
    expect(headers[1]!.textContent?.trim()).toBe('Away');
    expect(headers[2]!.textContent?.trim()).toBe('Offline');
  });

  it('handles empty member list', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [];
    (element as any).presence = [];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const emptyState = element.shadowRoot!.querySelector('.empty-state');
    expect(emptyState?.textContent?.trim()).toBe('No members');
  });

  it('members without presence default to OFFLINE', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [
      { channelId: 'c1', memberId: 'm1', displayName: 'Alice', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm2', displayName: 'Bob', role: 'PARTICIPANT' },
    ];
    (element as any).presence = [{ memberId: 'm1', status: 'ONLINE' }];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const names = Array.from(element.shadowRoot!.querySelectorAll('.member-item'))
      .map(i => i.querySelector('.member-name')?.textContent?.trim());
    expect(names).toEqual(['Alice', 'Bob']);

    const dots = element.shadowRoot!.querySelectorAll('pages-status-dot');
    expect(dots[0]!.getAttribute('variant')).toBe('success');
    expect(dots[1]!.getAttribute('variant')).toBe('neutral');
  });

  it('shows status message when present', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [{ channelId: 'c1', memberId: 'm1', displayName: 'Alice', role: 'PARTICIPANT' }];
    (element as any).presence = [{ memberId: 'm1', status: 'BUSY', statusMessage: 'In a meeting' }];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    expect(element.shadowRoot!.querySelector('.status-message')?.textContent?.trim()).toBe('In a meeting');
  });

  it('sorts alphabetically within same group', async () => {
    element = document.createElement('agency-channel-member-panel') as any;
    (element as any).members = [
      { channelId: 'c1', memberId: 'm1', displayName: 'Charlie', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm2', displayName: 'Alice', role: 'PARTICIPANT' },
      { channelId: 'c1', memberId: 'm3', displayName: 'Bob', role: 'PARTICIPANT' },
    ];
    (element as any).presence = [
      { memberId: 'm1', status: 'ONLINE' },
      { memberId: 'm2', status: 'ONLINE' },
      { memberId: 'm3', status: 'ONLINE' },
    ];
    document.body.appendChild(element);
    await (element as any).updateComplete;

    const names = Array.from(element.shadowRoot!.querySelectorAll('.member-item'))
      .map(i => i.querySelector('.member-name')?.textContent?.trim());
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
