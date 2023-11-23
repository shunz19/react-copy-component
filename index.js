#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import precinct from 'precinct';

const currentPath = process.cwd();

console.log(process.cwd());

const installAll = process.argv.includes('--install-all');

const firstArgument = process.argv[2];
const secondArgument = process.argv[3];

const firstPath = path.resolve(currentPath, firstArgument).replace(/\\/g, '/');
const firstPathDir = path.dirname(firstPath).replace(/\\/g, '/');
const secondPath = (secondArgument ? path.resolve(currentPath, secondArgument) : currentPath).replace(/\\/g, '/');

let firstProjectRoot;

const firstPaths = firstPathDir.split('/');

for (let i = firstPaths.length - 1; i >= 0; i--) {
    firstProjectRoot = firstPaths.slice(0, i).join('/') + '/';
    if (fs.existsSync(firstProjectRoot + 'package.json')) {
        break;
    }

    if (i == 0) {
        firstProjectRoot = currentPath;
    }
}

const packageJson = JSON.parse(fs.readFileSync(firstProjectRoot + 'package.json', 'utf8'));

// const packageImports = findImports(firstPath, {
//     absoluteImports: false,
//     relativeImports: false,
//     packageImports: true
// });

const fileExtensions = ['.js', '.jsx', '.json', '.ts', '.tsx'];

function recurseFindImports(pathFile, relativeImports = [], packageImports = [], recursed = false) {

    let filePath = pathFile;
    let extensionsIndex = 0;

    while (!fs.existsSync(filePath) && extensionsIndex < fileExtensions.length) {
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
        packageImports: packageImports.filter((_, i) => packageImports.indexOf(_) === i)
    };
}

const imports = recurseFindImports(firstPath);

imports.relativeImports.forEach(_ => {

    const fileDestination = path.resolve(secondPath, _.replace(firstProjectRoot, '')).replace(/\\/g, '/');

    if (fs.existsSync(fileDestination)) {
        console.log("File already exists", fileDestination);
        return;
    }

    if (!fs.existsSync(path.dirname(fileDestination))) {
        fs.mkdirSync(path.dirname(fileDestination), { recursive: true });
    }

    //fs.copyFileSync(_, fileDestination);
    console.log("Copied", _, "to", fileDestination);
});

console.log("Required Packages:", imports.packageImports);