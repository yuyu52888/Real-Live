import { getRecord, runTransaction } from "../core/database.js";

export function getApproval(db, approvalId) {
  return getRecord(db, "approvals", approvalId);
}
export function listApprovals(db) {
  return runTransaction(db, ["approvals"], "readonly", (tx) => {
    const request = tx.objectStore("approvals").getAll();
    return () => request.result ?? [];
  });
}


export function listPendingApprovals(db) {
  return runTransaction(db, ["approvals"], "readonly", (tx) => {
    const request = tx.objectStore("approvals").index("status").getAll("pending");
    return () => request.result ?? [];
  });
}
