import type {
  AnonSubMysteryGiftUserstate,
  BanUserstate,
  ChatUserstate,
  Client,
  DeleteUserstate,
  SubGiftUpgradeUserstate,
  SubGiftUserstate,
  SubMethods,
  SubMysteryGiftUserstate,
  SubUserstate,
  TimeoutUserstate,
} from 'tmi.js';
import type { Ref } from 'vue';
import type {
  IAction,
  IChat,
  IRaid,
  IResub,
  ISubGift,
  ISubscription,
  ITwitchBadgeResponse,
} from '@/common/interfaces/index.interface';
import { storeToRefs } from 'pinia';
import {
  client as tmiClient,
} from 'tmi.js';
import { onBeforeUnmount, ref } from 'vue';
import { getUserIdByUserName, getUserImageByUserId, getUserNameByUserId, parseChannelName, parsePlan } from '@/common/helpers/twitch-message.helper';
import { useSearchParamsComposable } from '@/composables/search-params.composable';
import { ensureAuthForRoute, twitchRequest } from '@/services/twitch-auth.service';
import { useTwitchStore } from '@/stores/twitch.store';

export const broadcasterInfo = {
  id: import.meta.env.VITE_TWITCH_BROADCASTER_ID,
  name: import.meta.env.VITE_TWITCH_BROADCASTER_NAME,
};

let client: Client | null = null;
let viewerCountInterval: number | null = null;
let validateTokenInterval: number | null = null;

async function setUpBadges(
  streamTogetherChannelIds: Ref<{ [channel: string]: string }>,
  streamTogetherChannels: Ref<string[]>,
): Promise<Record<string, { description: string; id: string; imageUrl: string; title: string }[]>> {
  const badgePromises = [
    twitchRequest<ITwitchBadgeResponse>(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterInfo.id}`, {
      method: 'GET',
    }, 10),
    twitchRequest<ITwitchBadgeResponse>('https://api.twitch.tv/helix/chat/badges/global', {
      method: 'GET',
    }, 10),
  ];

  if (Object.keys(streamTogetherChannelIds.value).length > 0) {
    for (const channelId of Object.values(streamTogetherChannelIds.value)) {
      badgePromises.push(twitchRequest<ITwitchBadgeResponse>(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelId}`, {
        method: 'GET',
      }, 10));
    }
  }

  // Use Promise.allSettled to handle cross-instance cache hits gracefully
  const results = await Promise.allSettled(badgePromises);

  // Extract results, providing empty data for failed requests
  const chatBadgesResponse = results[0].status === 'fulfilled'
    ? results[0].value
    : { data: [] } as ITwitchBadgeResponse;

  const globalChatBadgesResponse = results[1].status === 'fulfilled'
    ? results[1].value
    : { data: [] } as ITwitchBadgeResponse;

  const channelChatBadgesResponses = results.slice(2).map(result =>
    result.status === 'fulfilled'
      ? result.value
      : { data: [] } as ITwitchBadgeResponse,
  );

  const availableBadges: Record<string, { description: string; id: string; imageUrl: string; title: string }[]> = {};

  // Process global badges
  for (const set of globalChatBadgesResponse.data) {
    availableBadges[set.set_id] = set.versions.map(version => ({
      description: version.description,
      id: version.id,
      imageUrl: version.image_url_1x,
      title: version.title,
    }));
  }

  // Process broadcaster badges - these override global badges
  for (const set of chatBadgesResponse.data) {
    availableBadges[set.set_id] = set.versions.map(version => ({
      description: version.description,
      id: version.id,
      imageUrl: version.image_url_1x,
      title: version.title,
    }));
  }

  // Process other channels' badges with channel prefix to keep them distinct
  for (let i = 0; i < channelChatBadgesResponses.length; i++) {
    const channelId = streamTogetherChannels.value[i];
    for (const set of channelChatBadgesResponses[i].data) {
      const key = `${channelId}_${set.set_id}`;
      availableBadges[key] = set.versions.map(version => ({
        description: version.description,
        id: version.id,
        imageUrl: version.image_url_1x,
        title: version.title,
      }));
    }
  }
  return availableBadges;
}

