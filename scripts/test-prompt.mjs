import { parseNumberedTranslations } from '../src/shared/prompt.ts'
import assert from 'node:assert/strict'

const numbered = parseNumberedTranslations('1. 你好\n2. 世界', 2)
assert.deepEqual(numbered, ['你好', '世界'])

const dotted = parseNumberedTranslations('1、第一段\n2、第二段', 2)
assert.deepEqual(dotted, ['第一段', '第二段'])

const single = parseNumberedTranslations('只是一句译文', 1)
assert.deepEqual(single, ['只是一句译文'])

const missing = parseNumberedTranslations('1. 仅有第一条', 2)
assert.equal(missing[0], '仅有第一条')
assert.equal(missing[1], '')

console.log('prompt parser tests passed')
