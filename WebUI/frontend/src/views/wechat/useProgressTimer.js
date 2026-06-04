import { ref, computed } from 'vue';
export function useProgressTimer() {
    const startTime = ref(null);
    const elapsedTime = ref(0); // 已用时间（秒）
    const etaTime = ref(null); // 剩余时间（秒）
    let timer = null;
    const start = () => {
        startTime.value = Date.now();
        elapsedTime.value = 0;
        etaTime.value = null;
        if (timer)
            clearInterval(timer);
        timer = window.setInterval(() => {
            if (startTime.value) {
                // 1. 更新已处理时间（直接基于时间戳计算，防止定时器误差累积）
                elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000);
                // 2. 核心优化：让剩余时间随流逝减少
                // 只有当 etaTime 被 update() 计算出来后，才执行本地倒计时
                if (etaTime.value !== null && etaTime.value > 0) {
                    etaTime.value--;
                }
            }
        }, 1000);
    };
    const update = (current, total) => {
        if (!startTime.value || current <= 0 || current > total)
            return;
        const now = Date.now();
        const spent = (now - startTime.value) / 1000;
        const timePerItem = spent / current;
        const remainingItems = total - current;
        // 修正剩余时间：此时会覆盖定时器中递减的值
        // 使用 Math.max(0, ...) 确保不会出现负数
        etaTime.value = Math.max(0, Math.ceil(remainingItems * timePerItem));
        // 如果任务提前完成
        if (current === total) {
            etaTime.value = 0;
        }
    };
    const reset = () => {
        if (timer)
            clearInterval(timer);
        timer = null;
        startTime.value = null;
        elapsedTime.value = 0;
        etaTime.value = null;
    };
    const formatTime = (seconds) => {
        if (seconds === null || seconds < 0)
            return '--:--';
        if (seconds === 0)
            return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    return {
        elapsedTime: computed(() => formatTime(elapsedTime.value)),
        remainingTime: computed(() => formatTime(etaTime.value)),
        start,
        update,
        reset
    };
}
