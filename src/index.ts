#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import puppet from './puppet'
import { info, error, success } from './prettyPrint'
import { program, Command, Option } from 'commander'
import { PSCredentials } from './PSCredentials'

program
    .version(process.env.npm_package_version || "")
    .description(process.env.npm_package_description || "")
    .arguments('<subject> <catalogNumber> <semesterCode>') // COSC 3360 2130
    .requiredOption('--cred <string>', 'Location of .env file with credentials', '.env')
    .option('--puppet <string>', 'Location of .json file with puppeteer.launch() configuration', 'config.json')
    .option('--out <string>', 'When specified, the output will be written to JSON files in the specified directory', '<none>')
    .action(async (subject, catalogNumber, semesterCode, command: Command) => {
        console.log(subject)
        console.log(catalogNumber)
        console.log(semesterCode)
        const cred: unknown = dotenv.parse(
            fs.readFileSync(
                path.resolve(command.cred!)
            )
        )

        const config: unknown = program.puppet! === '' ? {} : JSON.parse(
            fs.readFileSync(
                path.resolve(command.puppet!)
            ).toString()
        )

        console.log(config)

        let result = await puppet(subject, catalogNumber, semesterCode, cred as PSCredentials, config as any)

        if(program.out! !== '<none>') {
            for(let item of result) {
                info(`Writing files for ${item.sectionIdentifier}`)
                fs.writeFileSync(path.join(program.out!, `${item.subject}${item.catalogNumber}-${item.sectionIdentifier}.json`), JSON.stringify(item, undefined, 1))
                fs.writeFileSync(path.join(program.out!, `${item.subject}${item.catalogNumber}-${item.sectionIdentifier}.ics`), item.calendarFile)
            }
            success('Done!')
        }
        else {
            console.log(result)
        }
    })
    .parse(process.argv);

