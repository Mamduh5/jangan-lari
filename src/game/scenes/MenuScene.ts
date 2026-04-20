import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
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
      .text(100, 84, 'Milestone 1: Guard vs Mark.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#9fb8d3',
      })
      .setOrigin(0, 0.5);

    this.startButton = this.createMenuButton(560, 82, 'Start Run', () => this.startRun());
    this.metaButton = this.createMenuButton(726, 82, 'Meta', () => this.scene.start('MetaScene'));

    this.add
      .text(centerX, 168, 'Pick a chassis. Iron Warden should feel durable and close. Raptor Frame should feel surgical and target-driven.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 960 },
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    const cardY = 382;
    const cardOffsets = [-220, 220];

    HERO_LIST.forEach((hero, index) => {
      const x = centerX + cardOffsets[index];
      const frame = this.add.rectangle(x, cardY, 360, 260, 0x182233, 0.98).setStrokeStyle(2, 0x334155, 0.92);
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => this.chooseHero(hero.id));

      this.createHeroPreview(hero, x - 108, cardY - 46);

      this.add
        .text(x - 28, cardY - 86, hero.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '28px',
          color: '#f8fafc',
        })
        .setOrigin(0, 0.5);

      this.add
        .text(x - 28, cardY - 54, hero.stateAffinity === 'guard' ? 'Guard Chassis' : 'Mark Chassis', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: hero.stateAffinity === 'guard' ? '#fdba74' : '#93c5fd',
        })
        .setOrigin(0, 0.5);

      const body = this.add
        .text(x - 28, cardY - 26, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          wordWrap: { width: 216 },
          lineSpacing: 5,
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
      this.heroBodies[index].setText(
        `${hero.description}\n\nPrimary  ${hero.primaryAbilityId}\nSignature  ${hero.signatureAbilityId}\n\n${hero.chassisRule}${
          selected ? '\n\nSelected for next run.' : ''
        }`,
      );
    });

    this.statusText.setText(`${HERO_LIST.find((hero) => hero.id === this.saveData.selectedHero)?.name ?? 'Hero'} selected.`);
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