async function setUpTwitchChatClient(
  availableBadges: Record<string, { description: string; id: string; imageUrl: string; title: string }[]>,
  debug: boolean,
  loadProfilePicture: boolean,
  userImageRef: Ref<string>,
  addMessage: (message: IAction | IChat | IRaid | IResub | ISubGift | ISubscription) => void,
  removeMessagesByUserId: (userId: string) => void,
  clearMessages: (channel: string) => void,
  removeMessageByMessageId: (id: string) => void,
  viewers: Ref<number>,
  streamTogetherChannelIds: Ref<{ [channel: string]: string }>,
): Promise<void> {
  const channels = [broadcasterInfo.name];
  if (debug) {
    channels.push(import.meta.env.VITE_TWITCH_DEBUG_CHANNEL);
  }

  if (client) {
    await client.disconnect();
  }

  // eslint-disable-next-line new-cap
  client = new tmiClient({
    channels,
    options: { debug },
  });

  if (!client) {
    console.error('No client!');
    return;
  }

  await client.connect();

  client.on('action', async (channel: string, userstate: ChatUserstate, message: string, self: boolean) => {
    const parsedChannel = parseChannelName(channel);
    if (self || parsedChannel !== broadcasterInfo.name) {
      return;
    }
    const {
      badges: userBadges,
      color,
      'display-name': displayName,
      emotes,
      id,
      'msg-id': msgId,
      'tmi-sent-ts': timestamp,
      'user-id': userId,
      username: userName,
    } = userstate;

    if (!userId) {
      return;
    }

    if (loadProfilePicture) {
      userImageRef.value = await getUserImageByUserId(userId);
    }

    addMessage({
      availableBadges,
      channel: parsedChannel,
      color,
      displayName,
      emotes,
      id,
      msgId,
      msgType: 'action',
      show: true,
      text: message,
      timestamp: timestamp ? Number.parseInt(timestamp, 10) : undefined,
      userBadges,
      userId,
      userImage: userImageRef.value,
      userName,
      viewerCount: viewers.value,
    } as IAction);
  });

  client.on('anonsubmysterygift', (_channel: string, numbOfSubs: number, methods: SubMethods, userstate: AnonSubMysteryGiftUserstate) => {
    console.info('anonsubmysterygift', { _channel, numbOfSubs, methods, userstate });
  });

  client.on('ban', async (_channel: string, username: string, reason: string, userstate: BanUserstate) => {
    if (userstate['target-user-id']) {
      removeMessagesByUserId(userstate['target-user-id']);
    }
  });

  // test with stesi
  client.on('cheer', async (_channel: string, userstate: ChatUserstate, message: string) => {
    console.info('cheer', { _channel, userstate, message });
  });

  client.on('chat', async (channel: string, userstate: ChatUserstate, message: string, self: boolean) => {
    if (self) {
      return;
    }

    let channelToUse = channel;

    const {
      'animation-id': animationId,
      badges: userBadges,
      color,
      'display-name': displayName,
      emotes,
      id,
      'msg-id': msgId = undefined,
      'tmi-sent-ts': timestamp,
      'user-id': userId,
      username: userName,
    } = userstate;

    if (!userId) {
      return;
    }

    if (loadProfilePicture) {
      userImageRef.value = await getUserImageByUserId(userId);
    }

    // stream together shared chats have different room ids for the source and target
    // if the source room id is different from the target room id, we need to use the source user name
    if (userstate['source-room-id'] && userstate['source-room-id'] !== userstate['room-id']) {
      channelToUse = await getUserNameByUserId(userstate['source-room-id']) ?? channel;
    }

    const parsedChannel = parseChannelName(channelToUse);
    let channelImage;
    if (parsedChannel !== broadcasterInfo.name && streamTogetherChannelIds.value[parsedChannel]) {
      channelImage = await getUserImageByUserId(streamTogetherChannelIds.value[parsedChannel]);
    }

    addMessage({
      animationId,
      availableBadges,
      channel: parsedChannel,
      channelImage,
      color,
      displayName,
      emotes,
      id,
      msgId,
      msgType: 'chat',
      show: true,
      text: message,
      timestamp: timestamp ? Number.parseInt(timestamp, 10) : undefined,
      userBadges,
      userId,
      userImage: userImageRef.value,
      userName,
      viewerCount: viewers.value,
    } as IChat);
  });

  client.on('clearchat', (channel: string) => {
    clearMessages(parseChannelName(channel));
  });

  client.on('giftpaidupgrade', (_channel: string, username: string, sender: string, userstate: SubGiftUpgradeUserstate) => {
    console.info('giftpaidupgrade', { _channel, username, sender, userstate });
  });

  client.on('messagedeleted', (_channel: string, _username: string, _deletedMessage: string, userstate: DeleteUserstate) => {
    if (userstate['target-msg-id']) {
      removeMessageByMessageId(userstate['target-msg-id']);
    }
  });

  client.on('raided', async (channel: string, username: string, viewers: number) => {
    const parsedChannel = parseChannelName(channel);
    if (parsedChannel !== broadcasterInfo.name) {
      return;
    }

    const userId = await getUserIdByUserName(username);
    if (loadProfilePicture) {
      if (userId) {
        userImageRef.value = await getUserImageByUserId(userId);
      }
    }

    const timestamp = Date.now();

    addMessage({
      channel: parsedChannel,
      id: timestamp.toString(),
      msgType: 'raid',
      show: true,
      timestamp,
      userId,
      userImage: userImageRef.value,
      userName: username,
      viewerCount: viewers,
    } as IRaid);
  });

  client.on('resub', async (channel: string, _username: string, months: number, message: string, userstate: SubUserstate, _methods: SubMethods) => {
    const parsedChannel = parseChannelName(channel);
    if (parsedChannel !== broadcasterInfo.name) {
      return;
    }

    const {
      color,
      'display-name': displayName,
      emotes,
      id,
      'msg-id': msgId,
      'msg-param-cumulative-months': subCumulativeMonthsString,
      'msg-param-sub-plan': subPlanString,
      'tmi-sent-ts': timestamp,
      'user-id': userId,
      username: userName,
    } = userstate;

    if (!userId) {
      return;
    }

    if (loadProfilePicture) {
      userImageRef.value = await getUserImageByUserId(userId);
    }

    addMessage({
      channel: parsedChannel,
      color,
      cumulativeMonths: Number.parseInt(subCumulativeMonthsString as string, 10),
      displayName,
      emotes,
      id,
      months,
      msgId,
      msgType: 'resub',
      plan: parsePlan(subPlanString),
      show: true,
      text: message,
      timestamp: timestamp ? Number.parseInt(timestamp, 10) : undefined,
      userId,
      userImage: userImageRef.value,
      userName,
      viewerCount: viewers.value,
    } as IResub);
  });

  client.on('subgift', async (channel: string, _username: string, _streakMonths: number, _recipient: string, _methods: SubMethods, userstate: SubGiftUserstate) => {
    const parsedChannel = parseChannelName(channel);
    if (parsedChannel !== broadcasterInfo.name) {
      return;
    }

    const {
      'display-name': senderDisplayName,
      id,
      'login': senderUserName,
      'msg-id': msgId,
      'msg-param-sub-plan': subPlanString,
      'msg-param-recipient-display-name': recipientDisplayName,
      'msg-param-recipient-id': recipientId,
      'msg-param-recipient-user-name': recipientUserName,
      'tmi-sent-ts': timestamp,
      'user-id': senderId,
    } = userstate;

    if (!recipientId || !senderId) {
      return;
    }

    let recipientImage, senderImage;
    if (loadProfilePicture) {
      [recipientImage, senderImage] = await Promise.all([
        getUserImageByUserId(recipientId),
        getUserImageByUserId(senderId),
      ]);
    }

    addMessage({
      channel: parsedChannel,
      id,
      msgId,
      msgType: 'subgift',
      recipient: {
        displayName: recipientDisplayName,
        id: recipientId,
        image: recipientImage ?? userImageRef.value,
        userName: recipientUserName,
      },
      sender: {
        displayName: senderDisplayName,
        id: senderId,
        image: senderImage ?? userImageRef.value,
        userName: senderUserName,
      },
      show: true,
      plan: parsePlan(subPlanString),
      timestamp: timestamp ? Number.parseInt(timestamp, 10) : undefined,
      viewerCount: viewers.value,
    } as ISubGift);
  });

  client.on('submysterygift', (_channel: string, username: string, numbOfSubs: number, methods: SubMethods, userstate: SubMysteryGiftUserstate) => {
    console.info('submysterygift', { _channel, username, numbOfSubs, userstate, methods });
    /*
     * userstate["msg-param-sender-count"]: Boolean or String - The total numbers of giftsubs username has given in channel
     */
  });

  client.on('subscription', async (channel: string, _username: string, _methods: SubMethods, _message: string, userstate: SubUserstate) => {
    const parsedChannel = parseChannelName(channel);
    if (parsedChannel !== broadcasterInfo.name) {
      return;
    }

    const {
      color,
      'display-name': displayName,
      emotes,
      id,
      'msg-id': msgId,
      'msg-param-cumulative-months': subCumulativeMonthsString,
      'msg-param-sub-plan': subPlanString,
      'tmi-sent-ts': timestamp,
      'user-id': userId,
      username: userName,
    } = userstate;

    if (!userId) {
      return;
    }

    if (loadProfilePicture) {
      userImageRef.value = await getUserImageByUserId(userId);
    }

    addMessage({
      channel: parsedChannel,
      color,
      displayName,
      emotes,
      id,
      msgId,
      msgType: 'subscription',
      show: true,
      subCumulativeMonthsString,
      plan: parsePlan(subPlanString),
      timestamp: timestamp ? Number.parseInt(timestamp, 10) : undefined,
      userId,
      userImage: userImageRef.value,
      userName,
      viewerCount: viewers.value,
    } as ISubscription);
  });

  client.on('timeout', (_channel: string, _username: string, _reason: string, _duration: number, userstate: TimeoutUserstate) => {
    if (userstate['target-user-id']) {
      removeMessagesByUserId(userstate['target-user-id']);
    }
  });
}

