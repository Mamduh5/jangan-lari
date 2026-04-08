import {
  applyScenePlan,
  createReturnToMenuScenePlan,
  createStartRunScenePlan,
  type ScenePlanExecutor,
} from '../../src/game/utils/sceneFlow';

function createExecutorRecorder(): { executor: ScenePlanExecutor; steps: string[] } {
  const steps: string[] = [];

  return {
    steps,
    executor: {
      stop(key: string) {
        steps.push(`stop:${key}`);
      },
      start(key: string) {
        steps.push(`start:${key}`);
      },
      launch(key: string) {
        steps.push(`launch:${key}`);
      },
    },
  };
}

describe('sceneFlow helpers', () => {
  test('createReturnToMenuScenePlan stops UI and run before menu start', () => {
    const plan = createReturnToMenuScenePlan({ runSceneActive: true, uiSceneActive: true });
    expect(plan).toEqual([
      { type: 'stop', key: 'UIScene' },
      { type: 'stop', key: 'RunScene' },
      { type: 'start', key: 'MenuScene' },
    ]);
  });

  test('createStartRunScenePlan clears stale scenes before starting a fresh run', () => {
    const plan = createStartRunScenePlan({ runSceneActive: true, uiSceneActive: true });
    expect(plan).toEqual([
      { type: 'stop', key: 'UIScene' },
      { type: 'stop', key: 'RunScene' },
      { type: 'start', key: 'RunScene' },
      { type: 'launch', key: 'UIScene' },
    ]);
  });

  test('applyScenePlan preserves command order for menu return flow', () => {
    const { executor, steps } = createExecutorRecorder();
    const plan = createReturnToMenuScenePlan({ runSceneActive: true, uiSceneActive: true });

    applyScenePlan(executor, plan);

    expect(steps).toEqual(['stop:UIScene', 'stop:RunScene', 'start:MenuScene']);
  });

  test('applyScenePlan supports a fresh run after a completed run without stale UI', () => {
    const { executor, steps } = createExecutorRecorder();
    const plan = createStartRunScenePlan({ runSceneActive: false, uiSceneActive: true });

    applyScenePlan(executor, plan);

    expect(steps).toEqual(['stop:UIScene', 'start:RunScene', 'launch:UIScene']);
  });
});
