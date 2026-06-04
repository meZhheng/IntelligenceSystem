<template>
<div class="container">
    <label class="label">
        <span class="circle"
            v-if="status !== 'finished'"
            ><svg
                class="icon"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                v-if="status==='start'"
            >
                <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M12 19V5m0 14-4-4m4 4 4-4"
                ></path>
            </svg>
            <div class="square" v-if="status==='processing'"></div>
        </span>
        <el-icon class="is-processing" v-if="status === 'finished'" :size="30">
            <svg class="circular" viewBox="0 0 50 50">
                <circle class="path" cx="30" cy="30" r="20" fill="green" />
          </svg>
        </el-icon>
    </label>
</div>
</template>

<style scoped>
/* From Uiverse.io by Na3ar-17 */ 
.container {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
}

.label {
  background-color: transparent;
  border: 2px solid rgb(91, 91, 240);
  display: flex;
  align-items: center;
  border-radius: 50px;
  width: 30px;
  cursor: pointer;
  transition: all 0.4s ease;
  padding: 5px;
  position: relative;
}

.label::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  width: 8px;
  height: 8px;
  transition: all 0.4s ease;
  border-radius: 100%;
  margin: auto;
  opacity: 0;
  visibility: hidden;
}

.label .title {
  font-size: 17px;
  color: #000000;
  transition: all 0.4s ease;
  position: absolute;
  text-align: center;
  right: 8px;
}

.label .title:last-child {
  opacity: 0;
  visibility: hidden;
}

.label .circle {
  height: 30px;
  width: 30px;
  border-radius: 50%;
  background-color: rgb(91, 91, 240);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.4s ease;
  position: relative;
  box-shadow: 0 0 0 0 rgb(255, 255, 255);
  overflow: hidden;
}

.label .circle .icon {
  color: #fff;
  width: 26px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.4s ease;
}

.label .circle .square {
  aspect-ratio: 1;
  width: 15px;
  border-radius: 2px;
  background-color: #fff;
  opacity: 1;
  visibility: visible;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.4s ease;
}

.label .circle::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  background-color: #3333a8;
  width: 100%;
  height: 0;
  transition: all 0.4s ease;
}

.label.checked::before {
  animation: rotate 3s ease-in-out 0.4s forwards;
}

.label.checked + .circle {
  animation:
    pulse 1s forwards,
    circleDelete 0.2s ease 3.5s forwards;
  rotate: 180deg;
}

.label .circle::before {
    height: var(--progress);
    /* 过渡效果：当 --progress 改变时自动平滑变化 */
    transition: height 0.4s ease-in-out;
}

.label.checked + .circle .icon {
  opacity: 0;
  visibility: hidden;
}


.label.checked ~ .title {
  opacity: 0;
  visibility: hidden;
}

.label.checked ~ .title:last-child {
  animation: showInstalledMessage 0.4s ease 3.5s forwards;
}

@keyframes pulse {
  0% {
    scale: 0.95;
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    scale: 1;
    box-shadow: 0 0 0 16px rgba(255, 255, 255, 0);
  }
  100% {
    scale: 0.95;
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(-90deg) translate(27px) rotate(0);
    opacity: 1;
    visibility: visible;
  }
  99% {
    transform: rotate(270deg) translate(27px) rotate(270deg);
    opacity: 1;
    visibility: visible;
  }
  100% {
    opacity: 0;
    visibility: hidden;
  }
}


@keyframes circleDelete {
  100% {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes showInstalledMessage {
  100% {
    opacity: 1;
    visibility: visible;
    right: 56px;
  }
}

@keyframes loading-rotate {
  to {
    transform: rotate(360deg);
  }
}

/* 让整个 SVG 旋转 */
.circular {
    display: inline;
    height: 30px;
    width: 30px;
    animation: loading-rotate 2s linear infinite;
}

.path {
    animation: loading-dash 1.5s ease-in-out infinite;
    stroke-dasharray: 90, 150;
    stroke-dashoffset: 0;
    stroke-width: 2;
    stroke: var(--el-color-primary);
    stroke-linecap: round;
}

</style>

<script lang="ts">

export default {
    name: 'StartBtn',

    data() {
        return {
            isChecked: false,
        }
    },

    props: {
        progress: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            default: 'start'
        },
    },

    watch: {
        progress(newProgress) {
            this.updateProgress(newProgress)
        },

        status(newStatus, oldStatus) {
            if (newStatus == 'processing' && oldStatus == 'start') {
                document.getElementsByClassName('label')[0].classList.add('checked');
            } else if (newStatus == 'start') {
                document.getElementsByClassName('label')[0].classList.remove('checked');
            }
        }
    },

    methods: {
        updateProgress(newProgress) {
            const progress = Math.max(0, Math.min(100, 100 - newProgress));
            const circleEl: HTMLElement | null = document.querySelector('.circle');
            if (circleEl) {
                circleEl.style.setProperty('--progress', progress + '%');
            }
        },
    }
}
</script>