import fs from 'fs'
import path from 'path'

export function findFile(filename, dirname) {
    if (!dirname)
        dirname = process.cwd()


    if (fs.existsSync(path.join(dirname, filename)))
        return path.join(dirname, filename)

    if (dirname !== '/')
        return findFile(filename, path.resolve(dirname, '..'))
    else
        return null
}
