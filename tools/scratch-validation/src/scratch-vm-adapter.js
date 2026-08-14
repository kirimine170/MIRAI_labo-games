'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PINNED_VM_VERSION = '15.0.1';

const entryPath = require.resolve('@scratch/scratch-vm');
const packageRoot = path.resolve(entryPath, '../../..');
const packageMetadata = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
);

if (packageMetadata.version !== PINNED_VM_VERSION) {
    throw new Error(
        `scratch-vm adapter requires ${PINNED_VM_VERSION}; found ${packageMetadata.version}`
    );
}

// 15.0.1's published Node bundle references a CSS file omitted from its npm
// package. Loading the published source entry is isolated here and guarded by
// the exact package version so an upstream layout/API change fails loudly.
const scratchLog = require(path.join(packageRoot, 'src/util/log.js'));
scratchLog.settings.minLevel = 7;
const VirtualMachine = require(path.join(packageRoot, 'src/virtual-machine.js'));
const {ScratchStorage} = require('@scratch/scratch-storage');

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class ScratchVmAdapter {
    constructor (archivePath, inputSpriteName, observeSpriteName = inputSpriteName) {
        this.archivePath = archivePath;
        this.inputSpriteName = inputSpriteName;
        this.observeSpriteName = observeSpriteName;
        this.vm = new VirtualMachine();
        this.vm.attachStorage(new ScratchStorage());
    }

    async load () {
        await this.vm.loadProject(fs.readFileSync(this.archivePath));
        this.vm.setTurboMode(false);
        this.vm.start();
    }

    greenFlag () {
        this.vm.greenFlag();
    }

    setStageVariable (name, value) {
        const stage = this.vm.runtime.getTargetForStage();
        const variable = Object.values(stage.variables).find(candidate => candidate.name === name);
        if (!variable) {
            throw new Error(`Stage variable does not exist: ${name}`);
        }
        variable.value = value;
    }

    async clickSprite (count = 1, delayMilliseconds = 90, spriteName = this.inputSpriteName) {
        const target = this.vm.runtime.getSpriteTargetByName(spriteName);
        if (!target) {
            throw new Error(`sprite does not exist: ${spriteName}`);
        }
        for (let index = 0; index < count; index += 1) {
            // scratch-vm 15.0.1 has no public headless sprite-click API and no
            // renderer is attached. Keep the sole internal input call here.
            const threads = this.vm.runtime.startHats(
                'event_whenthisspriteclicked',
                null,
                target
            );
            if (!Array.isArray(threads)) {
                throw new Error('scratch-vm click adapter did not return threads');
            }
            await sleep(delayMilliseconds);
        }
    }

    snapshot () {
        const stage = this.vm.runtime.getTargetForStage();
        const sprite = this.vm.runtime.getSpriteTargetByName(this.observeSpriteName);
        if (!stage || !sprite) {
            throw new Error(`cannot observe Stage or sprite ${this.observeSpriteName}`);
        }
        const variables = Object.fromEntries(
            Object.values(stage.variables).map(variable => [variable.name, variable.value])
        );
        const costume = sprite.sprite.costumes[sprite.currentCostume];
        return {
            ...variables,
            costume: costume ? costume.name : null,
            visible: sprite.visible,
            x: sprite.x,
            y: sprite.y
        };
    }

    close () {
        this.vm.stopAll();
        this.vm.quit();
    }
}

module.exports = {
    PINNED_VM_VERSION,
    ScratchVmAdapter,
    sleep
};
