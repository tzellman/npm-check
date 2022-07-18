'use strict';

const chalk = require('chalk');
const execa = require('execa');
const ora = require('ora');

async function install(packages, currentState) {
    if (!packages.length) {
        return Promise.resolve(currentState);
    }

    const installer = currentState.get('installer');
    const isYarn = installer === 'yarn';
    const isLerna = /lerna/i.test(installer);

    const saveExact = currentState.get('saveExact') ? (isYarn || isLerna ? '--exact' : '--save-exact') : null;
    const lockFile = !currentState.get('lockFile') ? (isYarn ? '--no-lockfile' : isLerna ? '--no-bootstrap' : '--no-package-lock') : null;

    const installCmd = isYarn || isLerna ? 'add' : 'install';

    const installs = [];
    if (isLerna) {
        const cwdPackageJson = currentState.get('cwdPackageJson');
        const extraFlags = packages.filter(p => /^--/.test(p));
        for (const p of packages.filter(p => !/^--/.test(p))) {
            installs.push([installCmd]
                .concat(p)
                .concat(saveExact)
                .concat(...extraFlags)
                .concat(`--scope=${cwdPackageJson.name}`)
                .concat(lockFile)
                .filter(Boolean))
        }

    } else {
        const color = chalk.supportsColor ? '--color=always' : null;
        const installGlobal = currentState.get('global') ? (isYarn ? 'global' : '--global') : null;
        installs.push([installCmd]
            .concat(installGlobal)
            .concat(saveExact)
            .concat(lockFile)
            .concat(packages)
            .concat(color)
            .filter(Boolean))
    }

    for (const npmArgs of installs) {
        console.log('');
        console.log(`$ ${chalk.green(installer)} ${chalk.green(npmArgs.join(' '))}`);
        const spinner = ora(`Installing using ${chalk.green(installer)}...`);
        spinner.enabled = spinner.enabled && currentState.get('spinner');
        spinner.start();

        try {
            const output = await execa(installer, npmArgs, {cwd: currentState.get('cwd')});
            console.log(output.stdout);
            console.log(output.stderr);
        } finally {
            spinner.stop();
        }
    }
    return currentState;
}

module.exports = install;
