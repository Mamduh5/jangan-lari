import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { getAbilityDefinition } from '../data/abilities';
import { HERO_LIST, type HeroDefinition } from '../data/heroes';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import { selectHero } from '../save/saveHeroes';

export class MenuScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private statusText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Text;
  private metaButton!: Phaser.GameObjects.Text;
  private heroFrames: Phaser.GameObjects.Rectangle[] = [];
  private heroBodies: Phaser.GameObjects.Text[] = [];
  private focusedHeroId: HeroDefinition['id'] = 'runner';

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.focusedHeroId = this.saveData.selectedHero;
    this.heroFrames = [];
    this.heroBodies = [];

    const centerX = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.rectangle(centerX, 68, 1160, 96, 0x0f172a, 0.96).setStrokeStyle(2, 0x223247, 0.9);
    this.add.rectangle(centerX, 390, 1080, 420, 0x101827, 0.98).setStrokeStyle(2, 0x2a3b55, 0.92);

    this.add
      .text(98, 46, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(100, 84, 'Stable V1: three heroes, six evolutions, one boss, directed reward runs.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#9fb8d3',
      })
      .setOrigin(0, 0.5);

    this.startButton = this.createMenuButton(560, 82, 'Start Run', () => this.startRun());
    this.metaButton = this.createMenuButton(726, 82, 'Meta', () => this.scene.start('MetaScene'));

    this.add
      .text(centerX, 168, 'Pick a Hero to play.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 960 },
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(centerX, GAME_HEIGHT - 68, 'Click a hero card to switch. Press Enter or Space to launch the selected chassis.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    const cardY = 382;
    const cardSpacing = 332;
    const cardWidth = 300;
    const cardOffsets = HERO_LIST.map((_, index) => (index - (HERO_LIST.length - 1) / 2) * cardSpacing);

    HERO_LIST.forEach((hero, index) => {
      const x = centerX + cardOffsets[index];
      const frame = this.add.rectangle(x, cardY, cardWidth, 260, 0x182233, 0.98).setStrokeStyle(2, 0x334155, 0.92);
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => this.chooseHero(hero.id));

      this.createHeroPreview(hero, x - 92, cardY - 46);

      this.add
        .text(x - 8, cardY - 86, hero.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#f8fafc',
        })
        .setOrigin(0, 0.5);

      this.add
        .text(x - 8, cardY - 54, this.getAffinityLabel(hero), {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: this.getAffinityColor(hero),
        })
        .setOrigin(0, 0.5);

      const body = this.add
        .text(x - 8, cardY - 26, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#cbd5e1',
          wordWrap: { width: 188 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);

      this.heroFrames.push(frame);
      this.heroBodies.push(body);
    });

    this.statusText = this.add
      .text(centerX, GAME_HEIGHT - 40, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
        align: 'center',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-M', this.handleMetaShortcut, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.refreshView();
  }

  private startRun(): void {
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    if (this.scene.isActive('RunScene')) {
      this.scene.stop('RunScene');
    }

    this.scene.start('RunScene');
    this.scene.launch('UIScene');
  }

  private chooseHero(heroId: HeroDefinition['id']): void {
    const nextSave = selectHero(this.saveData, heroId);
    if (!nextSave) {
      return;
    }

    this.saveData = nextSave;
    this.focusedHeroId = heroId;
    this.refreshView();
  }

  private refreshView(): void {
    HERO_LIST.forEach((hero, index) => {
      const selected = this.saveData.selectedHero === hero.id;
      this.heroFrames[index].setStrokeStyle(3, selected ? 0xfde68a : hero.appearance.strokeColor, selected ? 1 : 0.9);
      this.heroFrames[index].setFillStyle(selected ? 0x1b2a3e : 0x182233, 0.98);
      const primary = getAbilityDefinition(hero.primaryAbilityId);
      const signature = getAbilityDefinition(hero.signatureAbilityId);
      this.heroBodies[index].setText(
        `${hero.description}\n\nPrimary  ${primary.name}\nSignature  ${signature.name}\n\n${hero.passiveLabel}\n\n${hero.chassisRule}${
          selected ? '\n\nReady for the next run.' : ''
        }`,
      );
    });

    const selectedHero = HERO_LIST.find((hero) => hero.id === this.saveData.selectedHero);
    this.startButton.setText(`Start Run`);
    this.statusText.setText(
      `${selectedHero?.name ?? 'Hero'} selected • ${this.getAffinityLabel(selectedHero ?? HERO_LIST[0])} • Enter / Space to launch`,
    );
  }

  private createHeroPreview(hero: HeroDefinition, x: number, y: number): void {
    const { appearance } = hero;
    this.add.circle(x, y, appearance.size * 0.92, appearance.auraColor, 0.18).setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(x, y, appearance.size, appearance.size, appearance.bodyColor).setAngle(appearance.angle).setStrokeStyle(
      3,
      appearance.strokeColor,
      0.95,
    );
    if (appearance.markerShape === 'dot') {
      this.add.circle(x, y - appearance.size * 0.24, Math.max(4, appearance.size * 0.14), appearance.markerColor, 0.95);
    } else {
      this.add.rectangle(x, y - appearance.size * 0.24, appearance.size * 0.5, 7, appearance.markerColor, 0.95);
    }
  }

  private getAffinityLabel(hero: HeroDefinition): string {
    switch (hero.stateAffinity) {
      case 'guard':
        return 'Guard Chassis';
      case 'mark':
        return 'Mark Chassis';
      case 'ailment':
      default:
        return 'Ailment Chassis';
    }
  }

  private getAffinityColor(hero: HeroDefinition): string {
    switch (hero.stateAffinity) {
      case 'guard':
        return '#fdba74';
      case 'mark':
        return '#93c5fd';
      case 'ailment':
      default:
        return '#fda4af';
    }
  }

  private createMenuButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 24, right: 24, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setStyle({ color: '#ffffff', backgroundColor: '#374151' }));
    button.on('pointerout', () => button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' }));
    button.on('pointerdown', onClick);
    return button;
  }

  private handleStartShortcut(): void {
    this.startButton.emit('pointerdown');
  }

  private handleMetaShortcut(): void {
    this.metaButton.emit('pointerdown');
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-M', this.handleMetaShortcut, this);
  }
}
