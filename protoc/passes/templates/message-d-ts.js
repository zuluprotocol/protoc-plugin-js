import join from '../../../utils/join.js'
import assert from 'nanoassert'
import { importTypes } from '../helpers.js'
import { relative } from 'path'
import rfdc from 'rfdc'

const clone = rfdc()

export default function ({ path, message, encodeFile, decodeFile, nestedEnums, nestedMessages }) {
  message = clone(message)
  uniqueify(message)

  return join`
    /// autogenerated by protoc-plugin-js
    ${importTypes(path, message)}

    export * from './${relative(path, encodeFile.path)}'
    export * from './${relative(path, decodeFile.path)}'
    ${nestedEnums.map(n =>
      `export * as ${n.identifier} from './${relative(path, n.path)}'`
    )}

    ${nestedMessages.map(n =>
      `export * as ${n.identifier} from './${relative(path, n.path)}'`
    )}

    export type ${message.name} = {
      ${typeFields(message)}
    }
  `
}

function typeFields (message) {
  const fieldGroups = group(message)

  const res = []
  for (const [name, field] of fieldGroups) {
    if (field.oneof === true) {
      res.push(kv(field.name, field.fields.map(f => br(kv(f.name, fieldType(f)))).concat('null').join('|')))
    } else {
      res.push(kv(field.name, fieldType(field)))
    }
  }

  return res.join(';')
  // return res

  function br (v) {
    return '{' + v + '}'
  }

  function kv (name, type) {
    return name + ': ' + type
  }
}

function group (msg) {
  const fields = new Map()

  for (const field of msg.fields) {
    if (field.oneofName != null) {
      const off = fields.get(field.oneofName) ?? { name: field.oneofName, oneof: true, fields: [] }
      off.fields.push(field)
      fields.set(off.name, off)
    } else {
      fields.set(field.name, field)
    }
  }

  return fields
}

function fieldType (f) {
  let primitiveType = f.messageTypeLocal ?? f.messageType ?? tsType(f.type)
  if (f.repeated) primitiveType += '[]'

  if (f.optional) primitiveType += '| null'
  return primitiveType
}

function tsType (t) {
  switch (t) {
    case 'bool': return 'boolean'
    case 'enumerable': return 'number'
    case 'uint32': return 'number'
    case 'int32': return 'number'
    case 'sint32': return 'number'
    case 'uint64': return 'bigint'
    case 'int64': return 'bigint'
    case 'sint64': return 'bigint'

    case 'sfixed64': return 'bigint'
    case 'fixed64': return 'bigint'
    case 'double': return 'number'

    case 'sfixed32': return 'number'
    case 'fixed32': return 'number'
    case 'float': return 'number'

    case 'string': return 'string'
    case 'bytes': return 'Uint8Array'

    case 'message':
    default:
      assert(false, 'Unreachable: Missing protoc field type to TS type')
  }
}

function uniqueify (message) {
  const usedNames = new Map([
    [message.name, message.fullName]
  ])

  for (const field of message.fields) {
    // primitive type
    if (field.typeName == null) continue
    // self
    if (field.typeName === message.fullName) continue

    let candidateName = field.messageType
    const parts = field.typeName.split('.').slice(0, -1)
    while (usedNames.has(candidateName) && usedNames.get(candidateName) !== field.typeName) {
      candidateName = parts.pop() + '_' + candidateName
    }
    usedNames.set(candidateName, field.typeName)
    if (candidateName !== field.messageType) {
      field.messageTypeLocal = candidateName
    }
  }
}
