import type { RouteRecordRaw } from 'vue-router';
import AdView from '@/views/AdView.vue';
import BottomBarView from '@/views/BottomBarView.vue';
import BskyPostsView from '@/views/BskyPostsView.vue';
import DeathCounterView from '@/views/DeathCounterView.vue';
import GigantifiedEmoteView from '@/views/GigantifiedEmoteView.vue';
import IntermissionView from '@/views/IntermissionView.vue';
import MediaPlayerView from '@/views/MediaPlayerView.vue';
import MusicPlayerView from '@/views/MusicPlayerView.vue';
import NextGameView from '@/views/NextGameView.vue';
import OnScreenCelebrationView from '@/views/OnScreenCelebrationView.vue';
import PDFViewer from '@/views/PDFViewer.vue';
import PollView from '@/views/PollView.vue';
import ScheduleView from '@/views/ScheduleView.vue';
import ScrollEmotesView from '@/views/ScrollEmotesView.vue';
import ShowToastyView from '@/views/ShowToastyView.vue';
import TimerView from '@/views/TimerView.vue';
import ToastereiWheelView from '@/views/ToastereiWheelView.vue';
import TwitchCallbackView from '@/views/TwitchCallbackView.vue';
import WebcamView from '@/views/WebcamView.vue';

export const routes: RouteRecordRaw[] = [
  {
    component: AdView,
    name: 'Ad Component',
    path: '/ad',
  },
  {
    component: BottomBarView,
    name: 'Bottom Bar',
    path: '/bottom-bar',
  },
  {
    component: BskyPostsView,
    name: 'Bluesky Posts Component',
    path: '/bsky-posts',
  },
  {
    component: DeathCounterView,
    name: 'Death Counter Component',
    path: '/death-counter',
  },
  {
    component: GigantifiedEmoteView,
    name: 'Gigantified Emote',
    path: '/gigantified-emote',
  },
  {
    component: IntermissionView,
    name: 'Intermission Component',
    path: '/intermission',
  },
  {
    component: MediaPlayerView,
    name: 'Media Player Component',
    path: '/media-player',
  },
  {
    component: MusicPlayerView,
    name: 'Music Player Component',
    path: '/music-player',
  },
  {
    component: NextGameView,
    name: 'Nächstes Spiel Component',
    path: '/next-game',
  },
  {
    component: OnScreenCelebrationView,
    name: 'On Screen Celebration',
    path: '/on-screen-celebration',
  },
  {
    component: PollView,
    name: 'Poll Component',
    path: '/poll',
  },
  {
    component: PDFViewer,
    name: 'PDF Viewer Component',
    path: '/pdf',
  },
  {
    component: ScheduleView,
    name: 'Schedule Component',
    path: '/schedule',
  },
  {
    component: ShowToastyView,
    name: 'Show Toasty',
    path: '/show-toasty',
  },
  {
    component: ScrollEmotesView,
    name: 'Scroll Emotes Component',
    path: '/scroll-emotes',
  },
  {
    component: TimerView,
    name: 'Timer Component',
    path: '/timer',
  },
  {
    component: TwitchCallbackView,
    name: 'Twitch Callback',
    path: '/twitch/callback',
  },
  {
    component: WebcamView,
    name: 'Webcam Component',
    path: '/webcam',
  },
  {
    component: ToastereiWheelView,
    name: 'Toasterei Wheel Spin',
    path: '/toasterei-wheel-spin',
  },
];