async function initTwitch(
  validateToken: () => Promise<void>,
): Promise<void> {
  try {
    if (validateTokenInterval) {
      window.clearInterval(validateTokenInterval);
      validateTokenInterval = null;
    }

    if (!ensureAuthForRoute()) {
      return;
    }
    await validateToken();

    if (!validateTokenInterval) {
      validateTokenInterval = window.setInterval(async () => {
        await validateToken();
      }, 1000 * 60 * 45); // validate token every 45 minutes
    }
  } catch (err) {
    if (validateTokenInterval) {
      window.clearInterval(validateTokenInterval);
      validateTokenInterval = null;
    }
    if ((err as { code?: string }).code === 'ERR_BAD_REQUEST') {
      ensureAuthForRoute();
      return;
    }
    console.info('retry failed, see error below');
    console.error(err);
  }
}

async function initChat(
  setUpBadgesFn: (streamTogetherChannelIds: Ref<{ [channel: string]: string }>, streamTogetherChannels: Ref<string[]>) => Promise<Record<string, { description: string; id: string; imageUrl: string; title: string }[]>>,
  setUpTwitchChatClientFn: (
    availableBadges: Record<string, { description: string; id: string; imageUrl: string; title: string }[]>,
    debug: boolean,
    loadProfilePicture: boolean,
    userImageRef: Ref<string>,
    addMessage: (message: IAction | IChat | IRaid | IResub | ISubGift | ISubscription) => void,
    removeMessagesByUserId: (userId: string) => void,
    clearMessages: (channel: string) => void,
    removeMessageByMessageId: (id: string) => void,
    viewers: Ref<number>,
    streamTogetherChannelIds: Ref<{ [channel: string]: string }>,
  ) => Promise<void>,
  messageDebug: boolean,
  addDebugMessages: () => void,
  updateViewerCount: (name: string) => Promise<void>,
  loading: Ref<boolean>,
  streamTogetherChannelIds: Ref<{ [channel: string]: string }>,
  streamTogetherChannels: Ref<string[]>,
  debug: boolean,
  loadProfilePicture: boolean,
  userImage: Ref<string>,
  addMessage: (message: IAction | IChat | IRaid | IResub | ISubGift | ISubscription) => void,
  removeMessagesByUserId: (userId: string) => void,
  clearMessages: (channel: string) => void,
  removeMessageByMessageId: (id: string) => void,
  viewers: Ref<number>,
): Promise<void> {
  const availableBadges = await setUpBadgesFn(streamTogetherChannelIds, streamTogetherChannels);

  await setUpTwitchChatClientFn(
    availableBadges,
    debug,
    loadProfilePicture,
    userImage,
    addMessage,
    removeMessagesByUserId,
    clearMessages,
    removeMessageByMessageId,
    viewers,
    streamTogetherChannelIds,
  );

  if (messageDebug) {
    addDebugMessages();
  }

  if (!viewerCountInterval) {
    viewerCountInterval = window.setInterval(async () => {
      await updateViewerCount(broadcasterInfo.name);
    }, 1000 * 60);
  }
  await updateViewerCount(broadcasterInfo.name);

  loading.value = false;
}

