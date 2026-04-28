import type { Badges, SubMethod } from 'tmi.js';
import { getEmoteAsUrl, parseEmotesInMessage } from 'tmi-utils';
import { twitchRequest } from '@/services/twitch-auth.service';
import { STREAM_TOGETHER_COLORS } from '../constants/stream-together-colors.constant';

interface TwitchUsersResponse {
  data: Array<{
    id: string;
    display_name: string;
    profile_image_url: string;
  }>;
}

export async function getUserIdByUserName(username: string): Promise<string | undefined> {
  try {
    const data = await twitchRequest<TwitchUsersResponse>(`https://api.twitch.tv/helix/users?login=${username}`, {
      method: 'GET',
    }, 10);
    return data?.data?.[0]?.id;
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
      return undefined;
    }
    throw error;
  }
}

export async function getUserNameByUserId(userId: string): Promise<string | undefined> {
  try {
    const data = await twitchRequest<TwitchUsersResponse>(`https://api.twitch.tv/helix/users?id=${userId}`, {
      method: 'GET',
    }, 10);
    return data?.data?.[0]?.display_name;
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
      return undefined;
    }
    throw error;
  }
}

// TODO set date of store and reload image after a certain time
export async function getUserImageByUserId(userId: string): Promise<string> {
  const cachedImages: string | { [userId: string]: string } | null = window.sessionStorage.getItem('user-avatars');
  const storedImages: { [userId: string]: string } = cachedImages ? JSON.parse(cachedImages) : {};

  let userImage = storedImages?.[userId];
  if (!userImage) {
    try {
      const data = await twitchRequest<TwitchUsersResponse>(`https://api.twitch.tv/helix/users?id=${userId}`, {
        method: 'GET',
      }, 10);
      storedImages[userId] = data?.data?.[0]?.profile_image_url ?? undefined;
      if (storedImages[userId]) {
        userImage = storedImages[userId];
        window.sessionStorage.setItem('user-avatars', JSON.stringify(storedImages));
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_RECENTLY_MADE_BY_OTHER_INSTANCE') {
        return 'https://picsum.photos/40';
      }
      throw error;
    }
  }
  return userImage ?? 'https://picsum.photos/40';
}

export function parseMessage(emotes: { [emoteid: string]: string[] } | undefined, text: string, theme: 'dark' | 'light' = 'dark', scale: '1.0' | '2.0' | '3.0' = '1.0') {
  const messageParts: Record<string, string | undefined>[] = [];
  for (const messagePart of parseEmotesInMessage(emotes as Record<string, string[]>, text)) {
    messageParts.push({
      raw: messagePart.raw,
      type: messagePart.type,
      value: messagePart.type === 'emote' ? getEmoteAsUrl(messagePart.value, theme, scale) : messagePart.value,
    });
  }
  return messageParts;
}

export function parseUserBadges(
  userBadges: Badges,
  availableBadges: Record<string, { description: string; id: string; imageUrl: string; title: string }[]>,
): { description: string; id: string; imageUrl: string; title: string }[] {
  const badges: { description: string; id: string; imageUrl: string; title: string }[] = [];
  for (const [key, value] of Object.entries(userBadges)) {
    // Defensive check: skip if badge type doesn't exist in availableBadges
    if (!availableBadges[key]) {
      console.warn(`Badge type '${key}' not found in availableBadges. This may be due to failed API requests.`);
      continue;
    }

    const badge = availableBadges[key].find(badge => badge.id === value);
    if (badge) {
      badges.push(badge);
    }
  }
  return badges;
}

export function parsePlan(plan?: SubMethod): number | 'Prime' | undefined {
  if (!plan || plan === 'Prime') {
    return plan;
  }
  return Number.parseInt(plan.substring(0, 1), 10);
}

export function parseChannelName(channel: string): string {
  return channel.replace('#', '');
}

export function getStreamTogetherColor(channelName: string, streamTogetherChannels: string[]): string {
  const index = streamTogetherChannels.indexOf(channelName);
  return index >= 0 ? STREAM_TOGETHER_COLORS[index % STREAM_TOGETHER_COLORS.length] : STREAM_TOGETHER_COLORS[0];
}

export function hexToRgb(hex: string): [number, number, number] | null {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    const r = Number.parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = Number.parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = Number.parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }

  // Handle 6-digit hex
  if (cleanHex.length === 6) {
    const r = Number.parseInt(cleanHex.substring(0, 2), 16);
    const g = Number.parseInt(cleanHex.substring(2, 4), 16);
    const b = Number.parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
  }

  return null;
}

/**
 * Chooses either a dark or light text stroke color based on
 * the perceived brightness of the provided hex color.
 */
export function getReadableStrokeColor(hex: string, darkColor = '#111111', lightColor = '#ffffff'): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return darkColor;
  }

  const [r, g, b] = rgb;

  // Relative luminance approximation (0 = black, 255 = white)
  const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);

  // Bright usernames get a dark stroke, dark usernames get a light stroke.
  return luminance >= 140 ? darkColor : lightColor;
}
