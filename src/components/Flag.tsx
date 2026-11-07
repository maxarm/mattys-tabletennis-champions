export function Flag({ countryName, src }: {
    countryName: string;
    src: string;
}) {
    return <img className="flag" src={src} alt={`Flagge ${countryName}`} width="32" height="22"/>;
}
