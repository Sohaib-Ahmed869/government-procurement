// Auto-marking (L3). The authority. The client's copy in
// fe/src/lms/utils/grading.js is for instant feedback only and is not trusted.
//
// This runs where the answer key lives, which is the whole point: a learner can
// post their answers, never their score.

function norm(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a.map(String));
  return b.every((v) => set.has(String(v)));
}

export function markQuestion(question, given) {
  const answers = Array.isArray(given) ? given : given == null ? [] : [given];
  const answered = answers.some((a) => String(a).trim() !== '');
  if (!answered) return { answered: false, correct: false };

  if (question.type === 'text') {
    const accepted = (question.accept ?? []).map(norm);
    return { answered: true, correct: accepted.includes(norm(answers[0])) };
  }

  // single, multi and boolean all compare as sets, so a multi-select answered
  // in a different order still marks correct.
  return { answered: true, correct: sameSet(question.correct ?? [], answers) };
}

// Marks a whole submission against a lesson's quiz.
//
// It iterates the QUESTIONS, not the submitted answers. A submission that
// omits questions must score zero for them rather than skipping them, and one
// that invents extra question ids must not be able to add marks.
export function markAttempt(quiz, submitted = []) {
  const byQuestion = new Map(
    submitted.map((a) => [String(a.question ?? a.questionId), a.given ?? a.answer]),
  );

  const answers = quiz.questions.map((q) => {
    const given = byQuestion.get(String(q._id));
    const outcome = markQuestion(q, given);
    return {
      question: q._id,
      given: Array.isArray(given) ? given.map(String) : given == null ? [] : [String(given)],
      correct: outcome.correct,
    };
  });

  const score = answers.filter((a) => a.correct).length;
  const total = quiz.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;

  return { answers, score, total, percent, passed: percent >= (quiz.passMark ?? 70) };
}

// The per-question review shown AFTER marking. Safe to send back because the
// attempt is already submitted and scored. Withholding the explanation at this
// point would remove the part that teaches.
export function reviewFor(quiz, attempt) {
  return quiz.questions.map((q) => {
    const answer = attempt.answers.find((a) => String(a.question) === String(q._id));
    return {
      question: q._id,
      prompt: q.prompt,
      type: q.type,
      options: q.options,
      given: answer?.given ?? [],
      correct: answer?.correct ?? false,
      answer: q.type === 'text' ? q.accept : q.correct,
      explanation: q.explanation,
    };
  });
}
