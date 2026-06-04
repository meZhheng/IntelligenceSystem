import dayjs from 'dayjs'; // 修改导入语法
import 'dayjs/locale/zh-cn'; // 如果需要中文支持需单独引入
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn'); // 设置中文
const formatResoluteDate = (dateString) => {
    return dayjs.utc(dateString).tz('Asia/Shanghai').format('YYYY年M月D日');
};
const formatRelativeTime = (dateString) => {
    return dayjs(dateString).fromNow();
};
export function getTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
export const formatDateTime = (dateString) => {
    const now = dayjs();
    const targetTime = dayjs(dateString);
    // 判断是否在10天内（精确到毫秒）
    if (now.diff(targetTime, 'days') < 10) {
        return formatRelativeTime(dateString);
    }
    else {
        return formatResoluteDate(dateString);
    }
};
/**
 * 获取当前时间的格式化字符串
 * @param format dayjs 的格式化字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的当前时间字符串
 */
export function getCurrentDateTime(format = 'YYYY-MM-DD HH:mm:ss') {
    return dayjs().format(format);
}
/**
 * 获取当前时间戳（毫秒）
 */
export function getCurrentTimestamp() {
    return Date.now();
}
