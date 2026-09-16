import { getRecord, openDatabase, putRecord, runTransaction } from "../js/core/database.js";
import { loadTasks } from "../js/repositories/tasks.js";
import { approveQuestCompletion, completionInstanceId, questRewardTransactionId, requestQuestCompletion, startQuest } from "../js/services/quest-service.js";

export async function testA7Stage3Persistence() {
  const name = `rlq-a7-stage3-${crypto.randomUUID()}`;
  const dayOne = new Date(2026, 8, 20, 10, 0, 0);
  const dayTwo = new Date(2026, 8, 21, 10, 0, 0);
  let first = await openDatabase({ name });
  let second = await openDatabase({ name });
  const check = (condition, message) => { if (!condition) throw new Error(message); };

  try {
    const tasks = await loadTasks();
    const ordinary = tasks.find((task) => !task.requiresParentConfirmation && !task.name.includes("Boss"));
    const approvalTask = tasks.find(({ id }) => id === "EX001");
    const incomplete = tasks.find((task) => !task.requiresParentConfirmation && task.id !== ordinary.id && !task.name.includes("Boss"));
    const bossNamed = tasks.find((task) => task.id.startsWith("T") && task.name.includes("Boss"));
    const startingExp = 100;

    await putRecord(first, "player", {
      id: "local-player",
      progress: { level: 1, title: "QA", exp: { current: startingExp, target: 1000 } },
    });
    for (let number = 1; number <= 6; number += 1) {
      const bossId = `B${String(number).padStart(2, "0")}`;
      await putRecord(first, "bossProgress", { bossId, hp: 100 - number, status: "locked" });
    }

    const ordinaryHistory = await startQuest(first, ordinary, { now: dayOne });
    await Promise.all([
      requestQuestCompletion(first, ordinary, { now: dayOne }),
      requestQuestCompletion(second, ordinary, { now: dayOne }),
    ]);
    let snapshot = await storageSnapshot(first);
    check(snapshot.histories.filter(({ id }) => id === ordinaryHistory.id).length === 1, "A7 duplicate completion identity");
    check(snapshot.transactions.filter(({ sourceId }) => sourceId === ordinaryHistory.id).length === 1, "A7 concurrent reward count");
    check(snapshot.player.progress.exp.current === startingExp + ordinary.exp, "A7 concurrent EXP delta");

    first.close();
    second.close();
    first = await openDatabase({ name });
    second = await openDatabase({ name });
    await Promise.all([
      requestQuestCompletion(first, ordinary, { now: dayOne }),
      requestQuestCompletion(second, ordinary, { now: dayOne }),
    ]);
    snapshot = await storageSnapshot(first);
    check(snapshot.transactions.filter(({ sourceId }) => sourceId === ordinaryHistory.id).length === 1, "A7 reload/replay transaction count");
    check(snapshot.player.progress.exp.current === startingExp + ordinary.exp, "A7 reload/replay EXP");
    check(completionInstanceId(ordinary, dayOne) !== completionInstanceId(ordinary, dayTwo), "A7 new repeat instance identity");

    const pendingHistory = await startQuest(first, approvalTask, { now: dayOne });
    await Promise.all([
      requestQuestCompletion(first, approvalTask, { now: dayOne }),
      requestQuestCompletion(second, approvalTask, { now: dayOne }),
    ]);
    snapshot = await storageSnapshot(first);
    const beforeApprovalExp = snapshot.player.progress.exp.current;
    check((await getRecord(first, "questHistory", pendingHistory.id)).status === "pending_approval", "A7 pending status");
    check(!(await getRecord(first, "transactions", questRewardTransactionId(pendingHistory.id))), "A7 no early final transaction");
    check(snapshot.player.progress.exp.current === beforeApprovalExp, "A7 no early EXP");
    await Promise.all([
      approveQuestCompletion(first, pendingHistory.id, { now: dayOne }),
      approveQuestCompletion(second, pendingHistory.id, { now: dayOne }),
    ]);
    await approveQuestCompletion(first, pendingHistory.id, { now: dayOne });
    snapshot = await storageSnapshot(first);
    check(snapshot.transactions.filter(({ sourceId }) => sourceId === pendingHistory.id).length === 1, "A7 duplicate approval transaction count");
    check(snapshot.player.progress.exp.current === beforeApprovalExp + approvalTask.exp, "A7 duplicate approval EXP");
    check((await getRecord(first, "approvals", `approval:${pendingHistory.id}`)).status === "approved", "A7 approval finalized");

    const expBeforeIncomplete = snapshot.player.progress.exp.current;
    const incompleteHistory = await startQuest(first, incomplete, { now: dayOne });
    first.close();
    first = await openDatabase({ name });
    check((await getRecord(first, "questHistory", incompleteHistory.id)).status === "in_progress", "A7 in-progress survives reload");
    check(!(await getRecord(first, "transactions", questRewardTransactionId(incompleteHistory.id))), "A7 incomplete has no transaction");
    check((await getRecord(first, "player", "local-player")).progress.exp.current === expBeforeIncomplete, "A7 incomplete never subtracts EXP");

    const bossesBefore = JSON.stringify((await allRecords(first, "bossProgress")).sort(byBossId));
    const bossHistory = await startQuest(first, bossNamed, { now: dayOne });
    await requestQuestCompletion(first, bossNamed, { now: dayOne });
    if (bossNamed.requiresParentConfirmation) await approveQuestCompletion(first, bossHistory.id, { now: dayOne });
    const bossesAfter = JSON.stringify((await allRecords(first, "bossProgress")).sort(byBossId));
    check(bossesAfter === bossesBefore, "A7 Txxx Boss isolation across B01-B06");

    return "PASS: A7 duplicate/reload/two-connection completion, pending/approval, repeat identity, incomplete EXP, Boss isolation";
  } finally {
    first.close();
    second.close();
  }
}

async function storageSnapshot(db) {
  const [histories, transactions, player] = await Promise.all([
    allRecords(db, "questHistory"), allRecords(db, "transactions"), getRecord(db, "player", "local-player"),
  ]);
  return { histories, transactions, player };
}

function allRecords(db, storeName) {
  return runTransaction(db, [storeName], "readonly", (tx) => {
    const request = tx.objectStore(storeName).getAll();
    return () => request.result ?? [];
  });
}

function byBossId(left, right) {
  return left.bossId.localeCompare(right.bossId);
}
