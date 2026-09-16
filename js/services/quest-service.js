import { runTransaction } from "../core/database.js";
import { PLAYER_ID } from "../repositories/player.js";

export function completionDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function completionInstanceId(task, date = new Date()) {
  const eligibility = task.repeatable ? completionDateKey(date) : "once";
  return `quest:${task.id}:${eligibility}`;
}

export function questRewardTransactionId(completionId) {
  return `quest-exp:${completionId}`;
}

export async function startQuest(db, task, { now = new Date() } = {}) {
  const id = completionInstanceId(task, now);
  const dateKey = completionDateKey(now);
  return runTransaction(db, ["questHistory"], "readwrite", (tx) => {
    const store = tx.objectStore("questHistory");
    const request = store.get(id);
    let result;
    request.onsuccess = () => {
      result = request.result ?? {
        id,
        questId: task.id,
        taskFamily: task.taskFamily,
        canonicalCategory: task.category,
        dateKey,
        status: "in_progress",
        startedAt: now.toISOString(),
        progress: { value: 0 },
        exp: task.exp,
        requiresParentConfirmation: task.requiresParentConfirmation,
      };
      if (!request.result) store.add(result);
    };
    return () => result;
  });
}

export async function updateQuestProgress(db, task, value, { now = new Date() } = {}) {
  const id = completionInstanceId(task, now);
  const normalized = Math.max(0, Number(value) || 0);
  return runTransaction(db, ["questHistory"], "readwrite", (tx) => {
    const store = tx.objectStore("questHistory");
    const request = store.get(id);
    let result;
    request.onsuccess = () => {
      if (!request.result || request.result.status !== "in_progress") {
        result = request.result;
        return;
      }
      result = { ...request.result, progress: { value: normalized }, updatedAt: now.toISOString() };
      store.put(result);
    };
    return () => result;
  });
}

export async function requestQuestCompletion(db, task, { now = new Date() } = {}) {
  const completionId = completionInstanceId(task, now);
  return task.requiresParentConfirmation
    ? requestApproval(db, completionId, now)
    : finalizeWithoutApproval(db, completionId, now);
}

export async function approveQuestCompletion(db, completionId, { now = new Date() } = {}) {
  const transactionId = questRewardTransactionId(completionId);
  return runTransaction(db, ["questHistory", "approvals", "transactions", "player"], "readwrite", (tx) => {
    const historyStore = tx.objectStore("questHistory");
    const approvalStore = tx.objectStore("approvals");
    const transactionStore = tx.objectStore("transactions");
    const playerStore = tx.objectStore("player");
    const historyRequest = historyStore.get(completionId);
    let result;
    historyRequest.onsuccess = () => {
      const history = historyRequest.result;
      if (!history) return;
      const approvalId = `approval:${completionId}`;
      const approvalRequest = approvalStore.get(approvalId);
      approvalRequest.onsuccess = () => {
        const approval = approvalRequest.result;
        if (!approval || !["pending", "approved"].includes(approval.status)) return;
        const transactionRequest = transactionStore.get(transactionId);
        transactionRequest.onsuccess = () => {
          if (transactionRequest.result) {
            result = { ...history, status: "completed", completedAt: history.completedAt ?? now.toISOString(), rewardTransactionId: transactionId };
            historyStore.put(result);
            approvalStore.put({ ...approval, status: "approved", approvedAt: approval.approvedAt ?? now.toISOString() });
            return;
          }
          const playerRequest = playerStore.get(PLAYER_ID);
          playerRequest.onsuccess = () => {
            const player = playerRequest.result;
            if (!player?.progress?.exp) return;
            const exp = history.exp;
            transactionStore.add(createTransaction(transactionId, history, exp, now));
            playerStore.put(addPlayerExp(player, exp));
            result = { ...history, status: "completed", completedAt: now.toISOString(), rewardTransactionId: transactionId };
            historyStore.put(result);
            approvalStore.put({ ...approval, status: "approved", approvedAt: now.toISOString(), transactionId });
          };
        };
      };
    };
    return () => result;
  });
}

function requestApproval(db, completionId, now) {
  return runTransaction(db, ["questHistory", "approvals"], "readwrite", (tx) => {
    const historyStore = tx.objectStore("questHistory");
    const approvalStore = tx.objectStore("approvals");
    const historyRequest = historyStore.get(completionId);
    let result;
    historyRequest.onsuccess = () => {
      const history = historyRequest.result;
      if (!history || history.status === "completed") {
        result = history;
        return;
      }
      const approvalId = `approval:${completionId}`;
      const approvalRequest = approvalStore.get(approvalId);
      approvalRequest.onsuccess = () => {
        const pending = {
          ...history,
          status: "pending_approval",
          completionRequestedAt: history.completionRequestedAt ?? now.toISOString(),
        };
        result = pending;
        historyStore.put(pending);
        if (!approvalRequest.result) {
          approvalStore.add({
            id: approvalId,
            questHistoryId: completionId,
            questId: history.questId,
            status: "pending",
            requestedAt: now.toISOString(),
          });
        }
      };
    };
    return () => result;
  });
}

function finalizeWithoutApproval(db, completionId, now) {
  const transactionId = questRewardTransactionId(completionId);
  return runTransaction(db, ["questHistory", "transactions", "player"], "readwrite", (tx) => {
    const historyStore = tx.objectStore("questHistory");
    const transactionStore = tx.objectStore("transactions");
    const playerStore = tx.objectStore("player");
    const historyRequest = historyStore.get(completionId);
    let result;
    historyRequest.onsuccess = () => {
      const history = historyRequest.result;
      if (!history) return;
      const transactionRequest = transactionStore.get(transactionId);
      transactionRequest.onsuccess = () => {
        if (transactionRequest.result) {
          result = history.status === "completed" ? history : { ...history, status: "completed", completedAt: now.toISOString(), rewardTransactionId: transactionId };
          if (result !== history) historyStore.put(result);
          return;
        }
        const playerRequest = playerStore.get(PLAYER_ID);
        playerRequest.onsuccess = () => {
          const player = playerRequest.result;
          if (!player?.progress?.exp) return;
          transactionStore.add(createTransaction(transactionId, history, history.exp, now));
          playerStore.put(addPlayerExp(player, history.exp));
          result = { ...history, status: "completed", completedAt: now.toISOString(), rewardTransactionId: transactionId };
          historyStore.put(result);
        };
      };
    };
    return () => result;
  });
}

function createTransaction(id, history, amount, now) {
  return {
    id,
    sourceId: history.id,
    sourceType: "quest-completion",
    questId: history.questId,
    type: "exp",
    amount,
    createdAt: now.toISOString(),
  };
}

function addPlayerExp(player, amount) {
  return {
    ...player,
    progress: {
      ...player.progress,
      exp: { ...player.progress.exp, current: player.progress.exp.current + amount },
    },
  };
}
