export function preloadImage(src: string): Promise<void> {
  if (!src) {
    return Promise.reject(new Error('Image source is required'));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Image "${src}" failed to load`));
    img.src = src;
  });
}

interface AvatarMetadataResponse {
  avatarVersion: string;
}

function buildToastereiUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path, normalizedBaseUrl).toString();
}

export async function getVersionedToastereiAvatarUrl(baseUrl: string, userId: string): Promise<string | undefined> {
  const encodedUserId = encodeURIComponent(userId);
  const metadataUrl = buildToastereiUrl(baseUrl, `v1/avatars/${encodedUserId}/metadata`); // avatars controller is versioned

  const response = await fetch(metadataUrl, {
    cache: 'no-cache',
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch avatar metadata for "${userId}"`);
  }

  const { avatarVersion } = await response.json() as AvatarMetadataResponse;
  const avatarUrl = buildToastereiUrl(baseUrl, `avatars/${encodedUserId}.png`); // static avatars directory is not versioned
  const versionedAvatarUrl = new URL(avatarUrl);
  versionedAvatarUrl.searchParams.set('v', avatarVersion);

  return versionedAvatarUrl.toString();
}
