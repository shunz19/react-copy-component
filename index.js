#!/usr/bin/env node
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import precinct from 'precinct';

const currentPath = process.cwd();

const installAll = process.argv.includes('--install-all');
const dryRun = process.argv.includes('--dry-run');

const firstArgument = process.argv.filter(_ => !_.startsWith('-'))[2];
const secondArgument = process.argv.filter(_ => !_.startsWith('-'))[3];

const firstPath = path.resolve(currentPath, firstArgument).replace(/\\/g, '/');
const firstPathDir = path.dirname(firstPath).replace(/\\/g, '/');
const secondPath = (secondArgument ? path.resolve(currentPath, secondArgument) : currentPath).replace(/\\/g, '/');

function findRoot(path) {
    const paths = path.split('/');
    for (let i = paths.length; i >= 0; i--) {
        const currentPath = paths.slice(0, i).join('/') + '/';
        if (fs.existsSync(currentPath + 'package.json')) {
            return currentPath;
        }
    }
}

const firstProjectRoot = findRoot(firstPathDir);

if (!firstProjectRoot) {
    console.log("Could not find root of first project");
    process.exit(1);
}

const secondProjectRoot = findRoot(secondPath);

if (!secondProjectRoot && installAll) {
    console.log("Could not find root of second project");
    process.exit(1);
}

const firstPackageJSON = JSON.parse(fs.readFileSync(path.resolve(firstProjectRoot, 'package.json'), 'utf8'));
const secondPackageJSON = installAll ? JSON.parse(fs.readFileSync(path.resolve(secondProjectRoot, 'package.json'), 'utf8')) : {};

const fileExtensions = ['.js', '.jsx', '.json', '.ts', '.tsx']
fileExtensions.push(...fileExtensions.map(_ => "/index" + _));

function recurseFindImports(pathFile, relativeImports = [], packageImports = [], recursed = false) {

    let filePath = pathFile;
    let extensionsIndex = 0;

    while (!(fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) && extensionsIndex < fileExtensions.length) {
        filePath = pathFile + fileExtensions[extensionsIndex];
        extensionsIndex++;
    }

    if (!fs.existsSync(filePath)) {
        console.log('file not found', filePath);
        return;
    }

    const imports = precinct.paperwork(filePath);
    relativeImports.push(filePath);

    imports.forEach(_ => {
        if (_.startsWith('.')) {
            recurseFindImports(path.resolve(path.dirname(filePath), _).replace(/\\/g, '/'), relativeImports, packageImports, true);
        } else {
            packageImports.push(_);
        }
    });

    if (!recursed) return {
        relativeImports: relativeImports.filter((_, i) => relativeImports.indexOf(_) === i),
        packageImports: packageImports.map(_ => _.split('/').slice(0, 2).join('/')).filter((_, i) => packageImports.indexOf(_) === i)
    };
}

const imports = recurseFindImports(firstPath);

imports.relativeImports.forEach(_ => {

    const fileDestination = path.resolve(secondPath, _.replace(firstProjectRoot, '')).replace(/\\/g, '/');
    console.log("Copying", _, "to", fileDestination);

    if (fs.existsSync(fileDestination)) {
        console.log("File already exists", fileDestination);
        return;
    }

    if (!fs.existsSync(path.dirname(fileDestination))) {
        if (!dryRun) fs.mkdirSync(path.dirname(fileDestination), { recursive: true });
    }

    if (!dryRun) fs.copyFileSync(_, fileDestination);
});


const required = imports.packageImports

// remove conflicting packages
Object.keys(secondPackageJSON.dependencies).forEach(_ => {
    if (required.includes(_)) {
        required.splice(required.indexOf(_), 1);
    }
});

console.log("Required Packages:", required);
if (installAll && required.length > 0) {

    const command = `npm install ${required.join(' ')}`;
    console.log("Running", command);
    if (!dryRun) {
        child_process.execSync(command, { cwd: secondProjectRoot, stdio: 'inherit' });
    }
}