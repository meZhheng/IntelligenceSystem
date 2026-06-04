import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/api/axios';
const tasks = ref([]);
const router = useRouter();
async function fetchTasks() {
    const resp = await axios.get('/evaluate/tasks');
    tasks.value = resp.data;
}
function goDetail(id) {
    // 1. 先用 router.resolve 拿到 path 或 href
    const routeData = router.resolve({
        name: 'EvaluationDetail',
        params: { id }
    });
    // 2. window.open 打开新标签页
    window.open(routeData.href, '_blank');
}
function goOfflineDetect() {
    const routeData = router.resolve({
        name: 'OfflineDetect'
    });
    console.log("路由解析结果:", routeData);
    window.open(routeData.href, '_blank');
}
function goOfflineDetect2() {
    const routeData = router.resolve({
        name: 'OfflineDetect2'
    });
    console.log("路由解析结果:", routeData);
    window.open(routeData.href, '_blank');
}
onMounted(fetchTasks); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("evaluation-list") },
});
const __VLS_0 = {}.ElRow;
/** @type { [typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ] } */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    gutter: ((20)),
}));
const __VLS_2 = __VLS_1({
    gutter: ((20)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
for (const [task] of __VLS_getVForSourceType((__VLS_ctx.tasks))) {
    const __VLS_6 = {}.ElCol;
    /** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
        key: ((task.value)),
        xs: ((24)),
        sm: ((12)),
        md: ((8)),
        lg: ((6)),
    }));
    const __VLS_8 = __VLS_7({
        key: ((task.value)),
        xs: ((24)),
        sm: ((12)),
        md: ((8)),
        lg: ((6)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_12 = {}.ElCard;
    /** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        ...{ class: ("task-card") },
        shadow: ("hover"),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        ...{ class: ("task-card") },
        shadow: ("hover"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_18;
    const __VLS_19 = {
        onClick: (...[$event]) => {
            __VLS_ctx.goDetail(task.value);
        }
    };
    let __VLS_15;
    let __VLS_16;
    {
        const { header: __VLS_thisSlot } = __VLS_17.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("task-title") },
        });
        (task.label);
        const __VLS_20 = {}.ElTag;
        /** @type { [typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ] } */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            type: ((task.completed ? 'success' : 'warning')),
        }));
        const __VLS_22 = __VLS_21({
            type: ((task.completed ? 'success' : 'warning')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        (task.completed ? '已完成' : '未完成');
        __VLS_25.slots.default;
        var __VLS_25;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("task-desc") },
    });
    (task.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-footer") },
    });
    const __VLS_26 = {}.ElButton;
    /** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
        ...{ 'onClick': {} },
        type: ("primary"),
        size: ("small"),
    }));
    const __VLS_28 = __VLS_27({
        ...{ 'onClick': {} },
        type: ("primary"),
        size: ("small"),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    let __VLS_32;
    const __VLS_33 = {
        onClick: (...[$event]) => {
            __VLS_ctx.goDetail(task.value);
        }
    };
    let __VLS_29;
    let __VLS_30;
    __VLS_31.slots.default;
    var __VLS_31;
    __VLS_17.slots.default;
    var __VLS_17;
    __VLS_11.slots.default;
    var __VLS_11;
}
const __VLS_34 = {}.ElCol;
/** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    xs: ((24)),
    sm: ((12)),
    md: ((8)),
    lg: ((6)),
}));
const __VLS_36 = __VLS_35({
    xs: ((24)),
    sm: ((12)),
    md: ((8)),
    lg: ((6)),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
const __VLS_40 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ class: ("task-card") },
    shadow: ("hover"),
}));
const __VLS_42 = __VLS_41({
    ...{ class: ("task-card") },
    shadow: ("hover"),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
{
    const { header: __VLS_thisSlot } = __VLS_45.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("task-title") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-body") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: ("task-desc") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-footer") },
});
const __VLS_46 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    ...{ 'onClick': {} },
    type: ("primary"),
    size: ("small"),
}));
const __VLS_48 = __VLS_47({
    ...{ 'onClick': {} },
    type: ("primary"),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
let __VLS_52;
const __VLS_53 = {
    onClick: (__VLS_ctx.goOfflineDetect)
};
let __VLS_49;
let __VLS_50;
__VLS_51.slots.default;
var __VLS_51;
__VLS_45.slots.default;
var __VLS_45;
__VLS_39.slots.default;
var __VLS_39;
const __VLS_54 = {}.ElCol;
/** @type { [typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ] } */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    xs: ((24)),
    sm: ((12)),
    md: ((8)),
    lg: ((6)),
}));
const __VLS_56 = __VLS_55({
    xs: ((24)),
    sm: ((12)),
    md: ((8)),
    lg: ((6)),
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
const __VLS_60 = {}.ElCard;
/** @type { [typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ] } */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    ...{ class: ("task-card") },
    shadow: ("hover"),
}));
const __VLS_62 = __VLS_61({
    ...{ class: ("task-card") },
    shadow: ("hover"),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
{
    const { header: __VLS_thisSlot } = __VLS_65.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("task-title") },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-body") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: ("task-desc") },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ("card-footer") },
});
const __VLS_66 = {}.ElButton;
/** @type { [typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ] } */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    ...{ 'onClick': {} },
    type: ("primary"),
    size: ("small"),
}));
const __VLS_68 = __VLS_67({
    ...{ 'onClick': {} },
    type: ("primary"),
    size: ("small"),
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
let __VLS_72;
const __VLS_73 = {
    onClick: (__VLS_ctx.goOfflineDetect2)
};
let __VLS_69;
let __VLS_70;
__VLS_71.slots.default;
var __VLS_71;
__VLS_65.slots.default;
var __VLS_65;
__VLS_59.slots.default;
var __VLS_59;
__VLS_5.slots.default;
var __VLS_5;
['evaluation-list', 'task-card', 'card-header', 'task-title', 'card-body', 'task-desc', 'card-footer', 'task-card', 'card-header', 'task-title', 'card-body', 'task-desc', 'card-footer', 'task-card', 'card-header', 'task-title', 'card-body', 'task-desc', 'card-footer',];
var __VLS_special;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            tasks: tasks,
            goDetail: goDetail,
            goOfflineDetect: goOfflineDetect,
            goOfflineDetect2: goOfflineDetect2,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
