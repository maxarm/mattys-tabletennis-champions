import type { Round } from '../../domain/types';
export const stageNames: Record<Round['stage'], string> = { roundOf16: 'Achtelfinale', quarterfinal: 'Viertelfinale', semifinal: 'Halbfinale', final: 'Finale', medal: 'Finalrunde' };
