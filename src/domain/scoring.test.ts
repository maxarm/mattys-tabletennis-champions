import { expect, test } from 'vitest'
import { evaluateDraft, validateSet } from './scoring'
import type { DraftSet, WinsRequired } from './types'

test.each([[11,0],[11,9],[12,10],[15,13],[100000,99998]])('valid set %i:%i and mirror', (a,b) => {
  expect(validateSet([a,b])).toBe(true); expect(validateSet([b,a])).toBe(true)
})
test.each([[11,10],[12,8],[-1,11],[11.5,0],[NaN,11],[Infinity,0],[9007199254740992,9007199254740990]])('invalid set %i:%i', (a,b) => expect(validateSet([a,b])).toBe(false))
test.each(['-1','1.2','abc','1e1','9007199254740992'])('rejects text %s', value => expect(evaluateDraft([[value,'11']],1).status).toBe('invalid'))
test('empty strings remain incomplete', () => expect(evaluateDraft([['','11']],1).status).toBe('incomplete'))
test.each([1,2,3] as const)('ends at %i wins, truncating stale later rows', (wins: WinsRequired) => {
  for (const side of [0,1] as const) {
    const sets: DraftSet[] = Array.from({length: wins * 2 - 1}, (_,i) => (i < wins-1 ? (i % 2 ? ['0','11'] : ['11','0']) : (side ? ['0','11'] : ['11','0'])))
    const sweep: DraftSet[] = Array.from({length:wins}, () => side ? ['0','11'] : ['11','0'])
    expect(evaluateDraft([...sweep,['bad','bad']],wins)).toMatchObject({status:'complete',winnerSide:side,sets:Array.from({length:wins}, () => side ? [0,11] : [11,0])})
    expect(evaluateDraft(sets,wins).status).toBe('complete')
  }
})
