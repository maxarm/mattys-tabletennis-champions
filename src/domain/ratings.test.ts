import { expect, test } from 'vitest'
import { overall, rarity, rollRatings } from './ratings'

const bands = [[1,49,1],[50,69,8],[70,84,66],[85,89,13],[90,94,8],[95,97,3],[98,99,0.8],[100,100,0.2]] as const

test('each weighted interval includes both integer endpoints', () => {
  let start = 0
  for (const [min,max,weight] of bands) {
    for (const [position,inside,want] of [[start + weight / 2,0,min],[start + weight / 2,0.999999,max]]) {
      let call = 0
      expect(rollRatings(1, () => call++ % 2 === 0 ? position! / 100 : inside!).ANG).toBe(want)
    }
    start += weight
  }
})
test.each([[84,'common'],[85,'legendary'],[89,'legendary'],[90,'epic'],[94,'epic'],[95,'mythic'],[100,'mythic']] as const)('rarity %i', (value,want) => expect(rarity(value)).toBe(want))
test('rounds arithmetic mean', () => expect(overall({ANG:85,VER:89,SVC:90,VOR:94,RUC:95})).toBe(91))
test('analytic distribution has correct China tails and strict expected hierarchy', () => {
  // Exact interval integration on a 1/10000 grid: all factor-2 boundaries align.
  const values = Array.from({length:10000}, (_,i) => {
    let call = 0
    return rollRatings(2, () => call++ % 2 === 0 ? (i + 0.5)/10000 : 0.5).ANG
  })
  expect(values.filter(v => v >= 90)).toHaveLength(1920)
  expect(values.filter(v => v >= 95)).toHaveLength(640)
  const means = [1,1.15,1.3,1.45,1.6,1.8,2].map(factor => {
    let start = 0
    return bands.reduce((sum,[min,max,weight]) => {
      const adjusted = weight * (min >= 85 ? factor : 1)
      const point = (start + adjusted/2)/(75+25*factor)
      start += adjusted
      let call = 0
      return sum + rollRatings(factor, () => call++ % 2 === 0 ? point : 0).ANG * adjusted/(75+25*factor) + (max-min)/2 * adjusted/(75+25*factor)
    },0)
  })
  means.slice(1).forEach((mean,i) => expect(mean).toBeGreaterThan(means[i]!))
})
test('draws all five attributes independently', () => {
  const sequence = [0,0,0.02,0,0.5,0,0.8,0,0.99,0]
  expect(rollRatings(1,() => sequence.shift()!)).toEqual({ANG:1,VER:50,SVC:70,VOR:85,RUC:98})
})
test.each([[0,1],[0.01,50],[0.09,70],[0.75,85],[0.88,90],[0.96,95],[0.99,98],[0.998,100]])('exact cumulative boundary %s', (value,want) => {
  let call = 0
  expect(rollRatings(1,() => call++ % 2 === 0 ? value : 0).ANG).toBe(want)
})
