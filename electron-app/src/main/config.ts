import Store from 'electron-store';

interface ConfigSchema {
  idleThreshold: number;
  startupEnabled: boolean;
  isActive: boolean;
}

const defaults: ConfigSchema = {
  idleThreshold: 1,
  startupEnabled: false,
  isActive: true,
};

export class ConfigStore {
  private store: Store<ConfigSchema>;

  constructor() {
    this.store = new Store<ConfigSchema>({
      name: 'ssu-config',
      defaults,
    });
  }

  get<K extends keyof ConfigSchema>(key: K, defaultValue?: ConfigSchema[K]): ConfigSchema[K] {
    const value = this.store.get(key);
    if (value === undefined && defaultValue !== undefined) {
      return defaultValue;
    }
    return value as ConfigSchema[K];
  }

  set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
    this.store.set(key, value);
  }

  getAll(): ConfigSchema {
    return this.store.store;
  }
}
