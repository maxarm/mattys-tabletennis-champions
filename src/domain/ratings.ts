import type { RandomSource, Ratings } from './types'

const bands = [[1,49,1],[50,69,8],[70,84,66],[85,89,13],[90,94,8],[95,97,3],[98,99,0.8],[100,100,0.2]] as const

export function rollRatings(factor: number, random: RandomSource): Ratings {
  const roll = () => {
    const target = random() * (75 + 25 * factor)
    let cumulative = 0
    for (const [min,max,weight] of bands) {
      cumulative += weight * (min >= 85 ? factor : 1)
      if (target < cumulative) return min + Math.floor(random() * (max-min+1))
    }
    throw new RangeError('Zufallsquelle außerhalb [0, 1).')
  }
  return { ANG: roll(), VER: roll(), SVC: roll(), VOR: roll(), RUC: roll() }
}
export function overall(ratings: Ratings): number {
  return Math.round((ratings.ANG + ratings.VER + ratings.SVC + ratings.VOR + ratings.RUC) / 5)
}
export function rarity(value: number): 'common' | 'legendary' | 'epic' | 'mythic' {
  return value >= 95 ? 'mythic' : value >= 90 ? 'epic' : value >= 85 ? 'legendary' : 'common'
}