export function useTwitchChat(loadProfilePicture = false) {
  const { debug, messageDebug } = useSearchParamsComposable();

  const loading = ref(true);

  const userImage = ref('https://picsum.photos/40');

  const store = useTwitchStore();
  const { streamTogetherChannels, streamTogetherChannelIds, viewers } = storeToRefs(store);
  const {
    addMessage,
    addDebugMessages,
    clearMessages,
    removeMessageByMessageId,
    removeMessagesByUserId,
    updateViewerCount,
    validateToken,
  } = store;

  const initTwitchWrapper = async (): Promise<void> => {
    await initTwitch(validateToken);
  };

  const initChatWrapper = async (): Promise<void> => {
    await initChat(
      setUpBadges,
      setUpTwitchChatClient,
      messageDebug,
      addDebugMessages,
      updateViewerCount,
      loading,
      streamTogetherChannelIds,
      streamTogetherChannels,
      debug,
      loadProfilePicture,
      userImage,
      addMessage,
      removeMessagesByUserId,
      clearMessages,
      removeMessageByMessageId,
      viewers,
    );
  };

  onBeforeUnmount(async () => {
    if (validateTokenInterval) {
      window.clearInterval(validateTokenInterval);
      validateTokenInterval = null;
    }
    if (viewerCountInterval) {
      window.clearInterval(viewerCountInterval);
      viewerCountInterval = null;
    }
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  return {
    loading,
    initChat: initChatWrapper,
    initTwitch: initTwitchWrapper,
  };
}
