import type { GenerationContext, RandomSource } from '../src/domain/types'

export function context(random: RandomSource = () => 0.5): GenerationContext {
  let id = 0
  return { random, newId: () => `id-${++id}`, now: () => '2026-11-07T12:00:00Z' }
}
