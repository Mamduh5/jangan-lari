# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: menu-flow.spec.ts >> menu and run scene flow >> menu buttons can open meta, start a run, return to menu, and start another run
- Location: tests\e2e\menu-flow.spec.ts:111:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 500
Received:   1196.6599999999999
```

# Test source

```ts
  71  |     const game = window.__JANGAN_LARI_GAME__!;
  72  |     const metaScene = game.scene.getScene('MetaScene') as {
  73  |       children: { list: Array<{ text?: string; emit: (eventName: string) => void }> };
  74  |     };
  75  |     const button = metaScene.children.list.find((child) => child.text === 'Back to Menu');
  76  |     button?.emit('pointerdown');
  77  |   });
  78  | }
  79  | 
  80  | async function clickEndReturnButton(page: import('@playwright/test').Page): Promise<void> {
  81  |   await page.evaluate(() => {
  82  |     const game = window.__JANGAN_LARI_GAME__!;
  83  |     const uiScene = game.scene.getScene('UIScene') as Record<string, { emit: (eventName: string) => void }>;
  84  |     uiScene.endButton.emit('pointerdown');
  85  |   });
  86  | }
  87  | 
  88  | function trackRuntimeErrors(page: import('@playwright/test').Page): string[] {
  89  |   const runtimeErrors: string[] = [];
  90  | 
  91  |   page.on('pageerror', (error) => runtimeErrors.push(error.message));
  92  |   page.on('console', (message) => {
  93  |     if (message.type() === 'error') {
  94  |       runtimeErrors.push(message.text());
  95  |     }
  96  |   });
  97  | 
  98  |   return runtimeErrors;
  99  | }
  100 | 
  101 | function expectNoBrokenSceneApiErrors(runtimeErrors: string[]): void {
  102 |   const brokenSceneApiErrors = runtimeErrors.filter(
  103 |     (error) =>
  104 |       error.includes('this.scene.isActive is not a function') || error.includes('this.scene.start is not a function'),
  105 |   );
  106 | 
  107 |   expect(brokenSceneApiErrors).toEqual([]);
  108 | }
  109 | 
  110 | test.describe('menu and run scene flow', () => {
  111 |   test('menu buttons can open meta, start a run, return to menu, and start another run', async ({ page }) => {
  112 |     const runtimeErrors = trackRuntimeErrors(page);
  113 | 
  114 |     await page.goto('/');
  115 |     await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  116 | 
  117 |     await clickMenuButton(page, 'metaButton');
  118 |     await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MetaScene')));
  119 | 
  120 |     let state = await getGameState(page);
  121 |     expect(state.menuActive).toBe(false);
  122 |     expect(state.metaActive).toBe(true);
  123 |     expectNoBrokenSceneApiErrors(runtimeErrors);
  124 | 
  125 |     await clickMetaBackButton(page);
  126 |     await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  127 | 
  128 |     state = await getGameState(page);
  129 |     expect(state.menuActive).toBe(true);
  130 |     expect(state.metaActive).toBe(false);
  131 | 
  132 |     await clickMenuButton(page, 'startButton');
  133 |     await page.waitForFunction(() => {
  134 |       const game = window.__JANGAN_LARI_GAME__;
  135 |       return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
  136 |     });
  137 | 
  138 |     state = await getGameState(page);
  139 |     expect(state.runActive).toBe(true);
  140 |     expect(state.uiActive).toBe(true);
  141 |     expect(state.elapsedMs).toBeGreaterThanOrEqual(0);
  142 | 
  143 |     await page.evaluate(() => {
  144 |       const runScene = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as any;
  145 |       runScene.endRun(false, 'Defeat', 'Playwright defeat check');
  146 |     });
  147 |     await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.endActive')));
  148 | 
  149 |     await clickEndReturnButton(page);
  150 |     await page.waitForFunction(() => {
  151 |       const game = window.__JANGAN_LARI_GAME__;
  152 |       return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
  153 |     });
  154 | 
  155 |     state = await getGameState(page);
  156 |     expect(state.menuActive).toBe(true);
  157 |     expect(state.runActive).toBe(false);
  158 |     expect(state.uiActive).toBe(false);
  159 |     expect(state.endActive).toBe(false);
  160 | 
  161 |     await clickMenuButton(page, 'startButton');
  162 |     await page.waitForFunction(() => {
  163 |       const game = window.__JANGAN_LARI_GAME__;
  164 |       return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
  165 |     });
  166 |     await page.waitForFunction(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? -1) >= 0);
  167 | 
  168 |     state = await getGameState(page);
  169 |     expect(state.runActive).toBe(true);
  170 |     expect(state.uiActive).toBe(true);
> 171 |     expect(state.elapsedMs).toBeLessThan(500);
      |                             ^ Error: expect(received).toBeLessThan(expected)
  172 |     expectNoBrokenSceneApiErrors(runtimeErrors);
  173 |     expect(runtimeErrors).toEqual([]);
  174 |   });
  175 | 
  176 |   test('ESC flow returns to menu cleanly after starting from the actual Start Run button', async ({ page }) => {
  177 |     const runtimeErrors = trackRuntimeErrors(page);
  178 | 
  179 |     await page.goto('/');
  180 |     await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  181 | 
  182 |     await clickMenuButton(page, 'startButton');
  183 |     await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));
  184 |     await page.keyboard.press('Escape');
  185 | 
  186 |     await page.waitForFunction(() => {
  187 |       const game = window.__JANGAN_LARI_GAME__;
  188 |       return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
  189 |     });
  190 | 
  191 |     const state = await getGameState(page);
  192 |     expect(state.menuActive).toBe(true);
  193 |     expect(state.runActive).toBe(false);
  194 |     expect(state.uiActive).toBe(false);
  195 |     expect(state.endActive).toBe(false);
  196 |     expectNoBrokenSceneApiErrors(runtimeErrors);
  197 |     expect(runtimeErrors).toEqual([]);
  198 |   });
  199 | });
  200 | 
```