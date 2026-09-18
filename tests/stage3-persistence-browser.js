import { openDatabase, getRecord, putRecord } from "../js/core/database.js";
import { loadTasks } from "../js/repositories/tasks.js";
import { listQuestHistory } from "../js/repositories/quest-history.js";
import { approveQuestCompletion, completionInstanceId, questRewardTransactionId, requestQuestCompletion, startQuest } from "../js/services/quest-service.js";

export async function testStage3Persistence() {
  const name = `rlq-stage3-${crypto.randomUUID()}`;
  const now = new Date(2026, 8, 15, 10, 0, 0);
  let db = await openDatabase({ name });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    const tasks = await loadTasks();
    check(tasks.length === 180 && new Set(tasks.map(({ id }) => id)).size === 180, "Repository count/IDs");
    const exercise = tasks.find(({ id }) => id === "EX001");
    const ordinary = tasks.find((task) => !task.requiresParentConfirmation);
    const bossNamed = tasks.find((task) => task.id.startsWith("T") && task.name.includes("Boss"));
    check(exercise.movementTipsZh.length === 3 && Boolean(exercise.safetyNote), "Exercise tips/safety");
    check(tasks.find(({ id }) => id === "CH001").movementTipsZh.length === 3, "Chore steps");

    await putRecord(db, "player", {
      id: "local-player",
      progress: { level: 1, title: "新手冒險家", exp: { current: 0, target: 100 } },
    });
    await putRecord(db, "bossProgress", { bossId: "B01", hp: 77, status: "locked" });

    const started = await startQuest(db, exercise, { now });
    db.close();
    db = await openDatabase({ name });
    check((await getRecord(db, "questHistory", started.id)).status === "in_progress", "Start survives reload");

    await Promise.all([
      requestQuestCompletion(db, exercise, { now }),
      requestQuestCompletion(db, exercise, { now }),
    ]);
    const completionId = completionInstanceId(exercise, now);
    check((await getRecord(db, "questHistory", completionId)).status === "pending_approval", "Approval pending");
    check(!(await getRecord(db, "transactions", questRewardTransactionId(completionId))), "No early transaction");
    check((await getRecord(db, "player", "local-player")).progress.exp.current === 0, "No early EXP");

    await Promise.all([
      approveQuestCompletion(db, completionId, { now }),
      approveQuestCompletion(db, completionId, { now }),
    ]);
    const afterApproval = (await getRecord(db, "player", "local-player")).progress.exp.current;
    check(afterApproval === exercise.exp, "Approval pays once");
    await approveQuestCompletion(db, completionId, { now });
    await requestQuestCompletion(db, exercise, { now });
    check((await getRecord(db, "player", "local-player")).progress.exp.current === afterApproval, "Completion/transaction cannot be reused");
    check((await startQuest(db, exercise, { now })).id === completionId, "Repeatable task reuses same daily instance");

    const ordinaryStart = await startQuest(db, ordinary, { now });
    await Promise.all([
      requestQuestCompletion(db, ordinary, { now }),
      requestQuestCompletion(db, ordinary, { now }),
    ]);
    const expected = afterApproval + ordinary.exp;
    check((await getRecord(db, "player", "local-player")).progress.exp.current === expected, "Double-click completion pays once");
    db.close();
    db = await openDatabase({ name });
    await requestQuestCompletion(db, ordinary, { now });
    check((await getRecord(db, "player", "local-player")).progress.exp.current === expected, "Reload does not duplicate EXP");
    check((await getRecord(db, "questHistory", ordinaryStart.id)).status === "completed", "Completed state survives reload");

    const capDay = new Date(2026, 8, 16, 10, 0, 0);
    const capTasks = tasks.filter((task) => !task.requiresParentConfirmation && task.id !== ordinary.id).slice(0, 2);
    await startQuest(db, capTasks[0], { now: capDay });
    await requestQuestCompletion(db, capTasks[0], { now: capDay, dailyTaskLimit: 1 });
    await startQuest(db, capTasks[1], { now: capDay });
    let capRejected = false;
    try {
      await requestQuestCompletion(db, capTasks[1], { now: capDay, dailyTaskLimit: 1 });
    } catch (error) {
      capRejected = /明天 00:00/.test(error.message);
    }
    check(capRejected, "Daily hard cap rejects the next completion");
    check((await getRecord(db, "questHistory", completionInstanceId(capTasks[1], capDay))).status === "in_progress", "Rejected completion keeps progress intact");

    const bossBefore = JSON.stringify(await getRecord(db, "bossProgress", "B01"));
    const bossStart = await startQuest(db, bossNamed, { now });
    await requestQuestCompletion(db, bossNamed, { now });
    if (bossNamed.requiresParentConfirmation) await approveQuestCompletion(db, bossStart.id, { now });
    check(JSON.stringify(await getRecord(db, "bossProgress", "B01")) === bossBefore, "Txxx Boss task does not mutate bossProgress");
    check((await listQuestHistory(db)).every(({ id }) => id.startsWith("quest:")), "Stable completion IDs");
    return "PASS: reload, pending approval, atomic one-time EXP, repeat policy, Boss isolation";
  } finally {
    db.close();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }
}
