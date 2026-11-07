export function StatusMessage({ message, error = false }: {
    message: string;
    error?: boolean;
}) {
    return <p className={`status-message${error ? ' error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>;
}
