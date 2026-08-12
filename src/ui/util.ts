/** 点击后置灰防重复提交（banner 会持续反馈，无需恢复） */
export function runOnce(el: HTMLElement, fn: () => Promise<void>) {
  el.addEventListener("click", () => {
    if (el.dataset.cd2Busy) return;
    el.dataset.cd2Busy = "1";
    el.style.opacity = "0.6";
    void fn().finally(() => {
      delete el.dataset.cd2Busy;
      el.style.opacity = "1";
    });
  });
}
