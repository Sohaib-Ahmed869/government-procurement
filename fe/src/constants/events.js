// The dataLayer contract (Bible §07). Must match backend/src/constants/events.js.
export const ANALYTICS_EVENTS = Object.freeze({
  VIRTUAL_PAGEVIEW: 'virtual_pageview',           // page_path, page_title, audience
  AUDIENCE_SELECTED: 'audience_selected',         // audience
  SUBSCRIBE: 'subscribe',                         // source_component, audience
  QUESTION_SUBMIT: 'question_submit',             // category
  COURSE_INTEREST: 'course_interest',             // course_id, course_name, audience
  VIDEO_PLAY: 'video_play',                       // video_id, platform, title
  OUTBOUND_TENDER_CLICK: 'outbound_tender_click', // portal_name, url
});
