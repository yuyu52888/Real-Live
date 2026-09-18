import { runTransaction } from "../core/database.js";


export function localWeekRange(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export async function loadWeeklyReport(db, tasks, { now = new Date() } = {}) {
  const [histories, approvals, sessions, stories] = await runTransaction(db, ["questHistory", "approvals", "wordSessions", "storyProgress"], "readonly", (tx) => {
    const questRequest = tx.objectStore("questHistory").getAll();
    const approvalRequest = tx.objectStore("approvals").getAll();
    const sessionRequest = tx.objectStore("wordSessions").getAll();
    const storyRequest = tx.objectStore("storyProgress").getAll();
    return () => [questRequest.result ?? [], approvalRequest.result ?? [], sessionRequest.result ?? [], storyRequest.result ?? []];
  });
  return buildWeeklyReport({ histories, approvals, sessions, stories, tasks, now });
}

export function buildWeeklyReport({ histories = [], approvals = [], sessions = [], stories = [], tasks = [], now = new Date() }) {
  const { start, end } = localWeekRange(now);
  const inside = (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.valueOf()) && date >= start && date < end;
  };
  const completed = histories.filter(({ status, completedAt }) => status === "completed" && inside(completedAt));
  const learningSessions = sessions.filter(({ completedAt, startedAt }) => inside(completedAt ?? startedAt));
  const completedStories = stories.filter(({ completedAt }) => inside(completedAt));
  const byTask = new Map(tasks.map((task) => [task.id, task]));
  const abilities = new Map();
  for (const history of completed) {
    const task = byTask.get(history.questId);
    if (!task?.ability) continue;
    const previous = abilities.get(task.ability);
    abilities.set(task.ability, {
      id: task.ability,
      label: task.abilityZh ?? previous?.label ?? task.ability,
      exp: (previous?.exp ?? 0) + (Number(task.abilityExp) || 0),
    });
  }
  const rankedAbilities = [...abilities.values()].sort((left, right) => right.exp - left.exp || left.id.localeCompare(right.id));
  const highestAbilityExp = rankedAbilities[0]?.exp;
  const strongest = rankedAbilities.filter(({ exp }) => exp === highestAbilityExp);
  const structuredMinutes = completed.reduce((sum, item) => sum + (Number.isFinite(item.durationMinutes) ? item.durationMinutes : 0), 0)
    + learningSessions.reduce((sum, item) => sum + (Number.isFinite(item.durationMinutes) ? item.durationMinutes : 0), 0);
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    completedQuests: completed.length,
    englishSessions: learningSessions.length,
    answeredCards: learningSessions.reduce((sum, session) => sum + (Array.isArray(session.results) ? session.results.length : 0), 0),
    stories: completedStories.length,
    exercise: completed.filter(({ taskFamily }) => taskFamily === "exercise").length,
    chores: completed.filter(({ taskFamily }) => taskFamily === "chore").length,
    retries: approvals.flatMap(({ returnEvents }) => Array.isArray(returnEvents) ? returnEvents : []).filter(inside).length,
    strongestAbility: strongest.length ? {
      id: strongest[0].id,
      ids: strongest.map(({ id }) => id),
      label: strongest.map(({ label }) => label).join("、"),
      labels: strongest.map(({ label }) => label),
      exp: strongest[0].exp,
    } : null,
    focusMinutes: structuredMinutes > 0 ? structuredMinutes : null,
  };
}
