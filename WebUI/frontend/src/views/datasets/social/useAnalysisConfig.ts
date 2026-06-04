import { ref } from "vue";

export const analysisModelOptions = [
  "qwen3.5-flash",
  "qwen3.5-0.8B",
  "qwen3.5-2B",
  "qwen3.5-9B",
];

export const defaultAnalysisModel = analysisModelOptions[0];

export interface AnalysisConfig {
  min_text_length: number;
  max_text_length: number;
  temperature: number;
  top_p: number;
  top_k: number;
  do_sample: boolean;
  model_choice: string;
}

export function createDefaultAnalysisConfig(): AnalysisConfig {
  return {
    min_text_length: 1,
    max_text_length: 512,
    temperature: 0.3,
    top_p: 0.7,
    top_k: 20,
    do_sample: false,
    model_choice: defaultAnalysisModel,
  };
}

export function useAnalysisConfig() {
  const currentConfig = ref<AnalysisConfig>(createDefaultAnalysisConfig());

  const normalizeConfigModelChoice = () => {
    if (!analysisModelOptions.includes(currentConfig.value.model_choice)) {
      currentConfig.value.model_choice = defaultAnalysisModel;
    }
  };

  const loadConfig = () => {
    const savedConfig = localStorage.getItem("analysis_config");
    if (!savedConfig) return;

    try {
      currentConfig.value = {
        ...createDefaultAnalysisConfig(),
        ...JSON.parse(savedConfig),
      };
      normalizeConfigModelChoice();
    } catch (error) {
      console.error("加载配置失败", error);
    }
  };

  const saveConfig = () => {
    normalizeConfigModelChoice();
    localStorage.setItem("analysis_config", JSON.stringify(currentConfig.value));
  };

  const resetConfig = () => {
    currentConfig.value = createDefaultAnalysisConfig();
  };

  return {
    analysisModelOptions,
    currentConfig,
    loadConfig,
    saveConfig,
    resetConfig,
  };
}
