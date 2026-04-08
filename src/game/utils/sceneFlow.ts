export type ManagedSceneKey = 'MenuScene' | 'RunScene' | 'UIScene' | 'MetaScene';

export type ScenePlanStep =
  | { type: 'stop'; key: ManagedSceneKey }
  | { type: 'start'; key: ManagedSceneKey }
  | { type: 'launch'; key: ManagedSceneKey };

export type ScenePlanExecutor = {
  stop: (key: string) => void;
  start: (key: string) => void;
  launch: (key: string) => void;
};

export type SceneManagerLike = {
  stop: (key: string) => void;
  start: (key: string) => void;
  run: (key: string) => void;
};

export function createSceneManagerExecutor(sceneManager: SceneManagerLike): ScenePlanExecutor {
  return {
    stop: (key) => sceneManager.stop(key),
    start: (key) => sceneManager.start(key),
    launch: (key) => sceneManager.run(key),
  };
}

export function createReturnToMenuScenePlan(options: {
  runSceneActive: boolean;
  uiSceneActive: boolean;
}): ScenePlanStep[] {
  const plan: ScenePlanStep[] = [];

  if (options.uiSceneActive) {
    plan.push({ type: 'stop', key: 'UIScene' });
  }

  if (options.runSceneActive) {
    plan.push({ type: 'stop', key: 'RunScene' });
  }

  plan.push({ type: 'start', key: 'MenuScene' });
  return plan;
}

export function createStartRunScenePlan(options: {
  runSceneActive: boolean;
  uiSceneActive: boolean;
}): ScenePlanStep[] {
  const plan: ScenePlanStep[] = [];

  if (options.uiSceneActive) {
    plan.push({ type: 'stop', key: 'UIScene' });
  }

  if (options.runSceneActive) {
    plan.push({ type: 'stop', key: 'RunScene' });
  }

  plan.push({ type: 'start', key: 'RunScene' }, { type: 'launch', key: 'UIScene' });
  return plan;
}

export function applyScenePlan(sceneExecutor: ScenePlanExecutor, plan: ScenePlanStep[]): void {
  for (const step of plan) {
    switch (step.type) {
      case 'stop':
        sceneExecutor.stop(step.key);
        break;
      case 'start':
        sceneExecutor.start(step.key);
        break;
      case 'launch':
        sceneExecutor.launch(step.key);
        break;
    }
  }
}
