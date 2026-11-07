/** Serializable, fixed ingredients for the later local SVG portrait renderer. */
export interface PortraitDefinition {
  readonly face: 'round' | 'oval' | 'square'
  readonly skin: string
  readonly hair: 'crop' | 'curls' | 'swept' | 'bald'
  readonly hairColor: string
  readonly accessory: 'none' | 'glasses' | 'headband'
  readonly shirtColor: string
}
