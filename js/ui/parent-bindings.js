export function bindParentControls(root, actions) {
  bind(root, "[data-parent-tab]", (target) => actions.selectParentTab(target.dataset.parentTab));
  bind(root, "[data-return-completion]", (target) => actions.returnCompletion(target.dataset.returnCompletion));
  bind(root, "[data-resubmit-quest]", (target) => actions.completeQuest(target.dataset.resubmitQuest));
  bind(root, "[data-parent-avatar]", (target) => actions.switchParentAvatar(target.dataset.parentAvatar));
  bind(root, "[data-toggle-pack]", (target) => actions.toggleVocabularyPack(target.dataset.togglePack, target.dataset.packEnabled === "true"));
  bind(root, "[data-backup-export]", () => actions.exportBackup());
  bind(root, "[data-backup-cancel]", () => actions.cancelBackupPreview());
  bind(root, "[data-backup-restore]", () => actions.confirmBackupRestore());

  const settingsForm = root.querySelector("[data-parent-settings]");
  settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(settingsForm);
    actions.saveParentSettings({
      dailyTaskGoal: Number(data.get("dailyTaskGoal")),
      maxTaskDifficulty: Number(data.get("maxTaskDifficulty")),
      exerciseEnabled: data.has("exerciseEnabled"),
      choresEnabled: data.has("choresEnabled"),
      parentApprovalRequired: data.has("parentApprovalRequired"),
      materialRewardsEnabled: data.has("materialRewardsEnabled"),
      restDays: data.getAll("restDays").map(Number),
      speechMinRate: Number(data.get("speechMinRate")),
      speechMaxRate: Number(data.get("speechMaxRate")),
    });
  });

  const backupForm = root.querySelector("[data-backup-preview-form]");
  backupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = new FormData(backupForm).get("backupFile");
    if (!(file instanceof File)) return;
    await actions.previewBackup(await file.text());
  });

  const importForm = root.querySelector("[data-pack-import]");
  importForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(importForm);
    const file = data.get("packFile");
    if (!(file instanceof File)) return;
    await actions.importVocabularyPack(await file.text(), { allowUpdate: data.has("allowUpdate") });
  });
}

function bind(root, selector, action) {
  for (const target of root.querySelectorAll(selector)) target.addEventListener("click", () => action(target));
}
