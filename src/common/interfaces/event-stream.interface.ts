export interface IEventStreamAdBreakBeginData {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  duration_seconds: number;
  is_automatic: boolean;
  requester_user_id: string;
  requester_user_login: string;
  requester_user_name: string;
  started_at: string;
}

export interface IEventStreamChannelUpdateData {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  category_id: string;
  category_name: string;
  content_classification_labels: string[];
  language: string;
  title: string;
}

export interface IEventStreamChannelPointsAutomaticRewardRedemptionAddData {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  id: string;
  message: {
    emotes: unknown;
    text: string;
  };
  redeemed_at: string;
  reward: {
    cost: number;
    type: 'celebration';
    unlocked_emote: unknown;
  };
  user_id: string;
  user_input: null;
  user_login: string;
  user_name: string;
}

export interface TwitchEventSubNotificationChannelPollChoiceDto {
  id: string;
  title: string;
  bits_votes: number;
  channel_points_votes: number;
  votes: number;
}

export interface TwitchEventSubNotificationChannelPollBitsVotingDto {
  is_enabled: boolean;
  amount_per_vote: number;
}

export interface TwitchEventSubNotificationChannelPollChannelPointsVotingDto {
  is_enabled: boolean;
  amount_per_vote: number;
}

export interface TwitchEventSubNotificationChannelPollBeginEventDto {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  title: string;
  choices: TwitchEventSubNotificationChannelPollChoiceDto[];
  bits_voting: TwitchEventSubNotificationChannelPollBitsVotingDto;
  channel_points_voting: TwitchEventSubNotificationChannelPollChannelPointsVotingDto;
  started_at: string;
  ends_at: string;
}

export interface TwitchEventSubNotificationChannelPollProgressEventDto {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  title: string;
  choices: TwitchEventSubNotificationChannelPollChoiceDto[];
  bits_voting: TwitchEventSubNotificationChannelPollBitsVotingDto;
  channel_points_voting: TwitchEventSubNotificationChannelPollChannelPointsVotingDto;
  started_at: string;
  ends_at: string;
}

export interface TwitchEventSubNotificationChannelPollEndEventDto {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  title: string;
  choices: TwitchEventSubNotificationChannelPollChoiceDto[];
  bits_voting: TwitchEventSubNotificationChannelPollBitsVotingDto;
  channel_points_voting: TwitchEventSubNotificationChannelPollChannelPointsVotingDto;
  started_at: string;
  ended_at: string;
  status: 'completed' | 'archived' | 'terminated';
}

export interface TwitchEventSubNotificationGameDeathToggleDto {
  enabled: boolean;
}

export interface TwitchEventSubNotificationGameDeathUpdateDto {
  count: number;
}

export interface IEventStreamToastereiChannelPointsShowData {
  userId: string;
  userName: string;
}

interface IEventStreamToastereiWheelSharedSpinProduct {
  category: string;
  cost: {
    amount: number;
    type: string;
  } | null;
  imageUrl: string;
  inDevelopment: boolean;
  name: string;
  sku: string;
  type: 'BITS' | 'CHANNEL_POINTS' | 'FREE';
  unlocked: boolean;
  isDefault?: boolean;
  groupId?: number;
  groupName?: string;
  deletedAt?: string;
  imageUpdatedAt?: string | Date;
}

export interface IEventStreamToastereiWheelSharedSpinData {
  product: IEventStreamToastereiWheelSharedSpinProduct | undefined; // undefined when no product was won
  userId: string;
  userName: string;
  weights: {
    bitsWeight: number;
    channelPointsWeight: number;
    nothingWeight: number;
  };
  winningSegmentId: number;
}
