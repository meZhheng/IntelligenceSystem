<template>
  <div class="stats-board">
    <div class="card" v-for="(item, idx) in panels" :key="idx">
      <div class="card-title">{{ item.title }}</div>
      <div class="card-value">
        <div class="digits">
          <!-- 固定 6 位（高位补 0），在第 3 位后显示逗号 -->
          <div
            v-for="(ch, i) in formattedDigits(item.value).split('')"
            :key="i"
            class="digit-wrap"
            :class="{ comma: ch === ',' }"
          >
            <template v-if="ch === ','">
              <div class="comma">,</div>
            </template>
            <template v-else>
              <div
                class="digit-viewport"
                :style="{ height: digitHeight + 'px', width: digitWidth + 'px' }"
              >
                <div
                  class="digit-list"
                  :style="digitTransformStyle(item.positions[i], item.disableTransition[i])"
                >
                  <div class="digit LED" v-for="n in digitRepeatCount" :key="n + '-' + i">{{ (n - 1) % 10 }}</div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, nextTick } from 'vue';

export default defineComponent({
  name: 'StatsBoard',
  props: {
    total: { type: Number, required: true },
    negative: { type: Number, required: true },
    positive: { type: Number, required: true },
    // 单位数字高度（像素）
    digitHeight: { type: Number, default: 96 },
    // 单位数字宽度
    digitWidth: { type: Number, default: 72 }
  },
  setup(props) {
    // 每个 digit 列重复多少次（保证滚动过程中有足够的循环空间）
    const digitRepeatCount = 30; // 3 cycles of 0..9

    const panels = reactive([
      {
        title: '当前舆情总数',
        value: props.total,
        positions: [] as number[], // 每位的当前位置索引（单位：digit高度的倍数）
        disableTransition: [] as boolean[]
      },
      {
        title: '负面舆情总数',
        value: props.negative,
        positions: [] as number[],
        disableTransition: [] as boolean[]
      },
      {
        title: '正面舆情总数',
        value: props.positive,
        positions: [] as number[],
        disableTransition: [] as boolean[]
      }
    ]);

    // 工具：把数字规范化为 6 位并在千位插入逗号
    const toSixDigitsWithComma = (v: number) => {
      const n = Math.max(0, Math.floor(v));
      const s = String(n).padStart(6, '0');
      return s.slice(0, 3) + ',' + s.slice(3);
    };

    const formattedDigits = (v: number) => toSixDigitsWithComma(v);

    // 初始化 positions：放在中间的 cycle（index 10..19）以便前后滚动
    const initPositions = (v: number) => {
      const s = toSixDigitsWithComma(v).split('');
      return s.map(ch => (ch === ',' ? -1 : 10 + Number(ch)));
    };

    panels.forEach(p => {
      p.positions = initPositions(p.value);
      p.disableTransition = p.positions.map(() => false);
    });

    // 动画函数：向上滚动最少步数到目标数字（steps 取 0..9）
    const animatePanelTo = async (panelIndex: number, newValue: number) => {
      const p = panels[panelIndex];
      const oldStr = toSixDigitsWithComma(p.value).split('');
      const newStr = toSixDigitsWithComma(newValue).split('');
      p.value = newValue;

      for (let i = 0; i < newStr.length; i++) {
        if (newStr[i] === ',') {
          p.positions[i] = -1; // comma
          continue;
        }

        const newDigit = Number(newStr[i]);
        // 当前显示的实际数字
        const currentPos = p.positions[i] < 0 ? 10 : p.positions[i];
        const currentDigit = currentPos % 10;
        // 向上滚动的最小步数（0..9）
        const steps = (newDigit - currentDigit + 10) % 10;
        const targetPos = currentPos + steps; // 可能落在中后部

        // 设置目标位置（触发带动画的 transform）
        p.disableTransition[i] = false;
        p.positions[i] = targetPos;

        // 在 transition 完成后（略大于 css 中 transition 时间），如果索引偏移到过大范围则归一化到中间 cycle
        // CSS transition duration 为 700ms（与样式中一致）
        ((panel, idx) => {
          setTimeout(() => {
            // 归一化：如果位置超过 20（离开中间 cycle），减去 10 使其回到中间 cycle，同步位置但不做过渡
            if (panel.positions[idx] > 20) {
              panel.disableTransition[idx] = true; // 关闭过渡
              panel.positions[idx] = panel.positions[idx] - 10;
              // 下一个 tick 恢复过渡
              nextTick(() => {
                setTimeout(() => {
                  panel.disableTransition[idx] = false;
                }, 20);
              });
            }
          }, 750);
        })(p, i);
      }

      await nextTick();
    };

    watch(() => props.total, (nv) => animatePanelTo(0, nv));
    watch(() => props.negative, (nv) => animatePanelTo(1, nv));
    watch(() => props.positive, (nv) => animatePanelTo(2, nv));

    // 样式计算：transform 与过渡控制
    const digitTransformStyle = (position: number | undefined, disable = false) => {
      if (position == null || position < 0) return {};
      const y = -position * (props.digitHeight || 1);
      return {
        transform: `translateY(${y}px)` ,
        transition: disable ? 'none' : 'transform 700ms cubic-bezier(.2,.9,.3,1)'
      };
    };

    return { panels, formattedDigits, digitTransformStyle, digitHeight: props.digitHeight, digitWidth: props.digitWidth, digitRepeatCount };
  }
});
</script>

