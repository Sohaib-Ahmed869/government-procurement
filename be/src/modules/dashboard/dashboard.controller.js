import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import { CONTENT_STATUS, QUESTION_STATUS, SUBSCRIBER_STATUS } from '../../constants/statuses.js';
import { Question } from '../../models/Question.js';
import { Subscriber } from '../../models/Subscriber.js';
import { Article } from '../../models/Article.js';
import { Video } from '../../models/Video.js';
import { Course } from '../../models/Course.js';
import { ContactMessage } from '../../models/ContactMessage.js';
import { Consultation } from '../../models/Consultation.js';

// GET / — staff overview for the admin home. Everything is fetched in parallel
// so the dashboard is a single fast round-trip of counts + recent lists.
export const overview = asyncHandler(async (req, res) => {
  const [
    pendingQuestions,
    recentSubscribers,
    subscriberCount,
    articlesPublished,
    articlesDraft,
    videosPublished,
    videosDraft,
    coursesPublished,
    coursesDraft,
    newContact,
    newConsultations,
    recentQuestions,
  ] = await Promise.all([
    // Moderation queue depth: anything not yet approved/published/rejected.
    Question.countDocuments({
      status: { $in: [QUESTION_STATUS.SUBMITTED, QUESTION_STATUS.IN_REVIEW] },
    }),
    Subscriber.find({ status: SUBSCRIBER_STATUS.CONFIRMED })
      .sort('-confirmedAt')
      .limit(5)
      .select('email name confirmedAt')
      .lean(),
    Subscriber.countDocuments({ status: SUBSCRIBER_STATUS.CONFIRMED }),
    Article.countDocuments({ status: CONTENT_STATUS.PUBLISHED }),
    Article.countDocuments({ status: CONTENT_STATUS.DRAFT }),
    Video.countDocuments({ status: CONTENT_STATUS.PUBLISHED }),
    Video.countDocuments({ status: CONTENT_STATUS.DRAFT }),
    Course.countDocuments({ status: CONTENT_STATUS.PUBLISHED }),
    Course.countDocuments({ status: CONTENT_STATUS.DRAFT }),
    ContactMessage.countDocuments({ status: 'new' }),
    Consultation.countDocuments({ status: 'new' }),
    Question.find({ status: QUESTION_STATUS.SUBMITTED })
      .sort('-createdAt')
      .limit(5)
      .select('title category submitter status createdAt')
      .lean(),
  ]);

  return ok(res, {
    pendingQuestions,
    recentSubscribers,
    subscriberCount,
    content: {
      articles: { published: articlesPublished, draft: articlesDraft },
      videos: { published: videosPublished, draft: videosDraft },
      courses: { published: coursesPublished, draft: coursesDraft },
    },
    newContact,
    newConsultations,
    recentQuestions,
  });
});
