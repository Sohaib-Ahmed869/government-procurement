import { ANALYTICS_EVENTS } from '../constants/events.js';

export function pushEvent(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export const track = {
  virtualPageview: (p) => pushEvent(ANALYTICS_EVENTS.VIRTUAL_PAGEVIEW, p),
  audienceSelected: (audience) => pushEvent(ANALYTICS_EVENTS.AUDIENCE_SELECTED, { audience }),
  subscribe: (p) => pushEvent(ANALYTICS_EVENTS.SUBSCRIBE, p),
  questionSubmit: (category) => pushEvent(ANALYTICS_EVENTS.QUESTION_SUBMIT, { category }),
  courseInterest: (p) => pushEvent(ANALYTICS_EVENTS.COURSE_INTEREST, p),
  videoPlay: (p) => pushEvent(ANALYTICS_EVENTS.VIDEO_PLAY, p),
  outboundTenderClick: (p) => pushEvent(ANALYTICS_EVENTS.OUTBOUND_TENDER_CLICK, p),
};
