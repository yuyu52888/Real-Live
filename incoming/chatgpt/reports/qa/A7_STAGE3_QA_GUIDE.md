# A7 Stage 3 QA Guide

## Gate
Blocker cases must PASS before Stage 3 final acceptance.

## 人工最優先
`S3-QA-002`, `003`, `004`, `006`, `008`, `009`, `011`, `017`.

## 驗證紀錄
每次高風險測試先後記錄：EXP、taskId、approval status、completion/transaction identity、questHistory/transactions 筆數。畫面動畫不是唯一依據，以 IndexedDB persistent state 為準。

## Repeatable
只強制「同一 logical completion instance 不得發獎兩次」。新 instance 必須有新 stable identity；本 fixture 不擅自規定每日次數或 cooldown。

## Pending
requiresParentConfirmation 的 child completion 必須進 pending，final reward 不得提前發。完整 parent UI 若仍屬後續 Stage，至少要用 service/repository test 證明 finalize idempotency。

## 多分頁
同 browser profile 開兩頁，對同一 instance 近乎同時完成；最後兩頁 F5 並檢查 IndexedDB，reward/EXP 最多一次。

## Fail 記錄
Case ID / Browser+viewport / Starting EXP / Ending EXP / taskId / approval status / transaction ID / reproduction / expected / actual / console / IndexedDB observation.
