#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import dotenv from 'dotenv'
import { program, Command, Option } from 'commander'
import puppet from './puppet'
import { PSCredentials } from './PSCredentials'

const info = chalk.grey
const error = chalk.redBright
const success = chalk.greenBright.bold;

program
    .version(process.env.npm_package_version || "")
    .description(process.env.npm_package_description || "")
    .arguments('<subject> <catalogNumber>')
    .requiredOption('--cred <string>', 'Location of .env file with credentials', '.env')
    .option('--puppet <string>', 'JSON of puppeteer.launch() configuration', '{}')
    .action(async (subject, catalogNumber, command: Command) => {
        console.log(subject)
        console.log(catalogNumber)
        const config: unknown = dotenv.parse(
            fs.readFileSync(
                path.resolve(command.cred!)
            )
        )

        console.log(program.puppet!)

        let result = await puppet(subject, catalogNumber, config as PSCredentials, JSON.parse(command.puppet!))
        console.log(result)
    })
    .parse(process.argv);

