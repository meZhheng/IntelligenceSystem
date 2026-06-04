import { reactive, provide, inject } from "vue";

interface UserInfo {
  token: string;
  user_id: number;
  user_name: string;
  permissions: string;
}

// 定义 store 结构
interface Store {
  debug: boolean;
  state: {
    is_authenticated: boolean;
    user_id: number;
    user_name: string;
    user_perms: string;
    sidebarOpen: boolean;
  };

  loginAction: (payload: UserInfo) => void;
  logoutAction: () => void;
  toggleSidebar: () => void;
}

// 定义 store
const store: Store = {
  debug: true,
  state: reactive({
    is_authenticated: !!window.localStorage.getItem("user-token"),
    user_id: Number(window.localStorage.getItem("user-id") || -1), // 转换为 number，缺省值 0
    user_name: window.localStorage.getItem("user-name") || "",    // 缺省空字符串
    user_perms: (window.localStorage.getItem("user-perms") || ""), // 转为数组
    sidebarOpen: true,
  }),
  loginAction(payload) {
    this.state.is_authenticated = true;
    this.state.user_id = payload.user_id;
    this.state.user_name = payload.user_name;
    this.state.user_perms = payload.permissions;

    window.localStorage.setItem("user-token", payload.token);
    window.localStorage.setItem("user-id", payload.user_id.toString());
    window.localStorage.setItem("user-name", payload.user_name);
    window.localStorage.setItem("user-perms", payload.permissions);
  },
  logoutAction() {
    window.localStorage.removeItem("user-token");
    window.localStorage.removeItem("user-id");
    window.localStorage.removeItem("user-name");
    window.localStorage.removeItem("user-perms");

    this.state.is_authenticated = false;
    this.state.user_id = -1;
    this.state.user_name = "";
    this.state.user_perms = [];
  },
  toggleSidebar() {
    this.state.sidebarOpen = !this.state.sidebarOpen;
  },
};

// 提供 store
export const provideStore = () => {
  provide("store", store);
};

// 组件中使用 store 时，强制返回正确类型
export const useStore = (): Store => {
  const store = inject("store");
  if (!store) {
    throw new Error("useStore() called without a provider.");
  }
  return store as Store;
};

export default store;
