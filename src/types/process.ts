export type WorkerSpec = {
  name: string;
  role: string;
  share: number; // percentage 0..100, sums to 100 per state
  speed_factor: number; // multiply expected mean to get worker mean
};

export type StateSpec = {
  id: string; // internal stable id (e.g., APP_SUBMIT)
  name: string; // visualization/display name
  description: string;
  exceptional: boolean;
  expected: { mean_mins: number; std_mins: number };
  workers: WorkerSpec[];
};

export type TransitionSpec = {
  from: string;
  to: string;
  condition: string;
};

export type VariantSpec = {
  id: string;
  name: string; // user-facing label
  percent: number; // must sum to 100 across all variants
  path: string[]; // ordered state ids
};

export type ProcessDefinition = {
  process: { name: string; description: string };
  states: StateSpec[];
  transitions: TransitionSpec[];
  variants: VariantSpec[];
  happy_path: string[];
  data_generation: {
    cases: number;
    seed: number;
    temperature: number; // 0..1 scale (typical) controlling variance and rare choices
    noise: { time_sigma: number }; // multiplicative random noise scale
    exceptional_rates: {
      info_request_extra: number;
      manager_approval_extra: number;
    };
  };
};

