import join from '../../../utils/join.js'
import { relative } from 'path'

export default function ({ path, message, encodeFile, decodeFile, nestedEnums, nestedMessages }) {
  return join`
    export * from './${relative(path, encodeFile.path)}'
    export * from './${relative(path, decodeFile.path)}'
    ${nestedEnums.map(n =>
      `export * as ${n.identifier} from '${relative(path, n.path)}'`
    )}

    ${nestedMessages.map(n =>
      `export * as ${n.identifier} from '${relative(path, n.path)}'`
    )}
  `
}