<style scoped>
.stats-board {
  display: flex;
  flex-direction: row;
  gap: 36px;
  align-items: flex-start;
  justify-content: center;
  padding: 28px;
  flex-shrink: 0;
  max-height: 280px;
}
.card {
  border-radius: 16px;
  padding: 28px 28px;
  min-width: 460px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 数码管风格标题 */
.card-title {
  position: relative;
  color: rgb(103 232 249);
  font-size: 32px;
  letter-spacing: 5px;
  margin-bottom: 14px;
  text-transform: uppercase;
  font-weight: 700;
  text-align: center;

  /* 荧光发光 */
  text-shadow: 0 0 8px rgba(127,209,255,0.25), 0 2px 6px rgba(10,40,60,0.6);

  /* 两侧装饰线条 */
  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 120px;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgb(56,189,248), transparent);
    transform: translateY(-50%);
  }

  &::before {
    left: -140px;
  }
  &::after {
    right: -140px;
  }
}

.card-value {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border: 2px solid transparent;
  border-radius: 10px;

  /* 发光边框效果 */
  background: linear-gradient(180deg, rgba(15,35,65,0.7), rgba(5,15,30,0.8));
  box-shadow: inset 0 0 15px rgba(0, 200, 255, 0.3), 0 0 25px rgba(0, 200, 255, 0.2);
  border-image: linear-gradient(90deg, rgb(56,189,248), rgb(30,58,138)) 1;
}

.digits { display:flex; align-items:center; gap:10px; }

.digit-wrap { 
  width: var(--digit-width,72px); 
  height: var(--digit-height,96px); 
  overflow:hidden; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  position:relative; 
}
.digit-wrap.comma { width: 18px; }

.comma { color: #ffffff; font-weight:1000; font-size:40px; margin-top: auto; }

/* 数码管背景与数字样式 */
.digit-viewport {
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  border-radius: 0; 
  padding: 8px 6px;

  /* 背景渐变 + 折角效果 */
  background: linear-gradient(180deg, rgb(37 99 235), rgb(56 189 248));
  box-shadow: inset 0 6px 14px rgba(0,0,0,0.6), 0 6px 20px rgba(3,12,30,0.6);
  clip-path: polygon(
    16px 0,                /* 上边左折 */
    calc(100% - 16px) 0,   /* 上边右折 */
    100% 16px,             /* 右上角 */
    100% calc(100% - 16px),/* 右下角 */
    calc(100% - 16px) 100%,/* 下边右折 */
    16px 100%,             /* 下边左折 */
    0 calc(100% - 16px),   /* 左下角 */
    0 16px                 /* 左上角 */
  );

  /* 分割上下两部分 */
  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 5px;
    background: rgba(0, 0, 0, 0.5);
    transform: translateY(-50%);
  }
}


.digit-list { display:flex; flex-direction:column; }
.digit {
  width: 100%;
  height: var(--digit-height, 96px);
  display:flex; align-items:center; justify-content:center;
  font-size: 96px;
  font-weight: 1000;
  color: #ffffff;
  /* 模拟数码段点亮的效果 */
  text-shadow:
    0 0 8px rgba(155,232,255,0.28),
    0 4px 18px rgba(0,90,140,0.28);
}

/* 响应式与变量绑定 */
:root { --digit-height: 96px; --digit-width: 96px; }

/* 根据传入的 props 实际渲染会内联 style 覆盖宽高，这里仅做备选 */

@media (min-width: 3840px) {
  .card { min-width: 560px; padding: 36px; }
  .card-title { font-size: 32px }
  .digit { font-size: 96px; }
  :root { --digit-height: 120px; --digit-width: 96px; }
}

@media (min-width: 1920px) {
  .card { min-width: 200px; padding: 10px; }
  .card-title { font-size: 16px }
  .digit-viewport { height: 48px; width: 36px; } 
  .digit { font-size: 48px; }
  :root { --digit-height: 96px; --digit-width: 72px; }
}

@font-face {
  font-family: 'led';
  src:url(@/assets/fonts/digital-7-4.ttf);
}
.LED{
  font-family: 'led';
  text-shadow: none;
}
</style>
