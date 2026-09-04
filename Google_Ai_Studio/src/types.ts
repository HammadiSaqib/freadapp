export interface StepItem {
  id: string;
  number: number;
  title: string;
  navLabel: string;
  anchor: string;
}

export interface MonitoringService {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  isAvailable: boolean;
  link?: string;
  buttonText: string;
  note: string;
  features: string[];
}

export interface ChecklistTask {
  id: string;
  text: string;
  completed: boolean;
}
