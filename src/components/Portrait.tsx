import type { PortraitDefinition } from '../domain/types';
export function Portrait({ definition: d }: {
    definition: PortraitDefinition;
}) {
    return <svg className="portrait" viewBox="0 0 120 132" aria-hidden="true">
    <path fill={d.shirtColor} d="M8 132q0-37 38-40h28q38 3 38 40"/><path d="m44 94 16 14 16-14" fill="none" stroke="#fff5df" strokeWidth="4"/>
    <path fill={d.skin} d="M50 80h20v20q-10 13-20 0z"/><ellipse cx="27" cy="61" rx="8" ry="11" fill={d.skin}/><ellipse cx="93" cy="61" rx="8" ry="11" fill={d.skin}/>
    <rect x="28" y="17" width="64" height={d.face === 'oval' ? '80' : '74'} rx={d.face === 'square' ? '19' : '34'} fill={d.skin} stroke="#342b2420" strokeWidth="2"/>
    {d.hair === 'crop' && <path fill={d.hairColor} d="M27 48V29Q30 4 61 9q35 0 33 35L79 29 39 32z"/>}
    {d.hair === 'swept' && <path fill={d.hairColor} d="M26 51Q15 10 60 8q25-9 38 19L43 40l-8-9z"/>}
    {d.hair === 'curls' && <g fill={d.hairColor}>{[30, 42, 55, 69, 82, 91].map((x, i) => <circle key={x} cx={x} cy={i === 0 || i === 5 ? 30 : 20} r="13"/>)}</g>}
    {d.hair === 'bald' && <path d="M33 34q-9 12-5 24m59-24q9 12 5 24" stroke={d.hairColor} strokeWidth="5" fill="none"/>}
    <path d="m39 49 12-2m18 0 12 3" stroke={d.hairColor} strokeWidth="3" strokeLinecap="round"/><g fill="#2c2b26"><ellipse cx="46" cy="57" rx="3" ry="4"/><ellipse cx="75" cy="57" rx="3" ry="4"/></g>
    <path d="m60 59-3 12h7" fill="none" stroke="#633b3b" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round"/><path d="M47 79q13 13 27-1" fill="#fff9e8" stroke="#573b31" strokeWidth="2" strokeLinejoin="round"/>
    {d.accessory === 'glasses' && <g fill="none" stroke="#273e38" strokeWidth="3"><rect x="33" y="49" width="24" height="19" rx="7"/><rect x="64" y="49" width="24" height="19" rx="7"/><path d="M57 55h7"/></g>}
    {d.accessory === 'headband' && <path d="M28 39q32-8 64 0" stroke="#f7efdb" strokeWidth="9" fill="none"/>}
  </svg>;
}
