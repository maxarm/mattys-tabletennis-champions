import type { DraftEvaluation, DraftSet, SetScore, WinsRequired } from './types'

export function validateSet([a,b]: SetScore): boolean {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0) return false
  const high = Math.max(a,b), low = Math.min(a,b)
  return high === 11 ? low <= 9 : high > 11 && high-low === 2
}

export function evaluateDraft(draft: readonly DraftSet[], wins: WinsRequired): DraftEvaluation {
  const sets: SetScore[] = []
  const setWins: [number,number] = [0,0]
  const errors: {row:number;message:string}[] = []
  let incomplete = draft.length === 0
  for (const [row, [a,b]] of draft.entries()) {
    const texts = [a,b]
    if (texts.some(text => text !== '' && (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))))) {
      errors.push({row,message:'Bitte nicht negative, sicher darstellbare ganze Zahlen eingeben.'})
      continue
    }
    if (a === '' || b === '') { incomplete = true; continue }
    const score: SetScore = [Number(a),Number(b)]
    if (!validateSet(score)) { errors.push({row,message:'Ungültiger Satzstand.'}); continue }
    sets.push(score)
    const side = score[0] > score[1] ? 0 : 1
    setWins[side]++
    if (setWins[side] === wins && !incomplete && errors.length === 0) {
      return {status:'complete',sets,setWins,winnerSide:side}
    }
  }
  return errors.length ? {status:'invalid',errors} : {status:'incomplete'}
}
