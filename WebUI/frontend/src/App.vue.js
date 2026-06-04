import { provideStore } from "@/store";
import Navbar from "@/components/layouts/Navbar.vue";
import Sidebar from "./components/layouts/Sidebar.vue";
export default await (async () => {
    provideStore();
    ; /* PartiallyEnd: #3632/scriptSetup.vue */
    const __VLS_ctx = {};
    const __VLS_componentsOption = {
        navbar: Navbar,
    };
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    if (!__VLS_ctx.$route.meta.hideNavbar) {
        const __VLS_0 = {}.navbar;
        /** @type { [typeof __VLS_components.Navbar, typeof __VLS_components.navbar, typeof __VLS_components.Navbar, typeof __VLS_components.navbar, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
        const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("page-main-content") },
    });
    const __VLS_6 = {}.Sidebar;
    /** @type { [typeof __VLS_components.Sidebar, typeof __VLS_components.Sidebar, ] } */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({}));
    const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_12 = {}.RouterView;
    /** @type { [typeof __VLS_components.RouterView, typeof __VLS_components.routerView, typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ] } */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    {
        const { default: __VLS_thisSlot } = __VLS_17.slots;
        const [{ Component }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_18 = {}.KeepAlive;
        /** @type { [typeof __VLS_components.KeepAlive, typeof __VLS_components.keepAlive, typeof __VLS_components.KeepAlive, typeof __VLS_components.keepAlive, ] } */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({}));
        const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
        if (__VLS_ctx.$route.meta.keepAlive) {
            const __VLS_24 = ((Component));
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                key: ((__VLS_ctx.$route.fullPath)),
            }));
            const __VLS_26 = __VLS_25({
                key: ((__VLS_ctx.$route.fullPath)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        }
        __VLS_23.slots.default;
        var __VLS_23;
        if (!__VLS_ctx.$route.meta.keepAlive) {
            const __VLS_30 = ((Component));
            // @ts-ignore
            const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
                key: ((__VLS_ctx.$route.fullPath)),
            }));
            const __VLS_32 = __VLS_31({
                key: ((__VLS_ctx.$route.fullPath)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        }
        __VLS_17.slots['' /* empty slot name completion */];
    }
    var __VLS_17;
    ['page-main-content',];
    var __VLS_special;
    const __VLS_self = (await import('vue')).defineComponent({
        setup() {
            return {
                Navbar: Navbar,
                Sidebar: Sidebar,
            };
        },
        name: "App",
        components: {
            navbar: Navbar,
        },
        computed: {
            isHideNavbar() {
                // 获取当前路由的所有层级
                const currentRoute = this.$route.matched;
                //检查所有路由层级的meta信息
                return currentRoute.some((route) => route.meta && route.meta.hideNavbar);
            },
        },
    });
    return (await import('vue')).defineComponent({
        setup() {
            return {};
        },
        name: "App",
        components: {
            navbar: Navbar,
        },
        computed: {
            isHideNavbar() {
                // 获取当前路由的所有层级
                const currentRoute = this.$route.matched;
                //检查所有路由层级的meta信息
                return currentRoute.some((route) => route.meta && route.meta.hideNavbar);
            },
        },
    });
})();
; /* PartiallyEnd: #3632/script.vue */
; /* PartiallyEnd: #4569/main.vue */
