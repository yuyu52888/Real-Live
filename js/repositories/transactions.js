import { getRecord } from "../core/database.js";

export function getRewardTransaction(db, transactionId) {
  return getRecord(db, "transactions", transactionId);
}
